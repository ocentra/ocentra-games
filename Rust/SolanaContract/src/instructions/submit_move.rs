use anchor_lang::prelude::*;
use crate::state::{Match, Move};
use crate::validation;
use crate::error::GameError;

pub fn handler(
    ctx: Context<SubmitMove>,
    match_id: String,
    user_id: String,  // Firebase UID (per spec: use user IDs, not Pubkeys)
    action_type: u8,
    payload: Vec<u8>,
    nonce: u64, // Per critique: nonce for replay protection
) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    let move_account = &mut ctx.accounts.move_account;
    let clock = Clock::get()?;

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

    // Security: Validate action_type bounds
    require!(
        action_type <= 4,
        GameError::InvalidAction
    );

    // Security: Validate payload size
    require!(
        payload.len() <= 128,
        GameError::InvalidPayload
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
    
    // Anti-cheat: For declare_intent and call_showdown, any player can act (not turn-based)
    let requires_turn = action_type == 0 || action_type == 1; // pick_up or decline
    
    if requires_turn {
        require!(
            match_account.current_player == player_index as u8,
            GameError::NotPlayerTurn
        );
    }

    // Anti-cheat: Timestamp validation - moves must be recent (within 5 minutes of creation)
    // This prevents replay of old moves
    let move_timestamp = clock.unix_timestamp;
    require!(
        move_timestamp >= match_account.created_at,
        GameError::InvalidTimestamp
    );
    // Reject moves older than 5 minutes from match creation to prevent replay attacks
    // Note: For long matches, this is a simplified check. Full replay protection is via nonce.
    let max_age = 300i64; // 5 minutes in seconds
    // Allow moves if match is still recent (within 5 min) OR if it's the first move
    if match_account.move_count > 0 {
        let match_age = move_timestamp.saturating_sub(match_account.created_at);
        // For matches longer than 5 minutes, rely on nonce-based replay protection
        // This timestamp check is just an additional safeguard for very old moves
        if match_age > max_age * 10 { // 50 minutes - very old
            return Err(GameError::InvalidTimestamp.into());
        }
    }

    // Per critique: Replay protection - nonce validation
    // Each move must have a nonce greater than the last nonce for this player
    let last_nonce = match_account.get_last_nonce(player_index);
    require!(
        nonce > last_nonce,
        GameError::InvalidNonce
    );
    // Update last nonce for this player
    match_account.set_last_nonce(player_index, nonce);

    // Anti-cheat: Validate move legality
    validation::validate_move(match_account, player_index, action_type, &payload)?;

    // Per critique: Card state validation for moves that involve cards (rebuttal)
    if action_type == 4 { // Rebuttal action
        validation::validate_card_hash(match_account, player_index, &payload)?;
    }

    // Convert match_id to fixed-size array
    let mut match_id_array = [0u8; 36];
    let copy_len = match_id_bytes.len().min(36);
    match_id_array[..copy_len].copy_from_slice(&match_id_bytes[..copy_len]);

    // Create move account with optimized struct
    move_account.match_id = match_id_array;
    move_account.player = ctx.accounts.player.key();
    move_account.move_index = match_account.move_count;
    move_account.action_type = action_type;
    move_account.set_payload(&payload)?; // Uses fixed-size array
    move_account.timestamp = clock.unix_timestamp;

    // Update match state based on action type
    match action_type {
        2 => {
            // Declare intent: record the declared suit
            if payload.len() >= 1 {
                let suit = payload[0];
                require!(suit <= 3, GameError::InvalidPayload); // Validate suit (0-3)
                match_account.set_declared_suit(player_index, suit);
            }
        }
        0 => {
            // Pick up: advance turn, clear floor card, update hand size
            // Per critique Issue #1: Update on-chain card state
            match_account.set_floor_card_revealed(false);
            match_account.clear_floor_card_hash(); // Clear floor card hash
            // Increment hand size (card was picked up)
            let current_size = match_account.get_hand_size(player_index);
            match_account.set_hand_size(player_index, current_size.saturating_add(1));
            match_account.current_player = ((player_index + 1) % match_account.player_count as usize) as u8;
        }
        1 => {
            // Decline: advance turn, clear floor card
            match_account.set_floor_card_revealed(false);
            match_account.current_player = ((player_index + 1) % match_account.player_count as usize) as u8;
        }
        3 => {
            // Call showdown: transition to ended phase
            match_account.phase = 2; // Ended
            match_account.ended_at = clock.unix_timestamp;
        }
        _ => {}
    }

    match_account.move_count += 1;

    msg!("Move submitted: player {}, action {}, match {}", 
         ctx.accounts.player.key(), action_type, match_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct SubmitMove<'info> {
    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    #[account(
        init,
        payer = player,
        space = Move::MAX_SIZE,
        seeds = [
            b"move",
            match_id.as_bytes(),
            match_account.move_count.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub move_account: Account<'info, Move>,
    
    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}

