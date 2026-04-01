use crate::state::Match;
use anchor_lang::prelude::*;

/// Trait for game-specific rules and validation
pub trait GameRules {
    /// Maximum hand size for this game
    fn max_hand_size(&self) -> u8;

    /// Maximum action type value for this game
    fn max_action_type(&self) -> u8;

    /// Validate game-specific action
    fn validate_action(
        &self,
        match_account: &Match,
        player_index: usize,
        action_type: u8,
        payload: &[u8],
    ) -> Result<()>;

    /// Handle game-specific state updates after action
    /// `advance_turn`: if true, advance turn after turn-based actions (for single moves)
    ///                 if false, don't advance turn (for batch moves)
    fn apply_action_state(
        &self,
        match_account: &mut Match,
        player_index: usize,
        action_type: u8,
        payload: &[u8],
        advance_turn: bool,
    ) -> Result<()>;
}
