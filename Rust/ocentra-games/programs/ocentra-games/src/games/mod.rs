// Game-specific implementations

pub mod claim;
pub mod dispatcher;
pub mod trait_def;

pub use dispatcher::{apply_action_state, validate_move};
