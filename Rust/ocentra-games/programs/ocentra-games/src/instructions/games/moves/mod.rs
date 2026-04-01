pub mod submit_batch_moves;
pub mod submit_move;

// Re-export for Anchor's #[program] macro
// Ambiguous re-exports warning is acceptable because handlers use full paths
#[allow(ambiguous_glob_reexports)]
pub use submit_batch_moves::*;
#[allow(ambiguous_glob_reexports)]
pub use submit_move::*;
