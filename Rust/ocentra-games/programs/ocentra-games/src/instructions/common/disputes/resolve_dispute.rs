use crate::error::GameError;
use crate::state::Dispute;
use anchor_lang::prelude::*;

/// Resolves a dispute and handles GP deposit refund/forfeit.
/// Per spec Section 23: GP deposit is refunded if dispute is valid, forfeited if invalid.
/// Actual GP refund/forfeit happens off-chain in database. This instruction records the decision.
pub fn handler(ctx: Context<ResolveDispute>, dispute_id: String, resolution: u8) -> Result<()> {
    let mut dispute = ctx.accounts.dispute.load_mut()?;
    let clock = Clock::get()?;

    // Security: Validate validator is signer
    require!(ctx.accounts.validator.is_signer, GameError::Unauthorized);

    // Security: Validate dispute exists and is not already resolved
    require!(!dispute.is_resolved(), GameError::DisputeAlreadyResolved);

    // Security: Validate resolution bounds (1-4, not 0)
    require!(
        resolution >= 1 && resolution <= 4, // 1-4 map to resolution types
        GameError::InvalidAction
    );

    // Security: Validate GP deposit not already processed
    require!(
        dispute.gp_refunded == 0 || dispute.resolution == 0, // Allow if not resolved yet
        GameError::GPDepositAlreadyProcessed
    );

    // Record resolution
    dispute.resolution = resolution;
    dispute.resolved_at = clock.unix_timestamp;

    // Determine if GP should be refunded based on resolution
    // Resolution 1 = ResolvedInFavorOfFlagger (dispute valid) → refund GP
    // Resolution 2, 3, 4 = Invalid → forfeit GP (gp_refunded stays false)
    // If dispute is valid (resolved in favor of flagger), refund GP
    if resolution == 1 {
        dispute.gp_refunded = 1; // 1 = true (u8 for zero-copy)
    }
    // Otherwise, GP is forfeited (gp_refunded = 0, which is already set)

    // Add validator vote
    let timestamp = clock.unix_timestamp as u32; // Convert i64 to u32 for zero-copy
    dispute.add_vote(ctx.accounts.validator.key(), resolution, timestamp)?;

    msg!(
        "Dispute resolved: {} with resolution {} (GP {}: {})",
        dispute_id,
        resolution,
        if dispute.gp_refunded == 1 {
            "refunded"
        } else {
            "forfeited"
        },
        dispute.gp_deposit
    );
    Ok(())
}

#[derive(Accounts)]
#[instruction(dispute_id: String)]
pub struct ResolveDispute<'info> {
    #[account(
        mut,
        seeds = [b"dispute", dispute_id.as_bytes()],
        bump
    )]
    pub dispute: AccountLoader<'info, Dispute>,

    pub validator: Signer<'info>,
}
