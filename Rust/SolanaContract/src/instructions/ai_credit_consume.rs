use anchor_lang::prelude::*;
use crate::state::{UserAccount, ConfigAccount};
use crate::error::GameError;

/// Records AI credit (AC) consumption.
/// Per spec Section 20.1.6: AI credit consumption for API calls.
/// Note: AC balance check happens off-chain in database. This instruction only updates stats.
/// Note: String params converted to fixed arrays immediately for performance.
pub fn handler(
    ctx: Context<ConsumeAICredits>,
    user_id: String,
    model_id: u8,  // Model ID (0-9, corresponds to ai_model_costs array index)
    tokens_used: u32,  // Number of tokens used (in thousands)
) -> Result<()> {
    // Convert String to fixed-size array immediately (optimization)
    let user_id_bytes = user_id.as_bytes();
    require!(
        user_id_bytes.len() <= 64,
        GameError::InvalidPayload
    );
    
    let user_account = &mut ctx.accounts.user_account;
    let config = &ctx.accounts.config_account;
    
    // Validate model_id
    require!(
        model_id < 10,
        GameError::InvalidPayload
    );
    
    // Calculate AC cost (cost per 1k tokens * tokens_used)
    let cost_per_1k = config.ai_model_costs[model_id as usize];
    let ac_cost = (cost_per_1k as u64)
        .checked_mul(tokens_used as u64)
        .ok_or(GameError::Overflow)?;
    
    // Update stats (AC balance deducted in database before calling this)
    user_account.api_calls_made = user_account.api_calls_made
        .checked_add(1)
        .ok_or(GameError::Overflow)?;
    
    user_account.total_ac_spent = user_account.total_ac_spent
        .checked_add(ac_cost)
        .ok_or(GameError::Overflow)?;
    
    msg!("AI credits consumed: {} AC (model_id={}, tokens={}k)", ac_cost, model_id, tokens_used);
    Ok(())
}

#[derive(Accounts)]
#[instruction(user_id: String)]
pub struct ConsumeAICredits<'info> {
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

