use anchor_lang::prelude::*;
use crate::state::{GameRegistry, GameDefinition};
use crate::error::GameError;

/// Updates an existing game in the registry.
/// Per spec Section 16.5: Game registry system - versioning support.
/// Admin-only instruction.
pub fn handler(
    ctx: Context<UpdateGame>,
    game_id: u8,
    name: Option<String>,
    min_players: Option<u8>,
    max_players: Option<u8>,
    rule_engine_url: Option<String>,
    version: Option<u8>,
    enabled: Option<bool>,
) -> Result<()> {
    let registry = &mut ctx.accounts.registry;
    let clock = Clock::get()?;
    
    // Validate authority
    require!(
        ctx.accounts.authority.key() == registry.authority,
        GameError::Unauthorized
    );
    
    // Get existing game
    let existing_game = registry.find_game(game_id)
        .ok_or(GameError::InvalidPayload)?;
    
    // Create updated game definition
    let mut updated_game = existing_game.clone();
    
    // Update fields if provided
    if let Some(name_str) = name {
        require!(
            !name_str.is_empty() && name_str.len() <= 20,
            GameError::InvalidPayload
        );
        let name_bytes = name_str.as_bytes();
        let name_copy_len = name_bytes.len().min(20);
        updated_game.name[..name_copy_len].copy_from_slice(&name_bytes[..name_copy_len]);
        // Clear remaining bytes
        for i in name_copy_len..20 {
            updated_game.name[i] = 0;
        }
    }
    
    if let Some(min) = min_players {
        require!(
            min > 0 && min <= updated_game.max_players,
            GameError::InvalidPayload
        );
        updated_game.min_players = min;
    }
    
    if let Some(max) = max_players {
        require!(
            max >= updated_game.min_players && max <= 10,
            GameError::InvalidPayload
        );
        updated_game.max_players = max;
    }
    
    if let Some(url_str) = rule_engine_url {
        require!(
            !url_str.is_empty() && url_str.len() <= 200,
            GameError::InvalidPayload
        );
        let url_bytes = url_str.as_bytes();
        let url_copy_len = url_bytes.len().min(200);
        updated_game.rule_engine_url[..url_copy_len].copy_from_slice(&url_bytes[..url_copy_len]);
        // Clear remaining bytes
        for i in url_copy_len..200 {
            updated_game.rule_engine_url[i] = 0;
        }
    }
    
    if let Some(ver) = version {
        updated_game.version = ver;
    }
    
    if let Some(en) = enabled {
        updated_game.enabled = en;
    }
    
    // Update in registry
    registry.update_game(game_id, updated_game)?;
    registry.last_updated = clock.unix_timestamp;
    
    msg!("Game updated: game_id={}", game_id);
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateGame<'info> {
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

