pub mod create_match;
pub mod join_match;
pub mod start_match;
pub mod commit_hand;
pub mod submit_move;
pub mod end_match;
pub mod anchor_match_record;
pub mod register_signer;
pub mod anchor_batch;
pub mod flag_dispute;
pub mod resolve_dispute;
pub mod calculate_scores;
pub mod close_match_account; // Per critique Issue #3: Rent reclamation
pub mod slash_validator; // Per critique Issue #3, #5: Validator slashing
// Economic model instructions (Section 20)
pub mod daily_login; // Per spec Section 20.1.2: Daily login rewards
pub mod game_payment; // Per spec Section 20.1.3: Game payment flow
pub mod ad_reward; // Per spec Section 20.1.4: Ad reward system
pub mod pro_subscription; // Per spec Section 20.1.5: Pro subscription
pub mod ai_credit_purchase; // Per spec Section 20.1.6: AI credit purchase
pub mod ai_credit_consume; // Per spec Section 20.1.6: AI credit consumption
// Game registry instructions (Section 16.5)
pub mod register_game; // Per spec Section 16.5: Register game in registry
pub mod update_game; // Per spec Section 16.5: Update game in registry
// Move batching (Section 16.6)
pub mod submit_batch_moves; // Per spec Section 16.6: Batch up to 5 moves per transaction

pub use create_match::*;
pub use join_match::*;
pub use start_match::*;
pub use commit_hand::*;
pub use submit_move::*;
pub use end_match::*;
pub use anchor_match_record::*;
pub use register_signer::*;
pub use anchor_batch::*;
pub use flag_dispute::*;
pub use resolve_dispute::*;
pub use close_match_account::*;
pub use slash_validator::*;
pub use daily_login::*;
pub use game_payment::*;
pub use ad_reward::*;
pub use pro_subscription::*;
pub use ai_credit_purchase::*;
pub use ai_credit_consume::*;
pub use register_game::*;
pub use update_game::*;
pub use submit_batch_moves::*;

