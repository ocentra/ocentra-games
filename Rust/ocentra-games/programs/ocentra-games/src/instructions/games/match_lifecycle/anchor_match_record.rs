use crate::error::GameError;
use crate::state::Match;
use anchor_lang::prelude::*;

pub fn handler(
    ctx: Context<AnchorMatchRecord>,
    match_id: String,
    match_hash: [u8; 32],
    hot_url: Option<String>,
) -> Result<()> {
    let mut match_account = ctx.accounts.match_account.load_mut()?;

    // Security: Validate match_id matches
    let match_id_bytes = match_id.as_bytes();
    require!(
        match_id_bytes.len() == 36
            && match_id_bytes == &match_account.match_id[..match_id_bytes.len().min(36)],
        GameError::InvalidPayload
    );

    // Security: Validate authority is signer and matches
    require!(ctx.accounts.authority.is_signer, GameError::Unauthorized);
    require!(
        ctx.accounts.authority.key() == match_account.authority,
        GameError::Unauthorized
    );

    // Security: Match must be ended
    require!(match_account.phase == 2, GameError::InvalidPhase);

    // Security: Validate match_hash is not all zeros
    require!(
        match_hash.iter().any(|&b| b != 0),
        GameError::InvalidPayload
    );

    // Update match hash and hot_url
    match_account.match_hash = match_hash;

    // Security: Validate and set hot_url if provided
    if let Some(url) = hot_url {
        require!(url.len() <= 200, GameError::InvalidPayload);
        let url_bytes = url.as_bytes();
        let mut url_array = [0u8; 200];
        let copy_len = url_bytes.len().min(200);
        url_array[..copy_len].copy_from_slice(&url_bytes[..copy_len]);
        match_account.hot_url = url_array;
    }

    msg!(
        "Match record anchored: {} with hash {:?}",
        match_id,
        match_hash
    );
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String)]
pub struct AnchorMatchRecord<'info> {
    #[account(
        mut,
        seeds = [b"m", &match_id.as_bytes()[..31.min(match_id.len())]],
        bump
    )]
    pub match_account: AccountLoader<'info, Match>,

    pub authority: Signer<'info>,
}
