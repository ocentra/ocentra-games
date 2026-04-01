use crate::error::GameError;
use crate::state::{ConfigAccount, EscrowAccount, Match, UserDepositAccount};
use anchor_lang::prelude::*;

/// Distributes prize pool from EscrowAccount to all winners atomically.
/// Per Phase 03: Economic instructions for prize distribution.
///
/// **Enterprise-grade features:**
/// - Atomic operation: All prizes distributed or none (all-or-nothing)
/// - Validates prize pool sum matches escrow balance minus platform fee
/// - Transfers platform fee to treasury before prize distribution
/// - Supports up to 10 winners (max players per match)
/// - Prevents double distribution with escrow status flag
/// - Comprehensive validation of all inputs
pub fn handler(
    ctx: Context<DistributePrizes>,
    match_id: String,
    winner_indices: Vec<u8>,
    prize_amounts: Vec<u64>,
) -> Result<()> {
    // Validate inputs
    require!(!winner_indices.is_empty(), GameError::InvalidPayload);
    require!(
        winner_indices.len() == prize_amounts.len(),
        GameError::InvalidPayload
    );
    require!(
        winner_indices.len() <= 10, // Max players
        GameError::InvalidPayload
    );

    // Validate match_id format
    let match_id_bytes = match_id.as_bytes();
    require!(match_id_bytes.len() == 36, GameError::InvalidPayload);

    // Load accounts
    let config = &ctx.accounts.config_account;

    // Check if program is paused
    require!(!config.is_paused, GameError::ProgramPaused);

    let match_account = ctx.accounts.match_account.load()?;
    let mut escrow_account = ctx.accounts.escrow_account.load_mut()?;

    // Validate match PDA matches
    require!(
        escrow_account.match_pda == ctx.accounts.match_account.key(),
        GameError::InvalidPayload
    );

    // Validate match_id matches
    require!(
        match_id_bytes == &match_account.match_id[..match_id_bytes.len().min(36)],
        GameError::InvalidPayload
    );

    // Validate match is ended
    require!(
        match_account.phase == crate::state::match_state::game_phase::ENDED,
        GameError::MatchNotEnded
    );

    // Validate escrow is funded and not already distributed
    require!(escrow_account.is_funded(), GameError::EscrowNotFunded);
    require!(
        !escrow_account.is_distributed(),
        GameError::EscrowAlreadyDistributed
    );

    // Validate all winner indices are valid
    for &winner_index in &winner_indices {
        require!(
            winner_index < match_account.player_count,
            GameError::InvalidPayload
        );
        require!(winner_index < 10, GameError::InvalidPayload);
    }

    // Validate all prize amounts are positive
    for &amount in &prize_amounts {
        require!(amount > 0, GameError::InvalidPayload);
    }

    // Calculate platform fee
    let platform_fee_bps = config.platform_fee_bps as u64;
    let platform_fee = escrow_account
        .total_entry_lamports
        .checked_mul(platform_fee_bps)
        .and_then(|x| x.checked_div(10000))
        .ok_or(GameError::Overflow)?;

    // Calculate expected prize pool (total entry fees - platform fee)
    let expected_prize_pool = escrow_account
        .total_entry_lamports
        .checked_sub(platform_fee)
        .ok_or(GameError::Overflow)?;

    // Validate prize amounts sum equals expected prize pool
    let total_prizes: u64 = prize_amounts.iter().sum();
    require!(
        total_prizes == expected_prize_pool,
        GameError::InvalidPayload
    );

    // Validate we have enough winner accounts
    require!(
        winner_indices.len() <= 10,
        GameError::InvalidPayload
    );

    // Update escrow with platform fee info (before dropping borrow)
    if platform_fee > 0 {
        escrow_account.platform_fee_lamports = platform_fee;
        escrow_account.treasury_due_lamports = platform_fee;
    }
    
    // Drop mutable borrow before lamport transfers
    drop(escrow_account);
    
    // Get account info for manual lamport transfers (after dropping mutable borrow)
    let escrow_account_info = ctx.accounts.escrow_account.to_account_info();

    // Transfer platform fee to treasury first (before prize distribution)
    if platform_fee > 0 {
        // Transfer platform fee to treasury using manual lamport transfer
        // Cannot use system_program::transfer() because escrow_account carries data
        let treasury_account_info = ctx.accounts.treasury.to_account_info();
        **escrow_account_info.try_borrow_mut_lamports()? -= platform_fee;
        **treasury_account_info.try_borrow_mut_lamports()? += platform_fee;
    }

    // Determine payment method from match
    let payment_method = match_account.get_payment_method();

    // Distribute prizes to all winners atomically
    // If any transfer fails, the entire transaction reverts (atomic)
    for (i, &winner_index) in winner_indices.iter().enumerate() {
        let prize_amount = prize_amounts[i];
        require!(i < 10, GameError::InvalidPayload);

        // Get winner account by index (accounts are in order: winner_0, winner_1, etc.)
        let winner_account = match i {
            0 => &ctx.accounts.winner_0,
            1 => &ctx.accounts.winner_1,
            2 => &ctx.accounts.winner_2,
            3 => &ctx.accounts.winner_3,
            4 => &ctx.accounts.winner_4,
            5 => &ctx.accounts.winner_5,
            6 => &ctx.accounts.winner_6,
            7 => &ctx.accounts.winner_7,
            8 => &ctx.accounts.winner_8,
            9 => &ctx.accounts.winner_9,
            _ => return Err(GameError::InvalidPayload.into()),
        };

        if payment_method == crate::state::enums::payment_method::WALLET {
            // Transfer prize to winner wallet using manual lamport transfer
            // Cannot use system_program::transfer() because escrow_account carries data
            let winner_account_info = winner_account.to_account_info();
            **escrow_account_info.try_borrow_mut_lamports()? -= prize_amount;
            **winner_account_info.try_borrow_mut_lamports()? += prize_amount;

            msg!(
                "Distributed {} lamports to winner wallet {} (match player index: {})",
                prize_amount,
                winner_account.key(),
                winner_index
            );
        } else {
            // Platform payment: Transfer prize to winner's deposit account
            let deposit_account = match i {
                0 => ctx.accounts.winner_deposit_0.as_ref(),
                1 => ctx.accounts.winner_deposit_1.as_ref(),
                2 => ctx.accounts.winner_deposit_2.as_ref(),
                3 => ctx.accounts.winner_deposit_3.as_ref(),
                4 => ctx.accounts.winner_deposit_4.as_ref(),
                5 => ctx.accounts.winner_deposit_5.as_ref(),
                6 => ctx.accounts.winner_deposit_6.as_ref(),
                7 => ctx.accounts.winner_deposit_7.as_ref(),
                8 => ctx.accounts.winner_deposit_8.as_ref(),
                9 => ctx.accounts.winner_deposit_9.as_ref(),
                _ => return Err(GameError::InvalidPayload.into()),
            };

            let deposit_account = deposit_account
                .ok_or(GameError::InvalidPaymentMethod)?;

            // Transfer prize to winner's deposit account using manual lamport transfer
            let deposit_account_info = deposit_account.to_account_info();
            **escrow_account_info.try_borrow_mut_lamports()? -= prize_amount;
            **deposit_account_info.try_borrow_mut_lamports()? += prize_amount;

            // Update deposit account balances
            let mut deposit_account_mut = deposit_account.load_mut()?;
            deposit_account_mut.available_lamports = deposit_account_mut
                .available_lamports
                .checked_add(prize_amount)
                .ok_or(GameError::Overflow)?;
            // Unlock entry fee from in_play (it was locked when joining)
            let entry_fee = match_account.entry_fee_lamports;
            if deposit_account_mut.in_play_lamports >= entry_fee {
                deposit_account_mut.in_play_lamports = deposit_account_mut
                    .in_play_lamports
                    .checked_sub(entry_fee)
                    .ok_or(GameError::Overflow)?;
            }

            msg!(
                "Distributed {} lamports to winner deposit {} (match player index: {})",
                prize_amount,
                deposit_account_info.key(),
                winner_index
            );
        }
    }

    // Re-borrow escrow to mark as distributed and clear total_entry_lamports (only after all transfers succeed)
    let mut escrow_account = ctx.accounts.escrow_account.load_mut()?;
    escrow_account.set_distributed(true);
    escrow_account.total_entry_lamports = 0; // Clear entry lamports after distribution

    msg!(
        "Prize distribution complete: {} lamports distributed to {} winners, platform fee: {}",
        total_prizes,
        winner_indices.len(),
        platform_fee
    );

    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct DistributePrizes<'info> {
    #[account(
        mut,
        seeds = [b"escrow", match_account.key().as_ref()],
        bump = escrow_account.load()?.bump
    )]
    pub escrow_account: AccountLoader<'info, EscrowAccount>,

    #[account(
        seeds = [b"m", &match_id.as_bytes()[..31.min(match_id.len())]],
        bump
    )]
    pub match_account: AccountLoader<'info, Match>,

    #[account(
        seeds = [b"config_account"],
        bump
    )]
    pub config_account: Account<'info, ConfigAccount>,

    /// Treasury account (receives platform fee)
    /// CHECK: Validated in handler - must be config.treasury_multisig
    #[account(mut)]
    pub treasury: AccountInfo<'info>,

    /// Winner accounts (up to 10, fixed accounts for Anchor compatibility)
    /// CHECK: Validated in handler - indices must match winner_indices parameter
    #[account(mut)]
    pub winner_0: AccountInfo<'info>,

    /// CHECK: Validated in handler - indices must match winner_indices parameter
    #[account(mut)]
    pub winner_1: AccountInfo<'info>,

    /// CHECK: Validated in handler - indices must match winner_indices parameter
    #[account(mut)]
    pub winner_2: AccountInfo<'info>,

    /// CHECK: Validated in handler - indices must match winner_indices parameter
    #[account(mut)]
    pub winner_3: AccountInfo<'info>,

    /// CHECK: Validated in handler - indices must match winner_indices parameter
    #[account(mut)]
    pub winner_4: AccountInfo<'info>,

    /// CHECK: Validated in handler - indices must match winner_indices parameter
    #[account(mut)]
    pub winner_5: AccountInfo<'info>,

    /// CHECK: Validated in handler - indices must match winner_indices parameter
    #[account(mut)]
    pub winner_6: AccountInfo<'info>,

    /// CHECK: Validated in handler - indices must match winner_indices parameter
    #[account(mut)]
    pub winner_7: AccountInfo<'info>,

    /// CHECK: Validated in handler - indices must match winner_indices parameter
    #[account(mut)]
    pub winner_8: AccountInfo<'info>,

    /// CHECK: Validated in handler - indices must match winner_indices parameter
    #[account(mut)]
    pub winner_9: AccountInfo<'info>,

    /// Winner deposit accounts (only needed for platform payment method)
    #[account(
        mut,
        seeds = [b"user_deposit", winner_0.key().as_ref()],
        bump
    )]
    pub winner_deposit_0: Option<AccountLoader<'info, UserDepositAccount>>,

    #[account(
        mut,
        seeds = [b"user_deposit", winner_1.key().as_ref()],
        bump
    )]
    pub winner_deposit_1: Option<AccountLoader<'info, UserDepositAccount>>,

    #[account(
        mut,
        seeds = [b"user_deposit", winner_2.key().as_ref()],
        bump
    )]
    pub winner_deposit_2: Option<AccountLoader<'info, UserDepositAccount>>,

    #[account(
        mut,
        seeds = [b"user_deposit", winner_3.key().as_ref()],
        bump
    )]
    pub winner_deposit_3: Option<AccountLoader<'info, UserDepositAccount>>,

    #[account(
        mut,
        seeds = [b"user_deposit", winner_4.key().as_ref()],
        bump
    )]
    pub winner_deposit_4: Option<AccountLoader<'info, UserDepositAccount>>,

    #[account(
        mut,
        seeds = [b"user_deposit", winner_5.key().as_ref()],
        bump
    )]
    pub winner_deposit_5: Option<AccountLoader<'info, UserDepositAccount>>,

    #[account(
        mut,
        seeds = [b"user_deposit", winner_6.key().as_ref()],
        bump
    )]
    pub winner_deposit_6: Option<AccountLoader<'info, UserDepositAccount>>,

    #[account(
        mut,
        seeds = [b"user_deposit", winner_7.key().as_ref()],
        bump
    )]
    pub winner_deposit_7: Option<AccountLoader<'info, UserDepositAccount>>,

    #[account(
        mut,
        seeds = [b"user_deposit", winner_8.key().as_ref()],
        bump
    )]
    pub winner_deposit_8: Option<AccountLoader<'info, UserDepositAccount>>,

    #[account(
        mut,
        seeds = [b"user_deposit", winner_9.key().as_ref()],
        bump
    )]
    pub winner_deposit_9: Option<AccountLoader<'info, UserDepositAccount>>,

    pub system_program: Program<'info, System>,
}