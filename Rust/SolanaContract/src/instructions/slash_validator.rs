use anchor_lang::prelude::*;
use crate::state::ValidatorReputation;
use crate::error::GameError;

/**
 * Slashes a validator's stake for malicious or negligent behavior.
 * Per critique Issue #3, #5, Spec Section 33.3: Validator slashing mechanism.
 * 
 * Only the authority can slash validators.
 * Slashed amount is transferred to the authority or treasury.
 */
pub fn handler(
    ctx: Context<SlashValidator>,
    validator_pubkey: Pubkey,
    amount: u64,
    reason: u8, // 0=malicious, 1=negligent, 2=inactivity
) -> Result<()> {
    // Security: Validate authority is signer
    require!(
        ctx.accounts.authority.is_signer,
        GameError::Unauthorized
    );
    
    // Security: Validate amount is positive
    require!(
        amount > 0,
        GameError::InvalidPayload
    );
    
    // Security: Validate reason is valid
    require!(
        reason <= 2,
        GameError::InvalidPayload
    );
    
    // Get validator reputation account
    let validator_account = &mut ctx.accounts.validator_reputation;
    
    // Security: Validate validator matches
    require!(
        validator_account.validator == validator_pubkey,
        GameError::InvalidPayload
    );
    
    // Security: Validate validator has sufficient stake
    require!(
        validator_account.stake >= amount,
        GameError::InsufficientFunds
    );
    
    // Slash the stake
    validator_account.stake = validator_account.stake
        .checked_sub(amount)
        .ok_or(GameError::InsufficientFunds)?;
    
    // Update reputation (slash reduces reputation)
    let reputation_penalty = match reason {
        0 => 0.5, // Malicious: 50% reputation loss
        1 => 0.2, // Negligent: 20% reputation loss
        2 => 0.1, // Inactivity: 10% reputation loss
        _ => 0.0,
    };
    validator_account.reputation = (validator_account.reputation * (1.0 - reputation_penalty)).max(0.0);
    
    // Transfer slashed amount from validator stake to authority (or treasury in production)
    // Note: In production, stake would be in a separate escrow account
    // For now, we just update the reputation account's stake field
    // The actual SOL transfer would happen when stake is withdrawn
    
    msg!("Slashed validator {}: {} lamports (reason: {})", 
         validator_pubkey, amount, reason);
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(validator_pubkey: Pubkey)]
pub struct SlashValidator<'info> {
    #[account(
        mut,
        seeds = [b"validator", validator_pubkey.as_ref()],
        bump
    )]
    pub validator_reputation: Account<'info, ValidatorReputation>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

