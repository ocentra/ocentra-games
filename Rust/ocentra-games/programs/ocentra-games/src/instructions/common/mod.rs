// Common instructions - applies to ALL games (not game-specific)

pub mod accounts;
pub mod batches;
pub mod config;
pub mod disputes;
pub mod economic;
pub mod registry;
pub mod scores;
pub mod signers;
pub mod validators;

// Re-export everything for Anchor's #[program] macro
// Ambiguous re-exports warning is acceptable because handlers use full paths
#[allow(ambiguous_glob_reexports)]
pub use accounts::*;
pub use batches::*;
pub use config::*;
#[allow(ambiguous_glob_reexports)]
pub use disputes::*;
#[allow(ambiguous_glob_reexports)]
pub use economic::*;
#[allow(ambiguous_glob_reexports)]
pub use registry::*;
pub use scores::*;
pub use signers::*;
#[allow(ambiguous_glob_reexports)]
pub use validators::*;
