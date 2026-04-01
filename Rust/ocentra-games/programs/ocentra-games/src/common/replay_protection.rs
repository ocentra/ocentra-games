use crate::error::GameError;
use crate::state::Match;
use anchor_lang::prelude::*;

/// Replay protection and nonce validation
pub struct ReplayProtection;

impl ReplayProtection {
    /// Validate nonce is greater than last nonce for player
    pub fn validate_nonce(match_account: &Match, player_index: usize, nonce: u64) -> Result<()> {
        let last_nonce = match_account.get_last_nonce(player_index);
        require!(nonce > last_nonce, GameError::InvalidNonce);
        Ok(())
    }

    /// Check if move account already exists (replay attack)
    #[allow(unused_variables)]
    pub fn check_account_exists(
        _player: anchor_lang::solana_program::pubkey::Pubkey,
    ) -> Result<()> {
        // Account existence check is handled at instruction level with init_if_needed
        // This is a placeholder for future enhancements
        Ok(())
    }

    /// Validate timestamp (basic replay protection)
    pub fn validate_timestamp(match_account: &Match, move_timestamp: i64) -> Result<()> {
        require!(
            move_timestamp >= match_account.created_at,
            GameError::InvalidTimestamp
        );

        // Reject moves older than 50 minutes (very old moves)
        let max_age = 300i64 * 10; // 50 minutes
        if match_account.move_count as u32 > 0 {
            let match_age = move_timestamp.saturating_sub(match_account.created_at);
            if match_age > max_age {
                return Err(GameError::InvalidTimestamp.into());
            }
        }
        Ok(())
    }
}
