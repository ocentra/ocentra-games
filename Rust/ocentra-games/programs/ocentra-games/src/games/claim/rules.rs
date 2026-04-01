use crate::games::trait_def::GameRules;
use crate::state::Match;
use anchor_lang::prelude::*;

/// CLAIM game constants
pub struct ClaimRules;

impl ClaimRules {
    pub const MAX_HAND_SIZE: u8 = 13;
    pub const MAX_ACTION_TYPE: u8 = 5; // 0=pick_up, 1=decline, 2=declare_intent, 3=call_showdown, 4=rebuttal, 5=reveal_floor_card
}

impl GameRules for ClaimRules {
    fn max_hand_size(&self) -> u8 {
        Self::MAX_HAND_SIZE
    }

    fn max_action_type(&self) -> u8 {
        Self::MAX_ACTION_TYPE
    }

    fn validate_action(
        &self,
        match_account: &Match,
        player_index: usize,
        action_type: u8,
        payload: &[u8],
    ) -> Result<()> {
        crate::games::claim::validation::validate_claim_action(
            match_account,
            player_index,
            action_type,
            payload,
        )
    }

    fn apply_action_state(
        &self,
        match_account: &mut Match,
        player_index: usize,
        action_type: u8,
        payload: &[u8],
        advance_turn: bool,
    ) -> Result<()> {
        crate::games::claim::actions::apply_claim_action(
            match_account,
            player_index,
            action_type,
            payload,
            advance_turn,
        )
    }
}
