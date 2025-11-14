use anchor_lang::prelude::*;
use crate::state::{SignerRegistry, SignerRole};
use crate::error::GameError;

pub fn handler(
    ctx: Context<RegisterSigner>,
    pubkey: Pubkey,
    role: u8,
) -> Result<()> {
    let registry = &mut ctx.accounts.registry;
    
    // Initialize registry if it doesn't exist (check if authority is default/unset)
    if registry.authority == Pubkey::default() {
        registry.authority = ctx.accounts.authority.key();
        registry.signers = Vec::new();
        registry.roles = Vec::new();
    }
    
    // Only authority can register signers
    require!(
        ctx.accounts.authority.key() == registry.authority,
        GameError::Unauthorized
    );

    // Convert u8 to SignerRole
    let signer_role = match role {
        0 => SignerRole::Coordinator,
        1 => SignerRole::Validator,
        2 => SignerRole::Authority,
        _ => return Err(GameError::InvalidAction.into()),
    };

    registry.add_signer(pubkey, signer_role)?;

    msg!("Signer registered: {} with role {:?}", pubkey, signer_role);
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
    pub registry: Account<'info, SignerRegistry>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

