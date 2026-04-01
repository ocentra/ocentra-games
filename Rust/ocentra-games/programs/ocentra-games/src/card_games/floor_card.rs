use crate::error::GameError;
use crate::state::Match;
use anchor_lang::prelude::*;

/// Floor card mechanics shared by card games
pub struct FloorCard;

impl FloorCard {
    /// Validate floor card is revealed
    pub fn validate_revealed(match_account: &Match) -> Result<()> {
        require!(match_account.floor_card_revealed(), GameError::InvalidPhase);
        Ok(())
    }

    /// Validate card hash matches floor card hash
    pub fn validate_card_hash(match_account: &Match, card_hash: &[u8; 32]) -> Result<()> {
        if let Some(floor_hash) = match_account.get_floor_card_hash() {
            require!(
                card_hash == &floor_hash,
                GameError::InvalidPayload // Card hash mismatch
            );
        } else {
            return Err(GameError::InvalidPhase.into()); // No floor card
        }
        Ok(())
    }

    /// Clear floor card (called after pick_up or decline)
    pub fn clear_floor_card(match_account: &mut Match) {
        match_account.set_floor_card_revealed(false);
        match_account.clear_floor_card_hash();
    }
}
