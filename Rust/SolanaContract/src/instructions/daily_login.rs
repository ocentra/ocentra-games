use anchor_lang::prelude::*;
use crate::state::{UserAccount, ConfigAccount};
use crate::error::GameError;

/// Claims daily login reward (GP).
/// Per spec Section 20.1.2: Daily login system with 24-hour cooldown.
/// Note: user_id is String in instruction data (Anchor requirement), but converted to fixed array immediately.
pub fn handler(ctx: Context<ClaimDailyLogin>, user_id: String) -> Result<()> {
    // Convert String to fixed-size array immediately (optimization: avoid String operations)
    let user_id_bytes = user_id.as_bytes();
    require!(
        user_id_bytes.len() <= 64,
        GameError::InvalidPayload
    );
    let mut user_id_array = [0u8; 64];
    let copy_len = user_id_bytes.len().min(64);
    user_id_array[..copy_len].copy_from_slice(&user_id_bytes[..copy_len]);
    
    let user_account = &mut ctx.accounts.user_account;
    let config = &ctx.accounts.config_account;
    let clock = Clock::get()?;
    
    // Check if 24 hours have passed since last claim
    require!(
        user_account.can_claim_daily(&clock),
        GameError::DailyClaimCooldown
    );
    
    // Calculate GP amount (apply subscription multiplier * leaderboard rank multiplier)
    let base_gp = config.gp_daily_amount;
    
    // Subscription multiplier (Pro users get 2x or 3x)
    let subscription_multiplier = if user_account.has_active_subscription(&clock) {
        config.pro_gp_multiplier as u64
    } else {
        1
    };
    
    // Leaderboard rank multiplier (1-5x based on rank)
    let rank_multiplier = user_account.active_multiplier.max(1) as u64; // Ensure at least 1x
    
    // Combined multiplier (subscription * rank)
    let total_multiplier = subscription_multiplier * rank_multiplier;
    let gp_amount = base_gp
        .checked_mul(total_multiplier)
        .ok_or(GameError::Overflow)?;
    
    // Update last claim timestamp
    user_account.last_claim = clock.unix_timestamp;
    
    // Update lifetime stats (GP balance updated in database, not on-chain)
    user_account.lifetime_gp_earned = user_account.lifetime_gp_earned
        .checked_add(gp_amount)
        .ok_or(GameError::Overflow)?;
    
    msg!("Daily login claimed: {} GP (multiplier: {}x)", gp_amount, total_multiplier);
    Ok(())
}

#[derive(Accounts)]
#[instruction(user_id: String)]
pub struct ClaimDailyLogin<'info> {
    #[account(
        mut,
        seeds = [b"user_account", user_id.as_bytes()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// CHECK: Config account (read-only)
    #[account(
        seeds = [b"config_account"],
        bump
    )]
    pub config_account: Account<'info, ConfigAccount>,
    
    pub system_program: Program<'info, System>,
}

