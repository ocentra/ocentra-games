use crate::error::GameError;
use crate::state::SignerRegistry;
use anchor_lang::prelude::*;

pub fn handler(ctx: Context<RegisterSigner>, pubkey: Pubkey, role: u8) -> Result<()> {
    let mut registry = ctx.accounts.registry.load_mut()?;

    // Initialize registry if it doesn't exist (check if authority is default/unset)
    if registry.authority == Pubkey::default() {
        registry.authority = ctx.accounts.authority.key();
        registry.signers = [Pubkey::default(); 100];
        registry.roles = [0u8; 100];
        registry.signer_count = 0;
    }

    // Only authority can register signers
    require!(
        ctx.accounts.authority.key() == registry.authority,
        GameError::Unauthorized
    );

    // Validate role (0=Coordinator, 1=Validator, 2=Authority)
    require!(role <= 2, GameError::InvalidAction);

    registry.add_signer(pubkey, role)?;

    msg!("Signer registered: {} with role {}", pubkey, role);
    Ok(())
}

#[derive(Accounts)]
pub struct RegisterSigner<'info> {
    #[account(
        init_if_needed,
        payer = authority,
        space = SignerRegistry::MAX_SIZE,
        seeds = [b"signer_registry"],
        bump
    )]
    pub registry: AccountLoader<'info, SignerRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
