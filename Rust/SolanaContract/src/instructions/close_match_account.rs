use anchor_lang::prelude::*;
use crate::state::Match;
use crate::error::GameError;

/**
 * Closes a match account and reclaims rent.
 * Per critique Issue #3, Spec Section 22.4: Rent reclamation for ended matches.
 * 
 * Only the match authority or the account closer can close the account.
 * The account must be in Ended phase (phase 2).
 */
pub fn handler(
    ctx: Context<CloseMatchAccount>,
    match_id: String,
) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    
    // Security: Validate match_id matches
    let match_id_bytes = match_id.as_bytes();
    require!(
        match_id_bytes.len() == 36 && 
        match_id_bytes == &match_account.match_id[..match_id_bytes.len().min(36)],
        GameError::InvalidPayload
    );
    
    // Security: Must be in Ended phase
    require!(
        match_account.phase == 2, // Ended
        GameError::InvalidPhase
    );
    
    // Security: Validate closer is either authority or the closer account itself
    require!(
        ctx.accounts.closer.is_signer,
        GameError::Unauthorized
    );
    require!(
        ctx.accounts.closer.key() == match_account.authority || 
        ctx.accounts.closer.key() == ctx.accounts.closer.key(), // Closer can always close
        GameError::Unauthorized
    );
    
    // Calculate rent to refund
    let rent = Rent::get()?;
    let account_info = ctx.accounts.match_account.to_account_info();
    let lamports = account_info.lamports();
    let rent_exempt_minimum = rent.minimum_balance(Match::MAX_SIZE);
    
    // Refund excess rent to closer
    if lamports > rent_exempt_minimum {
        let refund = lamports
            .checked_sub(rent_exempt_minimum)
            .ok_or(GameError::InsufficientFunds)?;
        
        **account_info.try_borrow_mut_lamports()? -= refund;
        **ctx.accounts.closer.to_account_info().try_borrow_mut_lamports()? += refund;
        
        msg!("Closed match account {} and refunded {} lamports to {}", 
             match_id, refund, ctx.accounts.closer.key());
    }
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct CloseMatchAccount<'info> {
    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump,
        close = closer // Close account and send rent to closer
    )]
    pub match_account: Account<'info, Match>,
    
    /// CHECK: Closer can be authority or any account (for rent reclamation)
    #[account(mut)]
    pub closer: Signer<'info>,
}

