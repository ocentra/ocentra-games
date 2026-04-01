pub mod ad_reward;
pub mod ai_credit_consume;
pub mod ai_credit_purchase;
pub mod daily_login;
pub mod deposit_sol;
pub mod distribute_prizes;
pub mod game_payment;
pub mod pro_subscription;
pub mod refund_escrow;
pub mod withdraw_sol;

// Re-export for Anchor's #[program] macro
// Ambiguous re-exports warning is acceptable because handlers use full paths
#[allow(ambiguous_glob_reexports)]
pub use ad_reward::*;
pub use ai_credit_consume::*;
#[allow(ambiguous_glob_reexports)]
pub use ai_credit_purchase::*;
#[allow(ambiguous_glob_reexports)]
pub use daily_login::*;
#[allow(ambiguous_glob_reexports)]
pub use deposit_sol::*;
#[allow(ambiguous_glob_reexports)]
pub use distribute_prizes::*;
#[allow(ambiguous_glob_reexports)]
pub use game_payment::*;
#[allow(ambiguous_glob_reexports)]
pub use pro_subscription::*;
#[allow(ambiguous_glob_reexports)]
pub use refund_escrow::*;
#[allow(ambiguous_glob_reexports)]
pub use withdraw_sol::*;
