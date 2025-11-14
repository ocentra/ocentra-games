use anchor_lang::prelude::*;
use crate::state::Match;
use crate::error::GameError;

pub fn handler(ctx: Context<JoinMatch>, match_id: String, user_id: String) -> Result<()> {
    let match_account = &mut ctx.accounts.match_account;
    
    // Security: Validate match_id matches
    let match_id_bytes = match_id.as_bytes();
    require!(
        match_id_bytes.len() == 36 && 
        match_id_bytes == &match_account.match_id[..match_id_bytes.len().min(36)],
        GameError::InvalidPayload
    );

    // Security: Validate player is signer
    require!(
        ctx.accounts.player.is_signer,
        GameError::Unauthorized
    );

    // Security: Validate match can accept players
    require!(match_account.can_join(), GameError::MatchFull);
    require!(match_account.phase == 0, GameError::InvalidPhase);

    // Convert user_id String to fixed-size array
    let user_id_bytes = user_id.as_bytes();
    require!(
        user_id_bytes.len() <= 64,
        GameError::InvalidPayload
    );
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
    let max_players = match_account.get_max_players() as usize;
    require!(
        player_index < max_players && player_index < 10,
        GameError::MatchFull
    );
    
    // Add player to match
    match_account.set_player_id(player_index, user_id_array);
    match_account.player_count += 1;

    // Check if all players joined (optimization: cache this check)
    if match_account.player_count >= match_account.get_max_players() {
        match_account.set_all_players_joined(true);
    }

    let max_players = match_account.get_max_players();
    msg!("Player {} joined match {} ({} of {})", user_id, match_id, match_account.player_count, max_players);
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct JoinMatch<'info> {
    #[account(
        mut,
        seeds = [b"match", match_id.as_bytes()],
        bump
    )]
    pub match_account: Account<'info, Match>,
    
    pub player: Signer<'info>,
}

