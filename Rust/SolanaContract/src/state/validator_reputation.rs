use anchor_lang::prelude::*;

/**
 * Validator reputation and stake tracking.
 * Per critique Issue #5, Spec Section 33.1: Reputation system for validators.
 */
#[account]
pub struct ValidatorReputation {
    pub validator: Pubkey,
    pub stake: u64,              // SOL staked as validator bond
    pub reputation: f64,        // Reputation score (0.0 - 1.0)
    pub total_resolutions: u32, // Total disputes resolved
    pub correct_resolutions: u32, // Correct resolutions (for accuracy calculation)
    pub created_at: i64,
    pub last_active: i64,       // Last dispute resolution timestamp
}

impl ValidatorReputation {
    pub const MAX_SIZE: usize = 8 +      // discriminator
        32 +                             // validator (Pubkey)
        8 +                              // stake (u64)
        8 +                              // reputation (f64)
        4 +                              // total_resolutions (u32)
        4 +                              // correct_resolutions (u32)
        8 +                              // created_at (i64)
        8;                               // last_active (i64)
    
    // Total: 8 + 32 + 8 + 8 + 4 + 4 + 8 + 8 = 80 bytes
    
    pub fn calculate_accuracy(&self) -> f64 {
        if self.total_resolutions == 0 {
            return 0.5; // Default reputation for new validators
        }
        self.correct_resolutions as f64 / self.total_resolutions as f64
    }
    
    pub fn update_reputation(&mut self, was_correct: bool) {
        self.total_resolutions += 1;
        if was_correct {
            self.correct_resolutions += 1;
        }
        
        // Update reputation based on accuracy
        let accuracy = self.calculate_accuracy();
        self.reputation = (self.reputation * 0.7 + accuracy * 0.3).clamp(0.0, 1.0);
    }
}

