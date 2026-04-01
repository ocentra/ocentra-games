pub mod batch_anchor;
pub mod config_account; // Per spec Section 20: Economic model - ConfigAccount
pub mod dispute;
pub mod enums; // MatchType, PaymentMethod, KYC tier constants
pub mod escrow; // Phase 02: Escrow account for paid matches
pub mod game_config;
pub mod game_leaderboard; // Per spec Section 20.1.6: Leaderboard system
pub mod game_registry;
pub mod match_state;
pub mod move_state;
pub mod signer_registry;
pub mod user_account; // Per spec Section 20: Economic model - UserAccount
pub mod user_deposit; // Phase 02: User deposit account for platform deposits
pub mod validator_reputation; // Per critique Issue #5: Validator reputation tracking // Per spec Section 16.5: Game registry system

pub use batch_anchor::*;
pub use config_account::*;
pub use dispute::*;
pub use enums::*;
pub use escrow::*;
pub use game_config::*;
pub use game_leaderboard::*;
pub use game_registry::*;
pub use match_state::*;
pub use move_state::*;
pub use signer_registry::*;
pub use user_account::*;
pub use user_deposit::*;
pub use validator_reputation::*;
