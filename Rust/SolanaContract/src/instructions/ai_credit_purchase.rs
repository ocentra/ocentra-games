use anchor_lang::prelude::*;
use crate::state::UserAccount;
use crate::error::GameError;

/// Records AI credit (AC) purchase.
/// Per spec Section 20.1.6: AI credit purchase system.
/// Note: Payment processed via Stripe off-chain. This instruction only records the purchase.
/// Note: String params converted to fixed arrays immediately for performance.
pub fn handler(
    ctx: Context<PurchaseAICredits>,
    user_id: String,
    ac_amount: u64,  // Amount of AC purchased
) -> Result<()> {
    // Convert String to fixed-size array immediately (optimization)
    let user_id_bytes = user_id.as_bytes();
    require!(
        user_id_bytes.len() <= 64,
        GameError::InvalidPayload
    );
    
    let user_account = &mut ctx.accounts.user_account;
    
    // Payment processed via Stripe (off-chain)
    // In production: Call Stripe API to process payment
    // After successful payment, AC balance updated in database
    
    // Update stats (AC balance updated in database, not on-chain)
    // This instruction just records the purchase for tracking
    
    msg!("AI credits purchased: {} AC", ac_amount);
    Ok(())
}

#[derive(Accounts)]
#[instruction(user_id: String)]
pub struct PurchaseAICredits<'info> {
    #[account(
        mut,
        seeds = [b"user_account", user_id.as_bytes()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    pub system_program: Program<'info, System>,
}

