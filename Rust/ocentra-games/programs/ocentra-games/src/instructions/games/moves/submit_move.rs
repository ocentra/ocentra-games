use crate::common::{replay_protection::ReplayProtection, validation_base::CommonValidation};
use crate::error::GameError;
use crate::games::{apply_action_state, validate_move as validate_game_move};
use crate::state::{GameRegistry, Match, Move};
use anchor_lang::prelude::*;

pub fn handler(
    ctx: Context<SubmitMove>,
    match_id: String,
    user_id: String, // Firebase UID (per spec: use user IDs, not Pubkeys)
    action_type: u8,
    payload: Vec<u8>,
    nonce: u64, // Per critique: nonce for replay protection
) -> Result<()> {
    let mut match_account = ctx.accounts.match_account.load_mut()?;
    let registry = ctx.accounts.registry.load()?;
    let move_account = &mut ctx.accounts.move_account;
    let clock = Clock::get()?;

    // Security: Validate player is signer
    require!(ctx.accounts.player.is_signer, GameError::Unauthorized);

    // Security: Validate match_id matches
    let match_id_bytes = match_id.as_bytes();
    require!(
        match_id_bytes.len() == 36
            && match_id_bytes == &match_account.match_id[..match_id_bytes.len().min(36)],
        GameError::InvalidPayload
    );

    // Common validations (applies to all games)
    CommonValidation::validate_not_ended(&*match_account)?;
    CommonValidation::validate_phase(&*match_account, 1)?; // Playing phase
    require!(
        match_account.has_minimum_players(&registry)?,
        GameError::InsufficientPlayers
    );
    CommonValidation::validate_payload_size(&payload, 128)?;
    CommonValidation::validate_user_id(&user_id)?;

    // Convert user_id String to fixed-size array
    let user_id_bytes = user_id.as_bytes();
    let mut user_id_array = [0u8; 64];
    let copy_len = user_id_bytes.len().min(64);
    user_id_array[..copy_len].copy_from_slice(&user_id_bytes[..copy_len]);

    // Validate player is in match (find by user_id)
    let player_index = match_account
        .find_player_index(&user_id_array)
        .ok_or(GameError::PlayerNotInMatch)?;
    CommonValidation::validate_player_in_match(&*match_account, player_index)?;

    // Turn validation: Only required for turn-based actions (pick_up=0, decline=1)
    // Other actions (declare_intent=2, call_showdown=3, rebuttal=4) don't require turn validation
    // This is handled in game-specific validation

    // Timestamp validation (replay protection)
    let move_timestamp = clock.unix_timestamp;
    ReplayProtection::validate_timestamp(&*match_account, move_timestamp)?;

    // Nonce validation (replay protection)
    ReplayProtection::validate_nonce(&*match_account, player_index, nonce)?;

    // Security: If move account already exists, it's a replay attack (same nonce = same PDA)
    if move_account.player != Pubkey::default() {
        require!(false, GameError::InvalidNonce);
    }

    // Update last nonce for this player
    match_account.set_last_nonce(player_index, nonce);

    // Game-specific validation (delegates to appropriate game rules)
    // This includes turn validation for turn-based actions only
    validate_game_move(&*match_account, player_index, action_type, &payload)?;

    // Convert match_id to fixed-size array
    let mut match_id_array = [0u8; 36];
    let copy_len = match_id_bytes.len().min(36);
    match_id_array[..copy_len].copy_from_slice(&match_id_bytes[..copy_len]);

    // Create move account with optimized struct
    move_account.match_id = match_id_array;
    move_account.player = ctx.accounts.player.key();
    move_account.move_index = match_account.move_count as u16;
    move_account.action_type = action_type;
    move_account.set_payload(&payload)?; // Uses fixed-size array
    move_account.timestamp = clock.unix_timestamp as u32; // Convert i64 to u32

    // Apply game-specific action state updates (delegates to appropriate game rules)
    // advance_turn = true for single moves
    apply_action_state(
        &mut match_account,
        player_index,
        action_type,
        &payload,
        true,
    )?;

    // Update ended_at timestamp if match ended
    if match_account.phase == 2 && match_account.ended_at == 0 {
        match_account.ended_at = clock.unix_timestamp;
    }

    match_account.move_count = match_account.move_count.saturating_add(1);

    msg!(
        "Move submitted: player {}, action {}, match {}",
        ctx.accounts.player.key(),
        action_type,
        match_id
    );
    Ok(())
}

#[derive(Accounts)]
#[instruction(match_id: String, user_id: String, action_type: u8, payload: Vec<u8>, nonce: u64)]
pub struct SubmitMove<'info> {
    #[account(
        mut,
        seeds = [b"m", &match_id.as_bytes()[..31.min(match_id.len())]],
        bump
    )]
    pub match_account: AccountLoader<'info, Match>,

    #[account(
        seeds = [b"game_registry"],
        bump
    )]
    pub registry: AccountLoader<'info, GameRegistry>,

    #[account(
        init_if_needed,
        payer = player,
        space = Move::MAX_SIZE,
        seeds = [
            b"move",
            &match_id.as_bytes()[..32.min(match_id.len())],
            &match_id.as_bytes()[32.min(match_id.len())..],
            player.key().as_ref(),
            &nonce.to_le_bytes()
        ],
        bump
    )]
    pub move_account: Account<'info, Move>,

    #[account(mut)]
    pub player: Signer<'info>,
    pub system_program: Program<'info, System>,
}
