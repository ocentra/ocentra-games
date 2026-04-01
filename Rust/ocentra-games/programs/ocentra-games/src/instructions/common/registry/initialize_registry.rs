use crate::state::{GameDefinition, GameRegistry};
use anchor_lang::prelude::*;

/// Initializes the GameRegistry account.
/// Per spec Section 16.5: Game registry initialization.
/// Must be called once before registering any games.
pub fn handler(ctx: Context<InitializeRegistry>) -> Result<()> {
    let mut registry = ctx.accounts.registry.load_init()?;
    let clock = Clock::get()?;

    // Initialize registry
    registry.authority = ctx.accounts.authority.key();
    registry.game_count = 0;
    registry.games = [GameDefinition {
        game_id: 0,
        name: [0u8; 20],
        min_players: 0,
        max_players: 0,
        rule_engine_url: [0u8; 200],
        version: 0,
        enabled: 0,
        _padding: [0; 6],
    }; 20];
    registry._padding1 = [0; 7];
    registry._padding2 = [0; 4];
    registry.last_updated = clock.unix_timestamp;

    msg!("GameRegistry initialized");
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    #[account(
        init,
        payer = authority,
        space = GameRegistry::MAX_SIZE,
        seeds = [b"game_registry"],
        bump
    )]
    pub registry: AccountLoader<'info, GameRegistry>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
