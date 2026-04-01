use crate::error::GameError;
use crate::state::Match;
use anchor_lang::prelude::*;

/// Suit declarations shared by card games
pub struct SuitDeclarations;

impl SuitDeclarations {
    /// Validate suit value (0-3: spades, hearts, diamonds, clubs)
    pub fn validate_suit(suit: u8) -> Result<()> {
        require!(suit < 4, GameError::InvalidPayload);
        Ok(())
    }

    /// Validate player hasn't already declared
    pub fn validate_not_declared(match_account: &Match, player_index: usize) -> Result<()> {
        require!(
            !match_account.has_declared_suit(player_index),
            GameError::InvalidAction
        );
        Ok(())
    }

    /// Validate suit is not locked by another player
    pub fn validate_suit_not_locked(match_account: &Match, suit: u8) -> Result<()> {
        require!(
            !match_account.is_suit_locked(suit),
            GameError::InvalidAction
        );
        Ok(())
    }

    /// Record declared suit for player
    pub fn record_declaration(match_account: &mut Match, player_index: usize, suit: u8) {
        match_account.set_declared_suit(player_index, suit);
    }
}
