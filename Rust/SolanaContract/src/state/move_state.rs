use anchor_lang::prelude::*;
use crate::error::GameError;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ActionType {
    PickUp = 0,
    Decline = 1,
    DeclareIntent = 2,
    CallShowdown = 3,
    Rebuttal = 4,
}

#[account]
pub struct Move {
    pub match_id: [u8; 36],      // UUID v4 (fixed 36 bytes, saves 4 bytes vs String)
    pub player: Pubkey,           // Player who made the move
    pub move_index: u32,          // Sequential move number
    pub action_type: u8,          // 0=pick_up, 1=decline, 2=declare_intent, etc.
    pub payload: [u8; 128],       // Fixed-size payload (saves 4 bytes vs Vec, reduced from 256 to 128)
    pub payload_len: u8,          // Actual payload length (0-128)
    pub timestamp: i64,           // Unix timestamp
}

impl Move {
    pub const MAX_SIZE: usize = 8 +      // discriminator
        36 +                             // match_id (fixed [u8; 36])
        32 +                             // player (Pubkey)
        4 +                              // move_index (u32)
        1 +                              // action_type (u8)
        128 +                            // payload (fixed [u8; 128])
        1 +                              // payload_len (u8)
        8;                               // timestamp (i64)
    
    // Total: 8 + 36 + 32 + 4 + 1 + 128 + 1 + 8 = 218 bytes
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

    pub fn get_action_type(&self) -> ActionType {
        match self.action_type {
            0 => ActionType::PickUp,
            1 => ActionType::Decline,
            2 => ActionType::DeclareIntent,
            3 => ActionType::CallShowdown,
            4 => ActionType::Rebuttal,
            _ => ActionType::PickUp, // Default fallback
        }
    }
}

