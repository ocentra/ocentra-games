use anchor_lang::prelude::*;
use crate::state::{Match, GameType};
use crate::error::GameError;

pub fn handler(
    ctx: Context<CreateMatch>,
    match_id: String,
    game_type: u8,
    seed: u64,
) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    let clock = Clock::get()?;

    // Security: Validate match_id length (UUID v4 is exactly 36 chars)
    require!(
        match_id.len() == 36,
        GameError::InvalidPayload
    );

    // Security: Validate game_type bounds
    require!(
        game_type <= 7, // Max game type enum value
        GameError::InvalidPayload
    );

    // Security: Validate authority is signer
    require!(
        ctx.accounts.authority.is_signer,
        GameError::Unauthorized
    );

    let game_type_enum = match game_type {
        0 => GameType::Claim,
        1 => GameType::ThreeCardBrag,
        2 => GameType::Poker,
        3 => GameType::Bridge,
        4 => GameType::Rummy,
        5 => GameType::Scrabble,
        6 => GameType::WordSearch,
        7 => GameType::Crosswords,
        _ => return Err(GameError::InvalidPayload.into()),
    };

    // Convert String to fixed-size array (null-padded)
    let match_id_bytes = match_id.as_bytes();
    let mut match_id_array = [0u8; 36];
    let copy_len = match_id_bytes.len().min(36);
    match_id_array[..copy_len].copy_from_slice(&match_id_bytes[..copy_len]);

    // Convert game name to fixed-size array (null-padded)
    let game_name_str = game_type_enum.get_name();
    let game_name_bytes = game_name_str.as_bytes();
    let mut game_name_array = [0u8; 20];
    let name_copy_len = game_name_bytes.len().min(20);
    game_name_array[..name_copy_len].copy_from_slice(&game_name_bytes[..name_copy_len]);

    // Initialize match with optimized struct
    match_account.match_id = match_id_array;
    
    // Per critique Phase 2.4: Initialize version field (default to "1.0.0")
    let version_str = "1.0.0";
    let version_bytes = version_str.as_bytes();
    let mut version_array = [0u8; 10];
    let version_copy_len = version_bytes.len().min(10);
    version_array[..version_copy_len].copy_from_slice(&version_bytes[..version_copy_len]);
    match_account.version = version_array;
    
    match_account.game_type = game_type;
    match_account.game_name = game_name_array;
    match_account.seed = seed;
    match_account.phase = 0; // Dealing
    match_account.current_player = 0;
    match_account.player_ids = [[0u8; 64]; 10]; // Initialize all player_ids to empty
    match_account.player_count = 0;
    match_account.move_count = 0;
    match_account.created_at = clock.unix_timestamp;
    match_account.ended_at = 0; // 0 = not ended
    match_account.match_hash = [0u8; 32]; // All zeros = not set
    match_account.hot_url = [0u8; 200]; // All zeros = not set
    match_account.authority = ctx.accounts.authority.key();
    match_account.declared_suits = [0u8; 5]; // All zeros = no suits declared
    match_account.flags = 0; // All flags false
    match_account.floor_card_hash = [0u8; 32]; // All zeros = no floor card - per critique Issue #1
    match_account.hand_sizes = [0u8; 10]; // All zeros = no hands committed yet - per critique Issue #1
    match_account.committed_hand_hashes = [0u8; 320]; // All zeros = not committed yet
    match_account.last_nonce = [0u64; 10]; // All zeros = no moves yet

    msg!("Match created: {}", match_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct CreateMatch<'info> {
    #[account(
        init,
        payer = authority,
        space = Match::MAX_SIZE,
        seeds = [b"match", match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

