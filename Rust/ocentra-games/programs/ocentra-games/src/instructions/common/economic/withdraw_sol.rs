use crate::error::GameError;
use crate::state::{ConfigAccount, UserDepositAccount};
use anchor_lang::prelude::*;

/// Withdraws SOL from UserDepositAccount back to user wallet (with fee deduction).
/// Per Phase 03: Economic instructions for platform withdrawals.
/// Deducts withdrawal fee and transfers remaining amount to user.
pub fn handler(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
    // Validate amount is greater than zero
    require!(amount > 0, GameError::InvalidPayload);

    let config = &ctx.accounts.config_account;

    // Check if program is paused
    require!(!config.is_paused, GameError::ProgramPaused);

    let clock = Clock::get()?;
    let withdrawal_fee = config.withdrawal_fee_lamports;
    let total_required = amount
        .checked_add(withdrawal_fee)
        .ok_or(GameError::Overflow)?;

    // Scope the initial validation to release the borrow before CPI transfers
    {
        let deposit_account = ctx.accounts.user_deposit_account.load()?;

        require!(
            deposit_account.authority == ctx.accounts.user.key(),
            GameError::Unauthorized
        );
        require!(!deposit_account.is_frozen(), GameError::AccountFrozen);
        if deposit_account.is_locked() {
            require!(
                clock.unix_timestamp >= deposit_account.locked_until,
                GameError::AccountLocked
            );
        }
        require!(
            deposit_account.available_lamports >= total_required,
            GameError::InsufficientFunds
        );
    } // Borrow on deposit_account is dropped here

    // Transfer lamports manually (cannot use System Program transfer FROM a PDA with data)
    // Since the account is owned by our program, we can directly manipulate lamports
    let deposit_account_info = ctx.accounts.user_deposit_account.to_account_info();
    let user_account_info = ctx.accounts.user.to_account_info();

    // Transfer withdrawal fee to treasury (if fee > 0)
    if withdrawal_fee > 0 {
        let treasury = ctx
            .accounts
            .treasury
            .as_ref()
            .ok_or(GameError::InvalidPayload)?;
        let treasury_account_info = treasury.to_account_info();
        
        // Calculate new balances first, then assign
        let deposit_balance = deposit_account_info.lamports();
        let treasury_balance = treasury_account_info.lamports();
        
        let new_deposit_balance = deposit_balance
            .checked_sub(withdrawal_fee)
            .ok_or(GameError::Overflow)?;
        let new_treasury_balance = treasury_balance
            .checked_add(withdrawal_fee)
            .ok_or(GameError::Overflow)?;
        
        // Assign new balances
        **deposit_account_info.lamports.borrow_mut() = new_deposit_balance;
        **treasury_account_info.lamports.borrow_mut() = new_treasury_balance;
    }

    // Transfer amount to user
    // Calculate new balances first, then assign
    let deposit_balance = deposit_account_info.lamports();
    let user_balance = user_account_info.lamports();
    
    let new_deposit_balance = deposit_balance
        .checked_sub(amount)
        .ok_or(GameError::Overflow)?;
    let new_user_balance = user_balance
        .checked_add(amount)
        .ok_or(GameError::Overflow)?;
    
    // Assign new balances
    **deposit_account_info.lamports.borrow_mut() = new_deposit_balance;
    **user_account_info.lamports.borrow_mut() = new_user_balance;

    // Re-borrow the account to update its state
    let mut deposit_account = ctx.accounts.user_deposit_account.load_mut()?;
    deposit_account.available_lamports = deposit_account
        .available_lamports
        .checked_sub(total_required)
        .ok_or(GameError::Overflow)?;
    deposit_account.withdrawn_lamports = deposit_account
        .withdrawn_lamports
        .checked_add(amount)
        .ok_or(GameError::Overflow)?;

    msg!(
        "Withdrew {} lamports (fee: {}). Available: {}, Total withdrawn: {}",
        amount,
        withdrawal_fee,
        deposit_account.available_lamports,
        deposit_account.withdrawn_lamports
    );

    Ok(())
}

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        mut,
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

    /// Treasury account (optional - only needed if withdrawal_fee > 0)
    /// CHECK: Validated in handler
    #[account(mut)]
    pub treasury: Option<AccountInfo<'info>>,

    pub system_program: Program<'info, System>,
}
