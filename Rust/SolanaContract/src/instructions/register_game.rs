use anchor_lang::prelude::*;
use crate::state::{GameRegistry, GameDefinition};
use crate::error::GameError;

/// Registers a new game in the registry.
/// Per spec Section 16.5: Game registry system.
/// Admin-only instruction.
pub fn handler(
    ctx: Context<RegisterGame>,
    game_id: u8,
    name: String,
    min_players: u8,
    max_players: u8,
    rule_engine_url: String,
    version: u8,
) -> Result<()> {
    let registry = &mut ctx.accounts.registry;
    let clock = Clock::get()?;
    
    // Validate authority
    require!(
        ctx.accounts.authority.key() == registry.authority,
        GameError::Unauthorized
    );
    
    // Validate inputs
    require!(
        !name.is_empty() && name.len() <= 20,
        GameError::InvalidPayload
    );
    require!(
        !rule_engine_url.is_empty() && rule_engine_url.len() <= 200,
        GameError::InvalidPayload
    );
    require!(
        min_players > 0 && min_players <= max_players && max_players <= 10,
        GameError::InvalidPayload
    );
    
    // Convert String to fixed-size arrays (optimization)
    let name_bytes = name.as_bytes();
    let mut name_array = [0u8; 20];
    let name_copy_len = name_bytes.len().min(20);
    name_array[..name_copy_len].copy_from_slice(&name_bytes[..name_copy_len]);
    
    let url_bytes = rule_engine_url.as_bytes();
    let mut url_array = [0u8; 200];
    let url_copy_len = url_bytes.len().min(200);
    url_array[..url_copy_len].copy_from_slice(&url_bytes[..url_copy_len]);
    
    // Create game definition
    let game = GameDefinition {
        game_id,
        name: name_array,
        min_players,
        max_players,
        rule_engine_url: url_array,
        version,
        enabled: true,
    };
    
    // Add to registry
    registry.add_game(game)?;
    registry.last_updated = clock.unix_timestamp;
    
    msg!("Game registered: game_id={}, name={}", game_id, name);
    Ok(())
}

#[derive(Accounts)]
pub struct RegisterGame<'info> {
    #[account(
        mut,
        seeds = [b"game_registry"],
        bump
    )]
    pub registry: Account<'info, GameRegistry>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

