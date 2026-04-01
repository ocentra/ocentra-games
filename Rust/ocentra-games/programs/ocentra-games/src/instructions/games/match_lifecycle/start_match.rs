use crate::error::GameError;
use crate::state::{EscrowAccount, GameRegistry, Match};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<StartMatch>, match_id: String) -> Result<()> {
    let mut match_account = ctx.accounts.match_account.load_mut()?;
    let registry = ctx.accounts.registry.load()?;

    // Security: Validate match_id matches
    let match_id_bytes = match_id.as_bytes();
    require!(
        match_id_bytes.len() == 36
            && match_id_bytes == &match_account.match_id[..match_id_bytes.len().min(36)],
        GameError::InvalidPayload
    );

    // Security: Validate authority is signer and matches
    require!(ctx.accounts.authority.is_signer, GameError::Unauthorized);
    require!(
        ctx.accounts.authority.key() == match_account.authority,
        GameError::Unauthorized
    );

    // Security: Must be in Dealing phase
    require!(match_account.phase == 0, GameError::InvalidPhase);

    // Security: Validate minimum players requirement (game-specific)
    let min_players = match_account.get_min_players(&registry)?;
    require!(
        match_account.has_minimum_players(&registry)?,
        GameError::InsufficientPlayers
    );

    // Anti-cheat: Validate player count bounds
    let max_players = match_account.get_max_players(&registry)?;
    require!(
        match_account.player_count >= min_players && match_account.player_count <= max_players,
        GameError::InsufficientPlayers
    );

    // Phase 04: Verify escrow for paid matches
    if match_account.is_paid_match() {
        let entry_fee = match_account.entry_fee_lamports;
        require!(entry_fee > 0, GameError::InvalidPayload);

        // Validate escrow account exists
        let escrow_loader = ctx.accounts.escrow_account.as_ref()
            .ok_or(GameError::InvalidPayload)?;
        let mut escrow_account = escrow_loader.load_mut()?;

        // Validate escrow belongs to this match
        require!(
            escrow_account.match_pda == ctx.accounts.match_account.key(),
            GameError::InvalidPayload
        );

        // Verify total escrow equals expected prize pool
        let expected_total = entry_fee
            .checked_mul(match_account.player_count as u64)
            .ok_or(GameError::Overflow)?;
        require!(
            escrow_account.total_entry_lamports == expected_total,
            GameError::InvalidPayload
        );

        // Mark escrow as funded now that match is starting
        // This indicates all players have paid their entry fees
        escrow_account.set_funded(true);

        // Phase 04: KYC tier validation (if required)
        // Note: KYC tier checks would be implemented here if needed
        // For now, we assume all players meet KYC requirements if they can join

        msg!(
            "Paid match escrow verified and funded: {} lamports total ({} players × {} lamports entry fee)",
            escrow_account.total_entry_lamports,
            match_account.player_count,
            entry_fee
        );
    }

    // Convert game_name array to string for logging (null-terminated)
    let game_name_str = String::from_utf8_lossy(&match_account.game_name)
        .trim_end_matches('\0')
        .to_string();

    let max_players = match_account.get_max_players(&registry)?;
    msg!(
        "Starting {} match with {} players (min: {}, max: {})",
        game_name_str,
        match_account.player_count,
        min_players,
        max_players
    );

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

    msg!(
        "Match started: {} with {} players",
        match_id,
        match_account.player_count
    );
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct StartMatch<'info> {
    #[account(
        mut,
        seeds = [b"m", &match_id.as_bytes()[..31.min(match_id.len())]],
        bump
    )]
    pub match_account: AccountLoader<'info, Match>,

    #[account(
        seeds = [b"game_registry"],
        bump
    )]
    pub registry: AccountLoader<'info, GameRegistry>,

    /// Escrow account (only required for paid matches)
    /// CHECK: Validated in handler - only required if match is paid
    #[account(
        mut,
        seeds = [b"escrow", match_account.key().as_ref()],
        bump
    )]
    pub escrow_account: Option<AccountLoader<'info, EscrowAccount>>,

    pub authority: Signer<'info>,
}