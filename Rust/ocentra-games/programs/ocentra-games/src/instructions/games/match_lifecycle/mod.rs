pub mod anchor_match_record;
pub mod commit_hand;
pub mod create_match;
pub mod end_match;
pub mod join_match;
pub mod start_match;

// Re-export for Anchor's #[program] macro
// Ambiguous re-exports warning is acceptable because handlers use full paths
#[allow(ambiguous_glob_reexports)]
pub use anchor_match_record::*;
#[allow(ambiguous_glob_reexports)]
pub use commit_hand::*;
#[allow(ambiguous_glob_reexports)]
pub use create_match::*;
#[allow(ambiguous_glob_reexports)]
pub use end_match::*;
#[allow(ambiguous_glob_reexports)]
pub use join_match::*;
#[allow(ambiguous_glob_reexports)]
pub use start_match::*;
