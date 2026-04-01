use crate::card_games::validation::CardGameValidation;
use crate::common::validation_base::CommonValidation;
use crate::error::GameError;
use crate::games::claim::rules::ClaimRules;
use crate::state::Match;
use anchor_lang::prelude::*;

/// CLAIM-specific validation logic
pub fn validate_claim_action(
    match_account: &Match,
    player_index: usize,
    action_type: u8,
    payload: &[u8],
) -> Result<()> {
    match action_type {
        0 => {
            // Pick up: use card game validation with CLAIM's max hand size
            CardGameValidation::validate_pick_up(
                match_account,
                player_index,
                payload,
                ClaimRules::MAX_HAND_SIZE,
            )
        }
        1 => {
            // Decline: generic card game validation
            CardGameValidation::validate_decline(match_account, player_index)
        }
        2 => {
            // Declare intent: generic card game validation
            CardGameValidation::validate_declare_intent(match_account, player_index, payload)
        }
        3 => {
            // Call showdown: CLAIM-specific
            validate_call_showdown(match_account, player_index)
        }
        4 => {
            // Rebuttal: CLAIM-specific (3-card run)
            validate_rebuttal(match_account, player_index, payload)
        }
        5 => {
            // Reveal floor card: allow any player to reveal floor card when none exists
            // This is needed for game flow - floor card must be revealed before pick_up/decline
            validate_reveal_floor_card(match_account, player_index, payload)
        }
        _ => Err(GameError::InvalidAction.into()),
    }
}

fn validate_call_showdown(match_account: &Match, player_index: usize) -> Result<()> {
    CommonValidation::validate_phase(match_account, 1)?;

    // Player must have declared intent to call showdown
    require!(
        match_account.has_declared_suit(player_index),
        GameError::InvalidAction
    );
    Ok(())
}

fn validate_rebuttal(match_account: &Match, player_index: usize, payload: &[u8]) -> Result<()> {
    CommonValidation::validate_phase(match_account, 1)?;

    // Player must be undeclared to rebuttal
    require!(
        !match_account.has_declared_suit(player_index),
        GameError::InvalidAction
    );

    // Payload must contain exactly 3 cards (each card is suit + value = 2 bytes)
    require!(payload.len() >= 6, GameError::InvalidPayload);

    // Validate cards form a valid 3-card run
    let cards = [
        (payload[0], payload[1]),
        (payload[2], payload[3]),
        (payload[4], payload[5]),
    ];

    require!(is_valid_run(cards), GameError::InvalidPayload);

    // Note: Full rebuttal validation (higher than previous declaration)
    // would require full hand state - validated off-chain

    // Note: Card hash validation for rebuttal would be done here
    // For now, card hash validation is handled off-chain

    Ok(())
}

fn validate_reveal_floor_card(
    match_account: &Match,
    _player_index: usize,
    payload: &[u8],
) -> Result<()> {
    // Must be in playing phase
    CommonValidation::validate_phase(match_account, 1)?;

    // Cannot reveal floor card if one already exists
    require!(
        !match_account.floor_card_revealed(),
        GameError::InvalidPhase // Floor card already revealed
    );

    // Payload must contain floor card hash (32 bytes)
    require!(payload.len() >= 32, GameError::InvalidPayload);

    Ok(())
}

fn is_valid_run(cards: [(u8, u8); 3]) -> bool {
    // All cards must be same suit
    if cards[0].0 != cards[1].0 || cards[1].0 != cards[2].0 {
        return false;
    }

    // Sort by value
    let mut values = [cards[0].1, cards[1].1, cards[2].1];
    values.sort();

    // Check for normal consecutive sequence
    if values[1] == values[0] + 1 && values[2] == values[1] + 1 {
        return true;
    }

    // Check for A-K-2 wraparound (values 14, 13, 2) - CLAIM-specific
    if values[0] == 2 && values[1] == 13 && values[2] == 14 {
        return true;
    }

    false
}
