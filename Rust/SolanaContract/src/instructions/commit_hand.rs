use anchor_lang::prelude::*;
use crate::state::Match;
use crate::error::GameError;

/// Commit a player's hand hash during the Dealing phase.
/// This allows players to commit to their hand before revealing it.
/// The hash is used later to verify card plays (e.g., rebuttals).
/// Per critique Issue #1: Also records hand size for on-chain validation.
pub fn handler(
    ctx: Context<CommitHand>,
    match_id: String,
    user_id: String,  // Firebase UID (per spec: use user IDs, not Pubkeys)
    hand_hash: [u8; 32],
    hand_size: u8, // Per critique Issue #1: Hand size for validation
) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    
    // Security: Validate match_id matches
    let match_id_bytes = match_id.as_bytes();
    require!(
        match_id_bytes.len() == 36 && 
        match_id_bytes == &match_account.match_id[..match_id_bytes.len().min(36)],
        GameError::InvalidPayload
    );

    // Security: Validate player is signer
    require!(
        ctx.accounts.player.is_signer,
        GameError::Unauthorized
    );

    // Security: Must be in Dealing phase (phase 0)
    require!(
        match_account.phase == 0,
        GameError::InvalidPhase
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
    
    // Security: Validate player is in the match (find by user_id)
    let player_index = match_account.find_player_index(&user_id_array)
        .ok_or(GameError::PlayerNotInMatch)?;

    // Security: Validate hand hash is not all zeros (empty hash)
    require!(
        !hand_hash.iter().all(|&b| b == 0),
        GameError::InvalidPayload
    );
    
    // Per critique Issue #1: Validate hand size is reasonable
    // For CLAIM game, max hand size is 13, but allow up to 52 (full deck) for other games
    require!(
        hand_size > 0 && hand_size <= 52,
        GameError::InvalidPayload
    );

    // Set committed hand hash for this player
    match_account.set_committed_hand_hash(player_index, hand_hash);
    
    // Per critique Issue #1: Set hand size for validation
    match_account.set_hand_size(player_index, hand_size);

    msg!("Player {} committed hand hash for match {}", user_id, match_id);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct CommitHand<'info> {
    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    pub player: Signer<'info>,
}

