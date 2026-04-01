// Organized instructions

// Common instructions (apply to all games)
pub mod common;

// Game-related instructions
pub mod games;

// Re-export everything - Anchor's #[program] macro requires glob imports
#[allow(ambiguous_glob_reexports)]
pub use common::*;
pub use games::*;
