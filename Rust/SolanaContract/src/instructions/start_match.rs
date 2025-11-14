use anchor_lang::prelude::*;
use crate::state::Match;
use crate::error::GameError;

pub fn handler(ctx: Context<StartMatch>, match_id: String) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    
    // Security: Validate match_id matches
    let match_id_bytes = match_id.as_bytes();
    require!(
        match_id_bytes.len() == 36 && 
        match_id_bytes == &match_account.match_id[..match_id_bytes.len().min(36)],
        GameError::InvalidPayload
    );

    // Security: Validate authority is signer and matches
    require!(
        ctx.accounts.authority.is_signer,
        GameError::Unauthorized
    );
    require!(
        ctx.accounts.authority.key() == match_account.authority,
        GameError::Unauthorized
    );

    // Security: Must be in Dealing phase
    require!(
        match_account.phase == 0,
        GameError::InvalidPhase
    );

    // Security: Validate minimum players requirement (game-specific)
    let min_players = match_account.get_min_players();
    require!(
        match_account.has_minimum_players(),
        GameError::InsufficientPlayers
    );

    // Anti-cheat: Validate player count bounds
    require!(
        match_account.player_count >= min_players && 
        match_account.player_count <= match_account.get_max_players(),
        GameError::InsufficientPlayers
    );

    // Convert game_name array to string for logging (null-terminated)
    let game_name_str = String::from_utf8_lossy(&match_account.game_name)
        .trim_end_matches('\0')
        .to_string();

    msg!("Starting {} match with {} players (min: {}, max: {})", 
         game_name_str, 
         match_account.player_count,
         min_players,
         match_account.get_max_players());

    // Transition to playing phase
    match_account.phase = 1; // Playing
    match_account.set_all_players_joined(true);
    
    // Per critique: initialize committed hand hashes
    // In production, players would commit their hand hashes here
    // For now, initialize to all zeros (will be set when hands are dealt)
    match_account.committed_hand_hashes = [0u8; 320];
    
    // Per critique Issue #1: Initialize hand sizes (will be set when hands are dealt)
    // For CLAIM game, each player starts with 13 cards after dealing
    // But we initialize to 0 here - will be set by commit_hand instruction
    match_account.hand_sizes = [0u8; 10];
    
    // Per critique Issue #1: Initialize floor card hash (no floor card yet)
    match_account.floor_card_hash = [0u8; 32];

    msg!("Match started: {} with {} players", match_id, match_account.player_count);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct StartMatch<'info> {
    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    pub authority: Signer<'info>,
}

