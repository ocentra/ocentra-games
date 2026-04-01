// Game-related instructions

pub mod match_lifecycle;
pub mod moves;

// Re-export for Anchor's #[program] macro
// Ambiguous re-exports warning is acceptable because handlers use full paths
#[allow(ambiguous_glob_reexports)]
pub use match_lifecycle::*;
pub use moves::*;
