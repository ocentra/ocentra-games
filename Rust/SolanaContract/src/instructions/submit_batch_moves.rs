use anchor_lang::prelude::*;
use crate::state::{Match, Move};
use crate::validation;
use crate::error::GameError;

/// Move data for batch submission.
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BatchMove {
    pub action_type: u8,
    pub payload: Vec<u8>,
    pub nonce: u64,
}

/// Submits up to 5 moves in a single transaction.
/// Per spec Section 16.6: Move batching for cost optimization (73% cost reduction).
/// 
/// **IMPORTANT LIMITATIONS:**
/// - All moves must be from the same player and in the same match.
/// - For turn-based games: Only works for moves that don't require turn order (e.g., declare intent, rebuttal).
/// - Turn-based moves (pick_up, decline) can only be batched if the player has multiple consecutive turns.
/// - Use case: Primarily for queuing offline moves or non-turn-based actions (declare intent + call showdown).
/// 
/// **NOTE:** This is NOT meant to batch moves across different players or different turns in a turn-based game.
/// The spec's "50 moves = 10 transactions" example assumes games where players can make multiple actions per turn.
pub fn handler(
    ctx: Context<SubmitBatchMoves>,
    match_id: String,
    user_id: String,  // Firebase UID (per spec: use user IDs, not Pubkeys)
    moves: Vec<BatchMove>,  // Up to 5 moves
) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    let clock = Clock::get()?;
    
    // Validate batch size (up to 5 moves)
    require!(
        moves.len() > 0 && moves.len() <= 5,
        GameError::InvalidPayload
    );
    
    // Security: Validate player is signer
    require!(
        ctx.accounts.player.is_signer,
        GameError::Unauthorized
    );
    
    // Security: Validate match_id matches
    let match_id_bytes = match_id.as_bytes();
    require!(
        match_id_bytes.len() == 36 && 
        match_id_bytes == &match_account.match_id[..match_id_bytes.len().min(36)],
        GameError::InvalidPayload
    );
    
    // Security: Validate match is in playing phase
    require!(
        match_account.phase == 1,
        GameError::InvalidPhase
    );
    
    // Security: Validate match not ended
    require!(
        !match_account.is_ended(),
        GameError::MatchAlreadyEnded
    );
    
    // Security: Validate minimum players requirement
    require!(
        match_account.has_minimum_players(),
        GameError::InsufficientPlayers
    );
    
    // Convert user_id String to fixed-size array
    let user_id_bytes = user_id.as_bytes();
    require!(
        user_id_bytes.len() <= 64,
        GameError::InvalidPayload
    );
    let mut user_id_array = [0u8; 64];
    let copy_len = user_id_bytes.len().min(64);
    user_id_array[..copy_len].copy_from_slice(&user_id_bytes[..copy_len]);
    
    // Security: Validate player is in match (find by user_id)
    let player_index = match_account.find_player_index(&user_id_array)
        .ok_or(GameError::PlayerNotInMatch)?;
    
    // Process each move in the batch
    let mut current_move_index = match_account.move_count;
    let mut current_player_index = player_index;
    
    // Convert match_id to fixed array
    let mut match_id_array = [0u8; 36];
    let copy_len = match_id_bytes.len().min(36);
    match_id_array[..copy_len].copy_from_slice(&match_id_bytes[..copy_len]);
    
    for (batch_idx, batch_move) in moves.iter().enumerate() {
        require!(
            batch_idx < 5,
            GameError::InvalidPayload
        );
        // Get move account by index (avoid moving out of array)
        let move_account = match batch_idx {
            0 => &mut ctx.accounts.move_account_0,
            1 => &mut ctx.accounts.move_account_1,
            2 => &mut ctx.accounts.move_account_2,
            3 => &mut ctx.accounts.move_account_3,
            4 => &mut ctx.accounts.move_account_4,
            _ => return Err(GameError::InvalidPayload.into()),
        };
        // Security: Validate action_type bounds
        require!(
            batch_move.action_type <= 4,
            GameError::InvalidAction
        );
        
        // Security: Validate payload size
        require!(
            batch_move.payload.len() <= 128,
            GameError::InvalidPayload
        );
        
        // Security: Validate nonce (must be greater than last nonce)
        let last_nonce = match_account.get_last_nonce(current_player_index);
        require!(
            batch_move.nonce > last_nonce,
            GameError::InvalidNonce
        );
        
        // Update last nonce for this player
        match_account.set_last_nonce(current_player_index, batch_move.nonce);
        
        // Validate move legality (game-specific validation)
        validation::validate_move(match_account, current_player_index, batch_move.action_type, &batch_move.payload)?;
        
        // Per critique: Card state validation for moves that involve cards (rebuttal)
        if batch_move.action_type == 4 { // Rebuttal action
            validation::validate_card_hash(match_account, current_player_index, &batch_move.payload)?;
        }
        
        // Create move account
        move_account.match_id = match_id_array;
        move_account.player = ctx.accounts.player.key();
        move_account.move_index = current_move_index;
        move_account.action_type = batch_move.action_type;
        move_account.set_payload(&batch_move.payload)?;
        move_account.timestamp = clock.unix_timestamp;
        
        // Update match state based on action type (same logic as submit_move)
        match batch_move.action_type {
            2 => {
                // Declare intent: record the declared suit
                if batch_move.payload.len() >= 1 {
                    let suit = batch_move.payload[0];
                    require!(suit <= 3, GameError::InvalidPayload);
                    match_account.set_declared_suit(current_player_index, suit);
                }
            }
            0 => {
                // Pick up: advance turn, clear floor card, update hand size
                match_account.set_floor_card_revealed(false);
                match_account.clear_floor_card_hash();
                let current_size = match_account.get_hand_size(current_player_index);
                match_account.set_hand_size(current_player_index, current_size.saturating_add(1));
            }
            1 => {
                // Decline: advance turn, clear floor card
                match_account.set_floor_card_revealed(false);
            }
            3 => {
                // Call showdown: transition to ended phase
                match_account.phase = 2; // Ended
                match_account.ended_at = clock.unix_timestamp;
            }
            _ => {}
        }
        
        // For turn-based moves, validate turn order
        // NOTE: In a turn-based game, a player typically only has ONE turn at a time.
        // Batching turn-based moves only works if:
        // 1. The player has multiple consecutive turns (rare, game-specific)
        // 2. The game allows multiple actions per turn (e.g., pick up + play card)
        let requires_turn = batch_move.action_type == 0 || batch_move.action_type == 1; // pick_up or decline
        if requires_turn {
            require!(
                match_account.current_player == current_player_index as u8,
                GameError::NotPlayerTurn
            );
            
            // Advance to next player after turn-based move
            // WARNING: This assumes the player has multiple consecutive turns, which is rare in turn-based games.
            // Most turn-based games will fail here if batching multiple turn-based moves.
            let max_players = match_account.get_max_players() as usize;
            current_player_index = (current_player_index + 1) % max_players;
        }
        
        // Advance move index for next iteration
        current_move_index += 1;
    }
    
    // Update match state after all moves processed
    match_account.move_count = current_move_index;
    match_account.current_player = current_player_index as u8;
    
    msg!("Batch moves submitted: match_id={}, count={}", match_id, moves.len());
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct SubmitBatchMoves<'info> {
    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    // Fixed array of up to 5 Move accounts (only initialize the ones we need)
    // Using init_if_needed to avoid errors if fewer than 5 moves
    #[account(
        init_if_needed,
        payer = player,
        space = Move::MAX_SIZE,
        seeds = [
            b"move",
            match_id.as_bytes(),
            match_account.move_count.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub move_account_0: Account<'info, Move>,
    
    #[account(
        init_if_needed,
        payer = player,
        space = Move::MAX_SIZE,
        seeds = [
            b"move",
            match_id.as_bytes(),
            (match_account.move_count + 1).to_le_bytes().as_ref()
        ],
        bump
    )]
    pub move_account_1: Account<'info, Move>,
    
    #[account(
        init_if_needed,
        payer = player,
        space = Move::MAX_SIZE,
        seeds = [
            b"move",
            match_id.as_bytes(),
            (match_account.move_count + 2).to_le_bytes().as_ref()
        ],
        bump
    )]
    pub move_account_2: Account<'info, Move>,
    
    #[account(
        init_if_needed,
        payer = player,
        space = Move::MAX_SIZE,
        seeds = [
            b"move",
            match_id.as_bytes(),
            (match_account.move_count + 3).to_le_bytes().as_ref()
        ],
        bump
    )]
    pub move_account_3: Account<'info, Move>,
    
    #[account(
        init_if_needed,
        payer = player,
        space = Move::MAX_SIZE,
        seeds = [
            b"move",
            match_id.as_bytes(),
            (match_account.move_count + 4).to_le_bytes().as_ref()
        ],
        bump
    )]
    pub move_account_4: Account<'info, Move>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

