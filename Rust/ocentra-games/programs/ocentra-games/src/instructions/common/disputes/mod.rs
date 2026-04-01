pub mod flag_dispute;
pub mod resolve_dispute;

// Re-export for Anchor's #[program] macro
// Ambiguous re-exports warning is acceptable because handlers use full paths
#[allow(ambiguous_glob_reexports)]
pub use flag_dispute::*;
pub use resolve_dispute::*;
