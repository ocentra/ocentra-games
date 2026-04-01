use anchor_lang::prelude::*;

/// Maximum number of players per match
pub const MAX_PLAYERS: usize = 10;

/// Escrow account PDA schema for paid matches.
/// Tracks per-player stakes, platform fees, and treasury amounts.
/// Uses zero-copy for efficiency.
#[repr(C)]
#[account(zero_copy)]
pub struct EscrowAccount {
    /// Match PDA this escrow belongs to
    pub match_pda: Pubkey, // 32 bytes

    /// PDA bump seed
    pub bump: u8, // 1 byte
    pub _padding1: [u8; 7], // Explicit padding to align total_entry_lamports to 8 bytes

    /// Total entry fees collected from all players
    pub total_entry_lamports: u64, // 8 bytes - 8-byte aligned

    /// Platform fee accumulated (calculated as total_entry_lamports * platform_fee_bps / 10000)
    pub platform_fee_lamports: u64, // 8 bytes - 8-byte aligned

    /// Amount owed to treasury (platform_fee_lamports - already withdrawn)
    pub treasury_due_lamports: u64, // 8 bytes - 8-byte aligned

    /// Per-player stakes (one u64 per player slot)
    /// Format: [player0_stake(8) | player1_stake(8) | ... | player9_stake(8)]
    /// Index corresponds to player position in match
    pub player_stakes: [u64; MAX_PLAYERS], // 10 × 8 = 80 bytes - 8-byte aligned

    /// Status flags bitfield:
    /// Bit 0: funded (all players have paid entry fee)
    /// Bit 1: distributed (prizes have been distributed)
    /// Bit 2: cancelled (match was cancelled, refunds issued)
    /// Bits 3-5: cancellation_reason (3 bits = 8 values, see cancellation_reason constants)
    /// Bits 6-7: reserved
    pub status_flags: u8, // 1 byte
    
    /// Abandoned player index (0-9 = player index, 255 = none/not applicable)
    /// Only set when cancellation_reason is PLAYER_ABANDONMENT, TIMEOUT, or GRACE_PERIOD_EXPIRED
    pub abandoned_player_index: u8, // 1 byte
    pub _padding2: [u8; 6], // Explicit padding to align reserved to 8 bytes

    /// Reserved space for future SPL token support (mint metadata, etc.)
    pub reserved: [u8; 32], // 32 bytes - 8-byte aligned
}

impl EscrowAccount {
    /// Maximum size of EscrowAccount including discriminator
    pub const MAX_SIZE: usize = 8 +      // discriminator
        32 +                              // match_pda (Pubkey)
        1 + 7 +                           // bump + _padding1
        8 +                               // total_entry_lamports
        8 +                               // platform_fee_lamports
        8 +                               // treasury_due_lamports
        (8 * MAX_PLAYERS) +               // player_stakes (10 × 8 = 80 bytes)
        1 + 1 + 6 +                       // status_flags + abandoned_player_index + _padding2
        32; // reserved

    /// PDA seed pattern for EscrowAccount
    /// Seeds: [b"escrow", match_pda.as_ref()]
    /// This ensures one escrow account per match

    // Status flag helpers
    pub fn is_funded(&self) -> bool {
        (self.status_flags & 0x01) != 0
    }

    pub fn set_funded(&mut self, funded: bool) {
        if funded {
            self.status_flags |= 0x01;
        } else {
            self.status_flags &= !0x01;
        }
    }

    pub fn is_distributed(&self) -> bool {
        (self.status_flags & 0x02) != 0
    }

    pub fn set_distributed(&mut self, distributed: bool) {
        if distributed {
            self.status_flags |= 0x02;
        } else {
            self.status_flags &= !0x02;
        }
    }

    pub fn is_cancelled(&self) -> bool {
        (self.status_flags & 0x04) != 0
    }

    pub fn set_cancelled(&mut self, cancelled: bool) {
        if cancelled {
            self.status_flags |= 0x04;
        } else {
            self.status_flags &= !0x04;
        }
    }

    /// Get cancellation reason (bits 3-5 of status_flags)
    pub fn get_cancellation_reason(&self) -> u8 {
        (self.status_flags >> 3) & 0x07
    }

    /// Set cancellation reason (bits 3-5 of status_flags)
    /// reason must be 0-7 (3 bits)
    pub fn set_cancellation_reason(&mut self, reason: u8) {
        // Clear bits 3-5, then set new reason
        self.status_flags = (self.status_flags & 0xC7) | ((reason & 0x07) << 3);
    }

    /// Get player stake by index
    pub fn get_player_stake(&self, player_index: usize) -> u64 {
        if player_index >= MAX_PLAYERS {
            return 0;
        }
        self.player_stakes[player_index]
    }

    /// Set player stake by index
    pub fn set_player_stake(&mut self, player_index: usize, stake: u64) {
        if player_index < MAX_PLAYERS {
            self.player_stakes[player_index] = stake;
        }
    }

    /// Calculate total player stakes (sum of all player_stakes)
    pub fn total_player_stakes(&self) -> u64 {
        self.player_stakes.iter().sum()
    }
}

// DO NOT manually implement Pod/Zeroable - Anchor's macro will derive them
// If this fails, the explicit padding fields need adjustment
