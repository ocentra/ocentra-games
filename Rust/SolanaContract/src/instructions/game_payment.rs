use anchor_lang::prelude::*;
use crate::state::{UserAccount, ConfigAccount};
use crate::error::GameError;

/// Records game payment (GP cost).
/// Per spec Section 20.1.3: Game payment flow.
/// Note: GP balance check happens off-chain in database. This instruction only updates stats.
/// Note: String params converted to fixed arrays immediately for performance.
pub fn handler(ctx: Context<StartGameWithGP>, match_id: String, user_id: String) -> Result<()> {
    // Convert String to fixed-size arrays immediately (optimization)
    let match_id_bytes = match_id.as_bytes();
    require!(
        match_id_bytes.len() == 36,
        GameError::InvalidPayload
    );
    
    let user_id_bytes = user_id.as_bytes();
    require!(
        user_id_bytes.len() <= 64,
        GameError::InvalidPayload
    );
    
    let user_account = &mut ctx.accounts.user_account;
    let _config = &ctx.accounts.config_account;
    
    // Update stats (GP balance deducted in database before calling this)
    user_account.games_played = user_account.games_played
        .checked_add(1)
        .ok_or(GameError::Overflow)?;
    
    // Update season stats
    let clock = Clock::get()?;
    let current_season_id = (clock.unix_timestamp / 604800) as u64; // 7 days in seconds
    
    // Reset season stats if new season
    if user_account.current_season_id != current_season_id {
        user_account.current_season_id = current_season_id;
        user_account.season_games = 1;
        user_account.season_wins = 0;
        user_account.season_score = 0;
    } else {
        user_account.season_games = user_account.season_games
            .checked_add(1)
            .ok_or(GameError::Overflow)?;
    }
    
    msg!("Game started: match_id={}, games_played={}", match_id, user_account.games_played);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String, user_id: String)]
pub struct StartGameWithGP<'info> {
    #[account(
        mut,
        seeds = [b"user_account", user_id.as_bytes()],
        bump
    )]
    pub user_account: Account<'info, UserAccount>,
    
    /// CHECK: Config account (read-only)
    #[account(
        seeds = [b"config_account"],
        bump
    )]
    pub config_account: Account<'info, ConfigAccount>,
    
    pub system_program: Program<'info, System>,
}

