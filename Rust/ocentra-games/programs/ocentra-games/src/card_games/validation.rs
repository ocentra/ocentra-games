use crate::card_games::floor_card::FloorCard;
use crate::card_games::hand_management::HandManagement;
use crate::card_games::suit_declarations::SuitDeclarations;
use crate::common::validation_base::CommonValidation;
use crate::error::GameError;
use crate::state::Match;
use anchor_lang::prelude::*;

/// Card game validation helpers (no game-specific constants)
pub struct CardGameValidation;

impl CardGameValidation {
    /// Validate pick_up action (generic - no hardcoded hand size)
    pub fn validate_pick_up(
        match_account: &Match,
        player_index: usize,
        payload: &[u8],
        max_hand_size: u8, // Game-specific parameter
    ) -> Result<()> {
        // Common validations
        CommonValidation::validate_phase(match_account, 1)?; // Playing phase
        CommonValidation::validate_player_turn(match_account, player_index)?;
        FloorCard::validate_revealed(match_account)?;

        // Payload validation
        require!(payload.len() >= 32, GameError::InvalidPayload);

        let card_hash: [u8; 32] = payload[0..32]
            .try_into()
            .map_err(|_| GameError::InvalidPayload)?;

        // Card hash validation
        FloorCard::validate_card_hash(match_account, &card_hash)?;

        // Hand space validation (game-specific)
        HandManagement::validate_hand_space(match_account, player_index, max_hand_size)?;

        Ok(())
    }

    /// Validate decline action (generic)
    pub fn validate_decline(match_account: &Match, player_index: usize) -> Result<()> {
        CommonValidation::validate_phase(match_account, 1)?;
        CommonValidation::validate_player_turn(match_account, player_index)?;
        FloorCard::validate_revealed(match_account)?;
        Ok(())
    }

    /// Validate declare_intent action (generic)
    pub fn validate_declare_intent(
        match_account: &Match,
        player_index: usize,
        payload: &[u8],
    ) -> Result<()> {
        CommonValidation::validate_phase(match_account, 1)?;
        require!(payload.len() >= 1, GameError::InvalidPayload);

        let suit = payload[0];
        SuitDeclarations::validate_suit(suit)?;
        SuitDeclarations::validate_not_declared(match_account, player_index)?;
        SuitDeclarations::validate_suit_not_locked(match_account, suit)?;

        Ok(())
    }
}
