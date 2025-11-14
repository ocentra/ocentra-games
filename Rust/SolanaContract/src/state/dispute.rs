use anchor_lang::prelude::*;
use crate::error::GameError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum DisputeReason {
    InvalidMove = 0,
    PlayerTimeout = 1,
    SuspectedCheating = 2,
    ScoreError = 3,
    Other = 4,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum DisputeResolution {
    ResolvedInFavorOfFlagger = 0,
    ResolvedInFavorOfDefendant = 1,
    MatchVoided = 2,
    PartialRefund = 3,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy)]
pub struct ValidatorVote {
    pub validator: Pubkey,
    pub resolution: DisputeResolution,
    pub timestamp: i64,
}

#[account]
pub struct Dispute {
    pub match_id: [u8; 36],         // Fixed-size UUID (saves 4 bytes vs String)
    pub flagger: Pubkey,
    pub flagger_user_id: [u8; 64],  // Firebase UID of flagger (for GP deposit tracking)
    pub reason: u8,                 // DisputeReason as u8
    pub evidence_hash: [u8; 32],
    pub gp_deposit: u32,             // GP deposit amount (deducted off-chain, tracked on-chain)
    pub gp_refunded: bool,          // Whether GP was refunded (false = forfeited)
    pub created_at: i64,
    pub resolved_at: i64,           // 0 = not resolved (saves 1 byte vs Option)
    pub resolution: u8,             // 0 = not resolved, 1-4 = resolution type (saves 1 byte vs Option)
    pub validator_votes: [ValidatorVote; 10], // Fixed array (max 10 validators, saves 4 bytes vs Vec)
    pub vote_count: u8,              // Actual number of votes (0-10)
}

impl Dispute {
    pub const MAX_SIZE: usize = 8 +      // discriminator
        36 +                             // match_id (fixed [u8; 36])
        32 +                             // flagger (Pubkey)
        64 +                             // flagger_user_id (Firebase UID, fixed [u8; 64])
        1 +                              // reason (u8)
        32 +                             // evidence_hash
        4 +                              // gp_deposit (u32)
        1 +                              // gp_refunded (bool, stored as u8)
        8 +                              // created_at
        8 +                              // resolved_at (i64, 0 = not resolved)
        1 +                              // resolution (u8, 0 = not resolved)
        (32 + 1 + 8) * 10 +             // validator_votes (fixed [ValidatorVote; 10])
        1;                               // vote_count (u8)
    
    // Total: 8 + 36 + 32 + 64 + 1 + 32 + 4 + 1 + 8 + 8 + 1 + 410 + 1 = 606 bytes

    pub fn is_resolved(&self) -> bool {
        self.resolution != 0 && self.resolved_at != 0
    }

    pub fn get_reason(&self) -> DisputeReason {
        match self.reason {
            0 => DisputeReason::InvalidMove,
            1 => DisputeReason::PlayerTimeout,
            2 => DisputeReason::SuspectedCheating,
            3 => DisputeReason::ScoreError,
            _ => DisputeReason::Other,
        }
    }

    pub fn get_resolution(&self) -> Option<DisputeResolution> {
        if self.resolution == 0 {
            return None;
        }
        Some(match self.resolution {
            1 => DisputeResolution::ResolvedInFavorOfFlagger,
            2 => DisputeResolution::ResolvedInFavorOfDefendant,
            3 => DisputeResolution::MatchVoided,
            _ => DisputeResolution::PartialRefund,
        })
    }
    
    pub fn add_vote(&mut self, vote: ValidatorVote) -> Result<()> {
        require!(
            self.vote_count < 10,
            GameError::InvalidPayload
        );
        self.validator_votes[self.vote_count as usize] = vote;
        self.vote_count += 1;
        Ok(())
    }
}

