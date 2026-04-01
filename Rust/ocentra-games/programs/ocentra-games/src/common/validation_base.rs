use crate::error::GameError;
use crate::state::Match;
use anchor_lang::prelude::*;

/// Common validation logic that applies to all games
pub struct CommonValidation;

impl CommonValidation {
    /// Validate match is in correct phase
    pub fn validate_phase(match_account: &Match, required_phase: u8) -> Result<()> {
        require!(
            match_account.phase == required_phase,
            GameError::InvalidPhase
        );
        Ok(())
    }

    /// Validate match is not ended
    pub fn validate_not_ended(match_account: &Match) -> Result<()> {
        require!(!match_account.is_ended(), GameError::MatchAlreadyEnded);
        Ok(())
    }

    /// Validate it's the player's turn
    pub fn validate_player_turn(match_account: &Match, player_index: usize) -> Result<()> {
        require!(
            match_account.current_player == player_index as u8,
            GameError::NotPlayerTurn
        );
        Ok(())
    }

    /// Validate player is in match
    pub fn validate_player_in_match(match_account: &Match, player_index: usize) -> Result<()> {
        require!(
            player_index < match_account.player_count as usize,
            GameError::PlayerNotInMatch
        );
        Ok(())
    }

    /// Validate action type is within bounds
    pub fn validate_action_type(action_type: u8, max_action: u8) -> Result<()> {
        require!(action_type <= max_action, GameError::InvalidAction);
        Ok(())
    }

    /// Validate payload size
    pub fn validate_payload_size(payload: &[u8], max_size: usize) -> Result<()> {
        require!(payload.len() <= max_size, GameError::InvalidPayload);
        Ok(())
    }

    /// Validate user_id length
    pub fn validate_user_id(user_id: &str) -> Result<()> {
        require!(user_id.as_bytes().len() <= 64, GameError::InvalidPayload);
        Ok(())
    }
}
