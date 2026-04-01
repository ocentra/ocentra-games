use crate::error::GameError;
use crate::state::Match;
use anchor_lang::prelude::*;

/// Hand management shared by card games
pub struct HandManagement;

impl HandManagement {
    /// Validate hand has space (game-specific max hand size)
    pub fn validate_hand_space(
        match_account: &Match,
        player_index: usize,
        max_hand_size: u8,
    ) -> Result<()> {
        let current_hand_size = match_account.get_hand_size(player_index);
        require!(
            current_hand_size < max_hand_size,
            GameError::InvalidPayload // Hand is full
        );
        Ok(())
    }

    /// Increment hand size (after picking up a card)
    pub fn increment_hand_size(match_account: &mut Match, player_index: usize) {
        let current_size = match_account.get_hand_size(player_index);
        match_account.set_hand_size(player_index, current_size.saturating_add(1));
    }

    /// Validate hand size is within bounds (for commit_hand)
    pub fn validate_hand_size_bounds(hand_size: u8) -> Result<()> {
        require!(
            hand_size > 0 && hand_size <= 52, // Max full deck
            GameError::InvalidPayload
        );
        Ok(())
    }
}
