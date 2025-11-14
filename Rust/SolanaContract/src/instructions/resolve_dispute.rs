use anchor_lang::prelude::*;
use crate::state::{Dispute, DisputeResolution, ValidatorVote};
use crate::error::GameError;

/// Resolves a dispute and handles GP deposit refund/forfeit.
/// Per spec Section 23: GP deposit is refunded if dispute is valid, forfeited if invalid.
/// Actual GP refund/forfeit happens off-chain in database. This instruction records the decision.
pub fn handler(
    ctx: Context<ResolveDispute>,
    dispute_id: String,
    resolution: u8,
) -> Result<()> {
    let dispute = &mut ctx.accounts.dispute;
    let clock = Clock::get()?;

    // Security: Validate validator is signer
    require!(
        ctx.accounts.validator.is_signer,
        GameError::Unauthorized
    );

    // Security: Validate dispute exists and is not already resolved
    require!(
        !dispute.is_resolved(),
        GameError::DisputeAlreadyResolved
    );

    // Security: Validate resolution bounds (1-4, not 0)
    require!(
        resolution >= 1 && resolution <= 4,  // 1-4 map to resolution types
        GameError::InvalidAction
    );

    // Security: Validate GP deposit not already processed
    require!(
        !dispute.gp_refunded || dispute.resolution == 0,  // Allow if not resolved yet
        GameError::GPDepositAlreadyProcessed
    );

    // Record resolution
    dispute.resolution = resolution;
    dispute.resolved_at = clock.unix_timestamp;

    // Determine if GP should be refunded based on resolution
    // Resolution 1 = ResolvedInFavorOfFlagger (dispute valid) → refund GP
    // Resolution 2, 3, 4 = Invalid → forfeit GP (gp_refunded stays false)
    let dispute_resolution = match resolution {
        1 => DisputeResolution::ResolvedInFavorOfFlagger,
        2 => DisputeResolution::ResolvedInFavorOfDefendant,
        3 => DisputeResolution::MatchVoided,
        _ => DisputeResolution::PartialRefund,
    };
    
    // If dispute is valid (resolved in favor of flagger), refund GP
    if dispute_resolution == DisputeResolution::ResolvedInFavorOfFlagger {
        dispute.gp_refunded = true;
    }
    // Otherwise, GP is forfeited (gp_refunded = false, which is already set)

    // Add validator vote
    let validator_vote = ValidatorVote {
        validator: ctx.accounts.validator.key(),
        resolution: dispute_resolution,
        timestamp: clock.unix_timestamp,
    };
    dispute.add_vote(validator_vote)?;

    msg!("Dispute resolved: {} with resolution {} (GP {}: {})", 
         dispute_id, resolution, 
         if dispute.gp_refunded { "refunded" } else { "forfeited" },
         dispute.gp_deposit);
    Ok(())
}

#[derive(Accounts)]
#[instruction(dispute_id: String)]
pub struct ResolveDispute<'info> {
    #[account(
        mut,
        seeds = [b"dispute", &dispute.match_id[..], dispute.flagger.as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
    
    pub validator: Signer<'info>,
}

