use crate::error::GameError;
use crate::state::{ConfigAccount, EscrowAccount, GameRegistry, Match, UserDepositAccount};
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<JoinMatch>, match_id: String, user_id: String) -> Result<()> {
    let mut match_account = ctx.accounts.match_account.load_mut()?;
    let registry = ctx.accounts.registry.load()?;

    // Security: Validate match_id matches
    let match_id_bytes = match_id.as_bytes();
    require!(
        match_id_bytes.len() == 36
            && match_id_bytes == &match_account.match_id[..match_id_bytes.len().min(36)],
        GameError::InvalidPayload
    );

    // Security: Validate player is signer
    require!(ctx.accounts.player.is_signer, GameError::Unauthorized);

    // Security: Check phase first (more specific error)
    require!(match_account.phase == 0, GameError::InvalidPhase);
    // Security: Validate match can accept players
    require!(match_account.can_join(&registry)?, GameError::MatchFull);

    // Convert user_id String to fixed-size array
    let user_id_bytes = user_id.as_bytes();
    require!(user_id_bytes.len() <= 64, GameError::InvalidPayload);
    let mut user_id_array = [0u8; 64];
    let copy_len = user_id_bytes.len().min(64);
    user_id_array[..copy_len].copy_from_slice(&user_id_bytes[..copy_len]);

    // Security: Check if player already joined (anti-cheat)
    require!(
        !match_account.has_player_id(&user_id_array),
        GameError::PlayerNotInMatch
    );

    // Security: Validate bounds before adding player
    let player_index = match_account.player_count as usize;
    let max_players = match_account.get_max_players(&registry)? as usize;
    require!(
        player_index < max_players && player_index < 10,
        GameError::MatchFull
    );

    // Phase 04: Handle payment for paid matches
    if match_account.is_paid_match() {
        let entry_fee = match_account.entry_fee_lamports;
        require!(entry_fee > 0, GameError::InvalidPayload);

        // Check if program is paused and validate KYC tier
        if let Some(config) = &ctx.accounts.config_account {
            require!(!config.is_paused, GameError::ProgramPaused);

            // TODO: KYC tier validation would require user's KYC tier from off-chain
            // For now, we just ensure the payment method is supported
            let match_payment_method = match_account.get_payment_method();
            require!(
                config.is_payment_method_supported(match_payment_method),
                GameError::InvalidPaymentMethod
            );
        }

        // Validate escrow account exists for paid matches
        let escrow_loader = ctx.accounts.escrow_account.as_ref()
            .ok_or(GameError::InvalidPayload)?;
        
        // Scope escrow validation to release borrow before payment transfers
        {
            let escrow_account = escrow_loader.load()?;
            // Validate escrow belongs to this match
            require!(
                escrow_account.match_pda == ctx.accounts.match_account.key(),
                GameError::InvalidPayload
            );
        } // Borrow released here

        // Phase 04: Payment method validation
        // All players in a match MUST use the same payment method
        let match_payment_method = match_account.get_payment_method();
        
        // Handle payment based on match's payment method
        if match_payment_method == crate::state::enums::payment_method::WALLET {
            // Wallet payment: CPI transfer from player wallet → escrow PDA
            // For wallet payment, player signer IS the wallet
            let player_wallet = ctx.accounts.player_wallet.as_ref()
                .ok_or(GameError::InvalidPayload)?;
            require!(
                ctx.accounts.player.key() == player_wallet.key(),
                GameError::InvalidPayload
            );

            let cpi_accounts = anchor_lang::system_program::Transfer {
                from: player_wallet.to_account_info(),
                to: escrow_loader.to_account_info(),
            };
            let cpi_program = ctx.accounts.system_program.to_account_info();
            let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
            anchor_lang::system_program::transfer(cpi_ctx, entry_fee)?;

            msg!("Player {} paid {} lamports from wallet to escrow", user_id, entry_fee);
        } else if match_payment_method == crate::state::enums::payment_method::PLATFORM {
            // Platform payment: Deduct from UserDepositAccount → escrow
            let user_deposit_loader = ctx.accounts.user_deposit_account.as_ref()
                .ok_or(GameError::InvalidPayload)?;
            
            // Scope validation to release borrow before lamport transfers
            let (available_lamports, in_play_lamports) = {
                let user_deposit_account = user_deposit_loader.load()?;
                
                // Validate authority
                require!(
                    user_deposit_account.authority == ctx.accounts.player.key(),
                    GameError::Unauthorized
                );

                // Validate sufficient balance (available + in_play)
                let total_balance = user_deposit_account.available_lamports
                    .checked_add(user_deposit_account.in_play_lamports)
                    .ok_or(GameError::Overflow)?;
                require!(
                    total_balance >= entry_fee,
                    GameError::InsufficientFunds
                );

                (user_deposit_account.available_lamports, user_deposit_account.in_play_lamports)
            }; // Borrow released here

            // Transfer lamports from UserDepositAccount PDA to escrow PDA
            // Manual lamport manipulation (same pattern as withdraw_sol)
            **escrow_loader.to_account_info().try_borrow_mut_lamports()? += entry_fee;
            **user_deposit_loader.to_account_info().try_borrow_mut_lamports()? -= entry_fee;

            // Re-borrow to update account balances:
            // 1. Deduct from available first (if available), then from in_play
            // 2. Add to in_play to lock the entry fee (prevents withdrawal during match)
            let mut user_deposit_account = user_deposit_loader.load_mut()?;
            if available_lamports >= entry_fee {
                user_deposit_account.available_lamports = available_lamports
                    .checked_sub(entry_fee)
                    .ok_or(GameError::Overflow)?;
            } else {
                let remaining = entry_fee
                    .checked_sub(available_lamports)
                    .ok_or(GameError::Overflow)?;
                user_deposit_account.available_lamports = 0;
                // Deduct from in_play (this was already locked, now it's moved to escrow)
                user_deposit_account.in_play_lamports = in_play_lamports
                    .checked_sub(remaining)
                    .ok_or(GameError::Overflow)?;
            }

            // Lock the entry fee in in_play_lamports (prevents withdrawal during match)
            user_deposit_account.in_play_lamports = user_deposit_account.in_play_lamports
                .checked_add(entry_fee)
                .ok_or(GameError::Overflow)?;

            msg!("Player {} paid {} lamports from platform deposit to escrow", user_id, entry_fee);
        } else {
            return Err(GameError::InvalidPaymentMethod.into());
        }

        // Re-borrow escrow account to update it after payment transfers
        {
            let mut escrow_account = escrow_loader.load_mut()?;
            
            // Update escrow account with player stake
            escrow_account.set_player_stake(player_index, entry_fee);
            escrow_account.total_entry_lamports = escrow_account
                .total_entry_lamports
                .checked_add(entry_fee)
                .ok_or(GameError::Overflow)?;
            
            msg!(
                "Escrow updated: player_index={}, stake={}, total_entry={}",
                player_index,
                entry_fee,
                escrow_account.total_entry_lamports
            );
        } // Explicitly drop borrow here
    }

    // Add player to match (only after payment succeeds)
    match_account.set_player_id(player_index, user_id_array);
    let new_player_count = match_account.player_count + 1;
    match_account.player_count = new_player_count;

    // Check if escrow is fully funded (all players have paid) - AFTER incrementing player_count
    if match_account.is_paid_match() {
        let entry_fee = match_account.entry_fee_lamports;
        let escrow_loader = ctx.accounts.escrow_account.as_ref()
            .ok_or(GameError::InvalidPayload)?;
        let mut escrow_account = escrow_loader.load_mut()?;
        
        // Check if escrow is fully funded based on actual player count
        // Only mark as funded if we've reached minimum players AND all have paid
        let min_players = match_account.get_min_players(&registry)?;
        let expected_total = entry_fee
            .checked_mul(new_player_count as u64)
            .ok_or(GameError::Overflow)?;
        
        msg!(
            "Escrow funding check: player_count={}, min_players={}, total_entry={}, expected={}",
            new_player_count,
            min_players,
            escrow_account.total_entry_lamports,
            expected_total
        );
        
        // Mark as funded if: (1) we have minimum players, (2) all current players have paid
        if new_player_count >= min_players 
            && escrow_account.total_entry_lamports == expected_total {
            escrow_account.set_funded(true);
            msg!(
                "Escrow marked as funded: player_count={}, min_players={}, total_entry={}, expected={}",
                new_player_count,
                min_players,
                escrow_account.total_entry_lamports,
                expected_total
            );
        } else {
            msg!(
                "Escrow NOT funded: player_count={}, min_players={}, total_entry={}, expected={}, condition_met={}",
                new_player_count,
                min_players,
                escrow_account.total_entry_lamports,
                expected_total,
                new_player_count >= min_players && escrow_account.total_entry_lamports == expected_total
            );
        }
    }

    // Check if all players joined (optimization: cache this check)
    if match_account.player_count >= match_account.get_max_players(&registry)? {
        match_account.set_all_players_joined(true);
    }

    let max_players = match_account.get_max_players(&registry)?;
    msg!(
        "Player {} joined match {} ({} of {})",
        user_id,
        match_id,
        match_account.player_count,
        max_players
    );
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct JoinMatch<'info> {
    #[account(
        mut,
        seeds = [b"m", &match_id.as_bytes()[..31.min(match_id.len())]],
        bump
    )]
    pub match_account: AccountLoader<'info, Match>,

    #[account(
        seeds = [b"game_registry"],
        bump
    )]
    pub registry: AccountLoader<'info, GameRegistry>,

    /// Escrow account (only required for paid matches)
    /// CHECK: Validated in handler - only required if match is paid
    #[account(
        mut,
        seeds = [b"escrow", match_account.key().as_ref()],
        bump
    )]
    pub escrow_account: Option<AccountLoader<'info, EscrowAccount>>,

    /// User deposit account (only required for platform payment method)
    /// CHECK: Validated in handler - only required if payment_method == PLATFORM
    #[account(
        mut,
        seeds = [b"user_deposit", player.key().as_ref()],
        bump
    )]
    pub user_deposit_account: Option<AccountLoader<'info, UserDepositAccount>>,

    /// Player wallet (only required for wallet payment method)
    /// CHECK: Validated in handler - only required if payment_method == WALLET
    #[account(mut)]
    pub player_wallet: Option<AccountInfo<'info>>,

    /// Config account (optional - only needed for paid matches to check is_paused and KYC)
    #[account(
        seeds = [b"config_account"],
        bump
    )]
    pub config_account: Option<Account<'info, ConfigAccount>>,

    pub player: Signer<'info>,

    pub system_program: Program<'info, System>,
}
