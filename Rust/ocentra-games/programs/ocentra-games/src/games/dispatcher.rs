use crate::error::GameError;
use crate::games::claim::actions::apply_claim_action;
use crate::games::claim::rules::ClaimRules;
use crate::games::claim::validation::validate_claim_action;
use crate::state::Match;
use anchor_lang::prelude::*;

/// Validate action using appropriate game rules (static dispatch - no trait objects for Solana)
pub fn validate_move(
    match_account: &Match,
    player_index: usize,
    action_type: u8,
    payload: &[u8],
) -> Result<()> {
    // Validate action type bounds based on game
    match match_account.game_type {
        0 => {
            // CLAIM game
            if action_type > ClaimRules::MAX_ACTION_TYPE {
                return Err(GameError::InvalidAction.into());
            }
            validate_claim_action(match_account, player_index, action_type, payload)
        }
        // Future games:
        // 1 => validate_poker_action(...),
        _ => Err(GameError::InvalidPayload.into()),
    }
}

/// Apply action state updates using appropriate game rules (static dispatch)
/// `advance_turn`: if true, advance turn after turn-based actions (for single moves)
///                 if false, don't advance turn (for batch moves - turn advances once at end)
pub fn apply_action_state(
    match_account: &mut Match,
    player_index: usize,
    action_type: u8,
    payload: &[u8],
    advance_turn: bool,
) -> Result<()> {
    match match_account.game_type {
        0 => {
            // CLAIM game
            apply_claim_action(
                match_account,
                player_index,
                action_type,
                payload,
                advance_turn,
            )
        }
        // Future games:
        // 1 => apply_poker_action(..., advance_turn),
        _ => Err(GameError::InvalidPayload.into()),
    }
}
