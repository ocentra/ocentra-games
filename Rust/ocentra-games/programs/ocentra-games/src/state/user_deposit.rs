use anchor_lang::prelude::*;

/// User deposit account PDA schema.
/// Tracks user's platform deposit balance, locked amounts, and withdrawal history.
/// Uses zero-copy for efficiency.
#[repr(C)]
#[account(zero_copy)]
pub struct UserDepositAccount {
    /// User authority (wallet or custody delegate)
    pub authority: Pubkey, // 32 bytes

    /// PDA bump seed
    pub bump: u8, // 1 byte
    pub _padding1: [u8; 7], // Explicit padding to align total_deposited to 8 bytes

    /// Lifetime total deposited (cumulative)
    pub total_deposited: u64, // 8 bytes - 8-byte aligned

    /// Available balance (spendable, not locked)
    pub available_lamports: u64, // 8 bytes - 8-byte aligned

    /// Amount locked in escrow (in play)
    pub in_play_lamports: u64, // 8 bytes - 8-byte aligned

    /// Cumulative withdrawn amount
    pub withdrawn_lamports: u64, // 8 bytes - 8-byte aligned

    /// Unix timestamp when account is locked until (0 = not locked)
    pub locked_until: i64, // 8 bytes - 8-byte aligned

    /// Flags bitfield:
    /// Bit 0: frozen (account frozen, no deposits/withdrawals allowed)
    /// Bit 1: enhanced_review (account flagged for enhanced review)
    /// Bits 2-7: reserved
    pub flags: u8, // 1 byte
    pub _padding2: [u8; 7], // Explicit padding to align reserved to 8 bytes

    /// Reserved space for future token mint metadata (SPL tokens, etc.)
    pub reserved: [u8; 32], // 32 bytes - 8-byte aligned
}

impl UserDepositAccount {
    /// Maximum size of UserDepositAccount including discriminator
    pub const MAX_SIZE: usize = 8 +      // discriminator
        32 +                              // authority (Pubkey)
        1 + 7 +                           // bump + _padding1
        8 +                               // total_deposited
        8 +                               // available_lamports
        8 +                               // in_play_lamports
        8 +                               // withdrawn_lamports
        8 +                               // locked_until
        1 + 7 +                           // flags + _padding2
        32; // reserved

    /// PDA seed pattern for UserDepositAccount
    /// Seeds: [b"user_deposit", authority.as_ref()]
    /// This ensures one deposit account per user authority (wallet or custody delegate)

    /// Get total balance (available + in_play)
    pub fn total_balance(&self) -> u64 {
        self.available_lamports
            .saturating_add(self.in_play_lamports)
    }

    /// Check if account is locked
    pub fn is_locked(&self) -> bool {
        self.locked_until > 0
    }

    /// Check if account is frozen
    pub fn is_frozen(&self) -> bool {
        (self.flags & 0x01) != 0
    }

    pub fn set_frozen(&mut self, frozen: bool) {
        if frozen {
            self.flags |= 0x01;
        } else {
            self.flags &= !0x01;
        }
    }

    /// Check if account requires enhanced review
    pub fn requires_enhanced_review(&self) -> bool {
        (self.flags & 0x02) != 0
    }

    pub fn set_enhanced_review(&mut self, required: bool) {
        if required {
            self.flags |= 0x02;
        } else {
            self.flags &= !0x02;
        }
    }
}

// DO NOT manually implement Pod/Zeroable - Anchor's macro will derive them
// If this fails, the explicit padding fields need adjustment
