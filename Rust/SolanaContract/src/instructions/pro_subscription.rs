use anchor_lang::prelude::*;
use crate::state::UserAccount;
use crate::error::GameError;

/// Subscription tier enum.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum SubscriptionTier {
    Free = 0,
    Pro = 1,
    ProPlus = 2,
}

/// Purchases or extends a pro subscription.
/// Per spec Section 20.1.5: Pro subscription system.
/// Note: Payment processed via Stripe off-chain. This instruction only updates subscription status.
/// Note: String params converted to fixed arrays immediately for performance.
pub fn handler(
    ctx: Context<PurchaseSubscription>,
    user_id: String,
    tier: u8,  // SubscriptionTier as u8
    duration_days: u8,  // Typically 30 days
) -> Result<()> {
    // Convert String to fixed-size array immediately (optimization)
    let user_id_bytes = user_id.as_bytes();
    require!(
        user_id_bytes.len() <= 64,
        GameError::InvalidPayload
    );
    
    let user_account = &mut ctx.accounts.user_account;
    let clock = Clock::get()?;
    
    // Validate tier
    let subscription_tier = match tier {
        0 => SubscriptionTier::Free,
        1 => SubscriptionTier::Pro,
        2 => SubscriptionTier::ProPlus,
        _ => return Err(GameError::InvalidTier.into()),
    };
    
    // Free tier cannot be purchased
    require!(
        subscription_tier != SubscriptionTier::Free,
        GameError::InvalidTier
    );
    
    // Payment processed via Stripe (off-chain)
    // In production: Call Stripe API to process payment
    // After successful payment, update subscription in database
    
    // Extend subscription expiry
    let duration_seconds = duration_days as i64 * 86400;
    if user_account.subscription_expiry > clock.unix_timestamp {
        // Extend existing subscription
        user_account.subscription_expiry = user_account.subscription_expiry
            .checked_add(duration_seconds)
            .ok_or(GameError::Overflow)?;
    } else {
        // New subscription
        user_account.subscription_expiry = clock.unix_timestamp
            .checked_add(duration_seconds)
            .ok_or(GameError::Overflow)?;
    }
    
    user_account.subscription_tier = tier;
    
    msg!("Subscription purchased: tier={}, expiry={}", tier, user_account.subscription_expiry);
    Ok(())
}

#[derive(Accounts)]
#[instruction(user_id: String)]
pub struct PurchaseSubscription<'info> {
    #[account(
        mut,
        seeds = [b"user_account", user_id.as_bytes()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub system_program: Program<'info, System>,
}

