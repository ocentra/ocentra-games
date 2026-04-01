use crate::error::GameError;
use crate::state::{ConfigAccount, UserDepositAccount};
use anchor_lang::prelude::*;

/// Deposits SOL from user wallet to UserDepositAccount (platform deposit).
/// Per Phase 03: Economic instructions for platform deposits.
/// This enables users to fund their platform deposit account for platform-funded matches.
pub fn handler(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
    // Validate amount is greater than zero
    require!(amount > 0, GameError::InvalidPayload);

    // Check if program is paused
    let config = &ctx.accounts.config_account;
    require!(!config.is_paused, GameError::ProgramPaused);

    // 1. Perform the CPI transfer FIRST (before any borrows)
    // This will fund the PDA and ensure the account has lamports
    let cpi_accounts = anchor_lang::system_program::Transfer {
        from: ctx.accounts.user.to_account_info(),
        to: ctx.accounts.user_deposit_account.to_account_info(),
    };
    let cpi_program = ctx.accounts.system_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    anchor_lang::system_program::transfer(cpi_ctx, amount)?;

    // 2. Now load/initialize the account
    // Check if account is initialized by checking if discriminator is set
    let account_info = ctx.accounts.user_deposit_account.to_account_info();
    let account_data = account_info.try_borrow_data()?;
    let is_initialized = account_data.len() >= 8 && account_data[0..8] != [0u8; 8];
    drop(account_data);

    let mut deposit_account = if is_initialized {
        // Account already exists - load and validate
        let account = ctx.accounts.user_deposit_account.load_mut()?;
        require!(
            account.authority == ctx.accounts.user.key(),
            GameError::Unauthorized
        );
        require!(!account.is_frozen(), GameError::AccountFrozen);
        account
    } else {
        // Account was just created by init_if_needed but not initialized - initialize it
        let mut account = ctx.accounts.user_deposit_account.load_init()?;
        account.authority = ctx.accounts.user.key();
        account.bump = ctx.bumps.user_deposit_account;
        account.total_deposited = 0;
        account.available_lamports = 0;
        account.in_play_lamports = 0;
        account.withdrawn_lamports = 0;
        account.locked_until = 0;
        account.flags = 0;
        account
    };

    // 3. Update the account's internal balance tracking
    deposit_account.total_deposited = deposit_account
        .total_deposited
        .checked_add(amount)
        .ok_or(GameError::Overflow)?;
    deposit_account.available_lamports = deposit_account
        .available_lamports
        .checked_add(amount)
        .ok_or(GameError::Overflow)?;

    msg!(
        "Deposited {} lamports to UserDepositAccount. Total deposited: {}, Available: {}",
        amount,
        deposit_account.total_deposited,
        deposit_account.available_lamports
    );

    Ok(())
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = UserDepositAccount::MAX_SIZE,
        seeds = [b"user_deposit", user.key().as_ref()],
        bump
    )]
    pub user_deposit_account: AccountLoader<'info, UserDepositAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        seeds = [b"config_account"],
        bump
    )]
    pub config_account: Account<'info, ConfigAccount>,

    pub system_program: Program<'info, System>,
}
