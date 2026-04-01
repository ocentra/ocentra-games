use crate::error::GameError;
use anchor_lang::prelude::*;

/// Action type constants (replaces ActionType enum to reduce program size)
pub mod action_type {
    pub const PICK_UP: u8 = 0;
    pub const DECLINE: u8 = 1;
    pub const DECLARE_INTENT: u8 = 2;
    pub const CALL_SHOWDOWN: u8 = 3;
    pub const REBUTTAL: u8 = 4;
}

#[account]
pub struct Move {
    pub match_id: [u8; 36], // UUID v4 (fixed 36 bytes, saves 4 bytes vs String)
    pub player: Pubkey,     // Player who made the move
    pub move_index: u16,    // Sequential move number (u16 max = 65k moves, saves 2 bytes)
    pub action_type: u8,    // 0=pick_up, 1=decline, 2=declare_intent, etc.
    pub payload: [u8; 128], // Fixed-size payload (saves 4 bytes vs Vec, reduced from 256 to 128)
    pub payload_len: u8,    // Actual payload length (0-128)
    pub timestamp: u32,     // Unix timestamp (u32, relative to epoch, saves 4 bytes)
}

impl Move {
    pub const MAX_SIZE: usize = 8 +      // discriminator
        36 +                             // match_id (fixed [u8; 36])
        32 +                             // player (Pubkey)
        2 +                              // move_index (u16, reduced from u32, saves 2 bytes)
        1 +                              // action_type (u8)
        128 +                            // payload (fixed [u8; 128])
        1 +                              // payload_len (u8)
        4; // timestamp (u32, reduced from i64, saves 4 bytes)

    // Total: 8 + 36 + 32 + 2 + 1 + 128 + 1 + 4 = 212 bytes (saved 6 bytes)
    // Previous: ~350 bytes (saved ~130 bytes)

    pub fn get_payload_slice(&self) -> &[u8] {
        &self.payload[..self.payload_len as usize]
    }

    pub fn set_payload(&mut self, data: &[u8]) -> Result<()> {
        require!(data.len() <= 128, GameError::InvalidPayload);
        self.payload[..data.len()].copy_from_slice(data);
        self.payload_len = data.len() as u8;
        Ok(())
    }

    /// Get action type as u8 (0=PickUp, 1=Decline, 2=DeclareIntent, 3=CallShowdown, 4=Rebuttal)
    pub fn get_action_type(&self) -> u8 {
        self.action_type
    }
}
