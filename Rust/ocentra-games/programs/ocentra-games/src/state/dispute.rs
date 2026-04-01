use crate::error::GameError;
use anchor_lang::prelude::*;

/// Dispute reason constants (replaces DisputeReason enum to reduce program size)
pub mod dispute_reason {
    pub const INVALID_MOVE: u8 = 0;
    pub const PLAYER_TIMEOUT: u8 = 1;
    pub const SUSPECTED_CHEATING: u8 = 2;
    pub const SCORE_ERROR: u8 = 3;
    pub const OTHER: u8 = 4;
}

/// Dispute resolution constants (replaces DisputeResolution enum to reduce program size)
pub mod dispute_resolution {
    pub const RESOLVED_IN_FAVOR_OF_FLAGGER: u8 = 1;
    pub const RESOLVED_IN_FAVOR_OF_DEFENDANT: u8 = 2;
    pub const MATCH_VOIDED: u8 = 3;
    pub const PARTIAL_REFUND: u8 = 4;
}

/// ValidatorVote - uses zero-copy for efficiency.
#[repr(C)]
#[derive(Clone, Copy, AnchorSerialize, AnchorDeserialize, bytemuck::Pod, bytemuck::Zeroable)]
pub struct ValidatorVote {
    pub validator: Pubkey,  // [u8; 32] - 1-byte aligned
    pub resolution: u8,     // DisputeResolution as u8 (for zero-copy compatibility)
    pub _padding1: [u8; 3], // Explicit padding to align timestamp to 4 bytes
    pub timestamp: u32, // Unix timestamp (u32, relative to epoch, saves 4 bytes per vote × 10 = 40 bytes!)
}

/// Dispute account - uses zero-copy for efficiency (564 bytes).
#[repr(C)]
#[account(zero_copy)]
pub struct Dispute {
    pub match_id: [u8; 36],        // Fixed-size UUID (saves 4 bytes vs String)
    pub _padding1: [u8; 4],        // Explicit padding to align to 8 bytes
    pub flagger: Pubkey,           // [u8; 32] - 1-byte aligned
    pub flagger_user_id: [u8; 64], // Firebase UID of flagger (for GP deposit tracking)
    pub reason: u8,                // DisputeReason as u8
    pub _padding2: [u8; 7], // Explicit padding to align evidence_hash? Actually arrays are 1-byte aligned, but padding for consistency
    pub evidence_hash: [u8; 32], // 1-byte aligned
    pub gp_deposit: u16,    // GP deposit amount (max 65k, saves 2 bytes)
    pub gp_refunded: u8,    // Whether GP was refunded (0 = false, 1 = true, u8 for zero-copy)
    pub _padding3: [u8; 5], // Explicit padding to align created_at to 8 bytes
    pub created_at: i64,    // 8-byte aligned
    pub resolved_at: i64,   // 8-byte aligned - 0 = not resolved (saves 1 byte vs Option)
    pub resolution: u8,     // 0 = not resolved, 1-4 = resolution type (saves 1 byte vs Option)
    pub vote_count: u8,     // Actual number of votes (0-10)
    pub _padding4: [u8; 6], // Explicit padding to align validator_votes array
    pub validator_votes: [ValidatorVote; 10], // Fixed array (max 10 validators, saves 4 bytes vs Vec)
}

// DO NOT manually implement Pod/Zeroable - Anchor's macro will derive them

impl Dispute {
    // MAX_SIZE needed for account initialization (space parameter)
    // With #[repr(C)], includes explicit padding fields
    pub const MAX_SIZE: usize = 8 +      // discriminator
        36 + 4 +                          // match_id + _padding1
        32 +                              // flagger
        64 +                              // flagger_user_id
        1 + 7 +                           // reason + _padding2
        32 +                              // evidence_hash
        2 + 1 + 5 +                       // gp_deposit + gp_refunded + _padding3
        8 + 8 +                          // created_at + resolved_at
        1 + 1 + 6 +                       // resolution + vote_count + _padding4
        (40 * 10); // validator_votes (ValidatorVote: 32 + 1 + 3 + 4 = 40 bytes each × 10 = 400 bytes)

    pub fn is_resolved(&self) -> bool {
        self.resolution != 0 && self.resolved_at != 0
    }

    /// Get dispute reason as u8
    pub fn get_reason(&self) -> u8 {
        self.reason
    }

    /// Get dispute resolution as u8 (0 = not resolved)
    pub fn get_resolution(&self) -> Option<u8> {
        if self.resolution == 0 {
            return None;
        }
        Some(self.resolution)
    }

    /// Add validator vote
    pub fn add_vote(&mut self, validator: Pubkey, resolution: u8, timestamp: u32) -> Result<()> {
        require!(self.vote_count < 10, GameError::InvalidPayload);
        require!(
            resolution >= 1 && resolution <= 4,
            GameError::InvalidPayload
        );
        self.validator_votes[self.vote_count as usize] = ValidatorVote {
            validator,
            resolution,
            _padding1: [0; 3],
            timestamp,
        };
        self.vote_count += 1;
        Ok(())
    }
}
