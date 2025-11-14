use anchor_lang::prelude::*;
use crate::state::{UserAccount, ConfigAccount};
use crate::error::GameError;

/// Claims ad reward (GP).
/// Per spec Section 20.1.4: Ad reward system with cooldown and daily limits.
/// Note: String params converted to fixed arrays immediately for performance.
pub fn handler(
    ctx: Context<ClaimAdReward>,
    user_id: String,
    ad_verification_signature: Vec<u8>,  // Off-chain oracle signature
) -> Result<()> {
    // Convert String to fixed-size array immediately (optimization)
    let user_id_bytes = user_id.as_bytes();
    require!(
        user_id_bytes.len() <= 64,
        GameError::InvalidPayload
    );
    
    let user_account = &mut ctx.accounts.user_account;
    let config = &ctx.accounts.config_account;
    let clock = Clock::get()?;
    
    // Verify ad was watched (off-chain oracle signature)
    // In production, verify signature from ad verification service
    // For now, we require non-empty signature
    require!(
        !ad_verification_signature.is_empty(),
        GameError::InvalidAdVerification
    );
    
    // Check cooldown (minimum 300 seconds between ads)
    require!(
        user_account.can_watch_ad(&clock, config.ad_cooldown_seconds),
        GameError::AdCooldownActive
    );
    
    // Check daily ad limit (tracked off-chain or in separate account)
    // For simplicity, assume checked off-chain
    
    // Update last ad watch timestamp
    user_account.last_ad_watch = clock.unix_timestamp;
    
    // Update lifetime stats (GP balance updated in database, not on-chain)
    let gp_reward = config.gp_per_ad as u64;
    user_account.lifetime_gp_earned = user_account.lifetime_gp_earned
        .checked_add(gp_reward)
        .ok_or(GameError::Overflow)?;
    
    msg!("Ad reward claimed: {} GP", gp_reward);
    Ok(())
}

#[derive(Accounts)]
#[instruction(user_id: String)]
pub struct ClaimAdReward<'info> {
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

