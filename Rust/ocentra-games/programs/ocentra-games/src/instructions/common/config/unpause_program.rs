use crate::error::GameError;
use crate::state::ConfigAccount;
use anchor_lang::prelude::*;

/// Unpauses the program, re-enabling paid-match operations.
/// Per Phase 01: Emergency controls - pause mechanism.
/// Only the treasury multisig can call this instruction.
pub fn handler(ctx: Context<UnpauseProgram>) -> Result<()> {
    let clock = Clock::get()?;
    let config = &mut ctx.accounts.config_account;

    // Validate authority is treasury multisig
    require!(
        ctx.accounts.authority.key() == config.treasury_multisig,
        GameError::Unauthorized
    );

    // Clear pause flag
    config.is_paused = false;
    config.last_updated = clock.unix_timestamp;

    msg!(
        "Program unpaused by treasury multisig: {}",
        ctx.accounts.authority.key()
    );
    Ok(())
}

#[derive(Accounts)]
pub struct UnpauseProgram<'info> {
    #[account(
        mut,
        seeds = [b"config_account"],
        bump
    )]
    pub config_account: Account<'info, ConfigAccount>,

    /// CHECK: Treasury multisig authority (must match config_account.treasury_multisig)
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
