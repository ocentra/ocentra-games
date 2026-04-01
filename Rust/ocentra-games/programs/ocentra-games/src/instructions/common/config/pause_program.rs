use crate::error::GameError;
use crate::state::ConfigAccount;
use anchor_lang::prelude::*;

/// Pauses the program, disabling all paid-match operations.
/// Per Phase 01: Emergency controls - pause mechanism.
/// Only the treasury multisig can call this instruction.
pub fn handler(ctx: Context<PauseProgram>) -> Result<()> {
    let clock = Clock::get()?;
    let config = &mut ctx.accounts.config_account;

    // Validate authority is treasury multisig
    require!(
        ctx.accounts.authority.key() == config.treasury_multisig,
        GameError::Unauthorized
    );

    // Set pause flag
    config.is_paused = true;
    config.last_updated = clock.unix_timestamp;

    msg!(
        "Program paused by treasury multisig: {}",
        ctx.accounts.authority.key()
    );
    Ok(())
}

#[derive(Accounts)]
pub struct PauseProgram<'info> {
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
