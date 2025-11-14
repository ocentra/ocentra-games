use anchor_lang::prelude::*;
use crate::state::{Dispute, ValidatorVote, DisputeResolution, ConfigAccount};
use crate::error::GameError;

/// Flags a dispute with GP deposit.
/// Per spec Section 23: Dispute deposit system using GP (Game Points) instead of SOL.
/// GP is deducted off-chain in database before calling this instruction.
/// This instruction records the GP deposit on-chain for tracking.
pub fn handler(
    ctx: Context<FlagDispute>,
    match_id: String,
    user_id: String,  // Firebase UID of flagger (for GP tracking)
    reason: u8,
    evidence_hash: [u8; 32],
    gp_deposit: u32,  // GP deposit amount (already deducted off-chain)
) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let config = &ctx.accounts.config_account;
    let clock = Clock::get()?;

    // Security: Validate flagger is signer
    require!(
        ctx.accounts.flagger.is_signer,
        GameError::Unauthorized
    );

    // Security: Validate match_id is valid UUID
    require!(
        match_id.len() == 36,
        GameError::InvalidPayload
    );

    // Security: Validate reason bounds
    require!(
        reason <= 4,  // DisputeReason::Other
        GameError::InvalidAction
    );

    // Security: Validate evidence_hash is not all zeros
    require!(
        evidence_hash.iter().any(|&b| b != 0),
        GameError::InvalidPayload
    );

    // Security: Validate GP deposit matches config requirement
    require!(
        gp_deposit >= config.dispute_deposit_gp,
        GameError::InsufficientGPForDispute
    );

    // Convert match_id and user_id to fixed-size arrays
    let match_id_bytes = match_id.as_bytes();
    let mut match_id_array = [0u8; 36];
    match_id_array[..36].copy_from_slice(&match_id_bytes[..36.min(match_id_bytes.len())]);

    let user_id_bytes = user_id.as_bytes();
    require!(
        user_id_bytes.len() <= 64,
        GameError::InvalidPayload
    );
    let mut user_id_array = [0u8; 64];
    let copy_len = user_id_bytes.len().min(64);
    user_id_array[..copy_len].copy_from_slice(&user_id_bytes[..copy_len]);

    // Initialize dispute
    dispute.match_id = match_id_array;
    dispute.flagger = ctx.accounts.flagger.key();
    dispute.flagger_user_id = user_id_array;
    dispute.reason = reason;
    dispute.evidence_hash = evidence_hash;
    dispute.gp_deposit = gp_deposit;
    dispute.gp_refunded = false; // Will be set to true if dispute is valid
    dispute.created_at = clock.unix_timestamp;
    dispute.resolved_at = 0; // 0 = not resolved
    dispute.resolution = 0; // 0 = not resolved
    dispute.validator_votes = [ValidatorVote {
        validator: Pubkey::default(),
        resolution: DisputeResolution::ResolvedInFavorOfFlagger,
        timestamp: 0,
    }; 10]; // Initialize with default values
    dispute.vote_count = 0;

    msg!("Dispute flagged: match {}, reason {}, by {} (GP deposit: {})", 
         match_id, reason, user_id, gp_deposit);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct FlagDispute<'info> {
    #[account(
        init,
        payer = flagger,
        space = Dispute::MAX_SIZE,
        seeds = [b"dispute", match_id.as_bytes(), flagger.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
    
    /// ConfigAccount to check dispute_deposit_gp requirement
    pub config_account: Account<'info, ConfigAccount>,
    
    #[account(mut)]
    pub flagger: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

