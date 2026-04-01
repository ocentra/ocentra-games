use crate::card_games::floor_card::FloorCard;
use crate::card_games::hand_management::HandManagement;
use crate::card_games::suit_declarations::SuitDeclarations;
use crate::state::Match;
use anchor_lang::prelude::*;

/// CLAIM-specific action state updates
/// `advance_turn`: if true, advance turn after pick_up/decline (for single moves)
///                 if false, don't advance turn (for batch moves - turn advances once at end)
pub fn apply_claim_action(
    match_account: &mut Match,
    player_index: usize,
    action_type: u8,
    payload: &[u8],
    advance_turn: bool,
) -> Result<()> {
    match action_type {
        2 => {
            // Declare intent: record the declared suit
            if payload.len() >= 1 {
                let suit = payload[0];
                SuitDeclarations::record_declaration(match_account, player_index, suit);
            }
        }
        0 => {
            // Pick up: clear floor card, update hand size
            FloorCard::clear_floor_card(match_account);
            HandManagement::increment_hand_size(match_account, player_index);
            if advance_turn {
                match_account.current_player =
                    ((player_index + 1) % match_account.player_count as usize) as u8;
            }
        }
        1 => {
            // Decline: do NOT clear floor card - it stays for next player
            // Floor card remains visible for next player's turn
            // Only dealer/platform will remove/replace it if no one picks it up after a full round
            if advance_turn {
                match_account.current_player =
                    ((player_index + 1) % match_account.player_count as usize) as u8;
            }
        }
        3 => {
            // Call showdown: transition to ended phase
            match_account.phase = 2; // Ended
                                     // ended_at will be set by instruction handler with clock
        }
        5 => {
            // Reveal floor card: set floor card hash and mark as revealed
            // Payload format: [floor_card_hash(32 bytes)]
            if payload.len() >= 32 {
                let mut floor_hash = [0u8; 32];
                floor_hash.copy_from_slice(&payload[0..32]);
                match_account.set_floor_card_hash(floor_hash);
                match_account.set_floor_card_revealed(true);
            }
        }
        _ => {}
    }
    Ok(())
}
