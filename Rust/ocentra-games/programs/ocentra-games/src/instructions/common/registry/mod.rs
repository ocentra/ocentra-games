pub mod initialize_registry;
pub mod register_game;
pub mod update_game;

// Re-export for Anchor's #[program] macro
// Ambiguous re-exports warning is acceptable because handlers use full paths
#[allow(ambiguous_glob_reexports)]
pub use initialize_registry::*;
#[allow(ambiguous_glob_reexports)]
pub use register_game::*;
pub use update_game::*;
