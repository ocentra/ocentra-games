use anchor_lang::prelude::*;
use crate::state::game_config::{GameType, GameConfig};

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum GamePhase {
    Dealing = 0,
    Playing = 1,
    Ended = 2,
}

#[account]
pub struct Match {
    // Fixed-size byte arrays instead of String (saves 4 bytes per field for length prefix)
    pub match_id: [u8; 36],         // UUID v4 (fixed 36 bytes, no length prefix)
    pub version: [u8; 10],          // Schema version (e.g., "1.0.0" = 10 bytes, null-padded)
                                    // Note: Not in spec Section 7, but used for schema migration tracking
    pub game_name: [u8; 20],        // Game name (fixed 20 bytes, null-padded)
    
    pub game_type: u8,              // GameType enum as u8
    pub seed: u64,                  // RNG seed
    pub phase: u8,                  // 0=Dealing, 1=Playing, 2=Ended
    pub current_player: u8,         // Index (0-9)
    pub player_ids: [[u8; 64]; 10], // Fixed array of 10 Firebase UIDs (max 64 bytes each, null-padded)
    pub player_count: u8,           // Current number of players
    pub move_count: u32,            // Total moves
    
    pub created_at: i64,            // Unix timestamp
    pub ended_at: i64,              // Unix timestamp when ended (0 = not ended, saves 1 byte vs Option)
    pub match_hash: [u8; 32],       // SHA-256 hash (all zeros = not set, saves 1 byte vs Option)
    pub hot_url: [u8; 200],         // Cloudflare R2 URL (fixed 200 bytes, null-padded, saves 4 bytes vs String)
    
    pub authority: Pubkey,          // Match creator/coordinator
    
    // Packed bitfield: 4 bits per suit (0-3), 10 players = 40 bits = 5 bytes
    // Format: [player0_suit(4bits) | player1_suit(4bits) | ... | player9_suit(4bits)]
    // 0 = no suit declared, 1-4 = spades/hearts/diamonds/clubs
    pub declared_suits: [u8; 5],    // Packed bitfield (saves 15 bytes vs [Option<u8>; 10])
    
    // Pack boolean flags into single u8 (saves 1 byte)
    // Bit 0: floor_card_revealed
    // Bit 1: all_players_joined
    // Bits 2-7: reserved
    pub flags: u8,
    
    // Per critique Issue #1: Floor card hash for on-chain validation
    // Hash of the current floor card (SHA-256 of card suit+value)
    // All zeros = no floor card
    pub floor_card_hash: [u8; 32],
    
    // Per critique Issue #1: Hand sizes for on-chain validation
    // Track committed hand size per player (for hand space validation)
    // Format: [player0_size(1) | player1_size(1) | ... | player9_size(1)]
    pub hand_sizes: [u8; 10], // 10 players × 1 byte = 10 bytes
    
    // Per critique: committed hand hashes for card validation
    // Each player commits their hand hash at match start (SHA-256 of sorted card list)
    // Format: [player0_hash(32) | player1_hash(32) | ... | player9_hash(32)]
    pub committed_hand_hashes: [u8; 320], // 10 players × 32 bytes = 320 bytes
    
    // Per critique: replay protection - last nonce per player
    // Each player must submit nonce > last_nonce[player_index] to prevent replay attacks
    // Format: [player0_nonce(8) | player1_nonce(8) | ... | player9_nonce(8)]
    pub last_nonce: [u64; 10], // 10 players × 8 bytes = 80 bytes
}

impl Match {
    pub const MAX_SIZE: usize = 8 +      // discriminator
        36 +                             // match_id (fixed [u8; 36])
        10 +                             // version (fixed [u8; 10]) - per critique Phase 2.4
        20 +                             // game_name (fixed [u8; 20])
        1 +                              // game_type (u8)
        8 +                              // seed (u64)
        1 +                              // phase (u8)
        1 +                              // current_player (u8)
        (64 * 10) +                      // player_ids array (10 Firebase UIDs, 64 bytes each)
        1 +                              // player_count (u8)
        4 +                              // move_count (u32)
        8 +                              // created_at (i64)
        8 +                              // ended_at (i64, 0 = not ended)
        32 +                            // match_hash ([u8; 32], all zeros = not set)
        200 +                           // hot_url (fixed [u8; 200])
        32 +                            // authority (Pubkey)
        5 +                              // declared_suits (packed bitfield [u8; 5])
        1 +                              // flags (u8 bitfield)
        32 +                             // floor_card_hash ([u8; 32]) - per critique Issue #1
        10 +                             // hand_sizes ([u8; 10]) - per critique Issue #1
        320 +                            // committed_hand_hashes ([u8; 320])
        (8 * 10);                        // last_nonce ([u64; 10] = 80 bytes)
    
    // Total: 8 + 36 + 10 + 20 + 1 + 8 + 1 + 1 + 320 + 1 + 4 + 8 + 8 + 32 + 200 + 32 + 5 + 1 + 32 + 10 + 320 + 80 = 1146 bytes
    // Added version field per critique Phase 2.4, committed hand hashes and nonce tracking per critique
    // Added floor_card_hash and hand_sizes per critique Issue #1 for on-chain validation

    pub fn get_game_type(&self) -> GameType {
        match self.game_type {
            0 => GameType::Claim,
            1 => GameType::ThreeCardBrag,
            2 => GameType::Poker,
            3 => GameType::Bridge,
            4 => GameType::Rummy,
            5 => GameType::Scrabble,
            6 => GameType::WordSearch,
            7 => GameType::Crosswords,
            _ => GameType::Claim, // Default fallback
        }
    }

    pub fn get_game_config(&self) -> GameConfig {
        self.get_game_type().get_config()
    }

    pub fn is_full(&self) -> bool {
        let config = self.get_game_config();
        self.player_count >= config.max_players
    }

    pub fn has_minimum_players(&self) -> bool {
        let config = self.get_game_config();
        self.player_count >= config.min_players
    }

    pub fn get_min_players(&self) -> u8 {
        self.get_game_config().min_players
    }

    pub fn get_max_players(&self) -> u8 {
        self.get_game_config().max_players
    }

    pub fn can_join(&self) -> bool {
        self.phase == 0 && !self.is_full() && !self.all_players_joined() // Only in Dealing phase
    }

    pub fn get_phase(&self) -> GamePhase {
        match self.phase {
            0 => GamePhase::Dealing,
            1 => GamePhase::Playing,
            2 => GamePhase::Ended,
            _ => GamePhase::Dealing, // Default fallback
        }
    }

    // Helper methods for packed bitfield operations
    pub fn has_declared_suit(&self, player_index: usize) -> bool {
        if player_index >= 10 {
            return false;
        }
        self.get_declared_suit(player_index).is_some()
    }

    pub fn get_declared_suit(&self, player_index: usize) -> Option<u8> {
        if player_index >= 10 {
            return None;
        }
        // Extract 4-bit suit value from packed bitfield
        let byte_index = player_index / 2;
        let bit_offset = (player_index % 2) * 4;
        let mask = 0x0F << bit_offset;
        let suit_value = (self.declared_suits[byte_index] & mask) >> bit_offset;
        
        if suit_value == 0 {
            None
        } else {
            Some(suit_value - 1) // 1-4 maps to 0-3 (spades/hearts/diamonds/clubs)
        }
    }

    pub fn is_suit_locked(&self, suit: u8) -> bool {
        // Check if any player has declared this suit (suit is 0-3, stored as 1-4)
        let suit_value = suit + 1;
        for byte in &self.declared_suits {
            // Check both 4-bit values in this byte
            if (*byte & 0x0F) == suit_value || ((*byte >> 4) & 0x0F) == suit_value {
                return true;
            }
        }
        false
    }

    pub fn set_declared_suit(&mut self, player_index: usize, suit: u8) {
        if player_index >= 10 || suit > 3 {
            return;
        }
        // Pack suit value (0-3) as 1-4 in 4-bit field
        let suit_value = suit + 1;
        let byte_index = player_index / 2;
        let bit_offset = (player_index % 2) * 4;
        let mask = 0x0F << bit_offset;
        
        // Clear existing value and set new one
        self.declared_suits[byte_index] = (self.declared_suits[byte_index] & !mask) | (suit_value << bit_offset);
    }

    // Flag bitfield helpers
    pub fn floor_card_revealed(&self) -> bool {
        (self.flags & 0x01) != 0
    }

    pub fn set_floor_card_revealed(&mut self, revealed: bool) {
        if revealed {
            self.flags |= 0x01;
        } else {
            self.flags &= !0x01;
        }
    }

    pub fn all_players_joined(&self) -> bool {
        (self.flags & 0x02) != 0
    }

    pub fn set_all_players_joined(&mut self, joined: bool) {
        if joined {
            self.flags |= 0x02;
        } else {
            self.flags &= !0x02;
        }
    }

    // Helper to check if match is ended
    pub fn is_ended(&self) -> bool {
        self.ended_at != 0
    }

    // Helper to check if match hash is set
    pub fn has_match_hash(&self) -> bool {
        self.match_hash.iter().any(|&b| b != 0)
    }

    // Helper to get last nonce for a player
    pub fn get_last_nonce(&self, player_index: usize) -> u64 {
        if player_index >= 10 {
            return 0;
        }
        self.last_nonce[player_index]
    }

    // Helper to set last nonce for a player
    pub fn set_last_nonce(&mut self, player_index: usize, nonce: u64) {
        if player_index < 10 {
            self.last_nonce[player_index] = nonce;
        }
    }

    // Helper to get committed hand hash for a player
    pub fn get_committed_hand_hash(&self, player_index: usize) -> Option<[u8; 32]> {
        if player_index >= 10 {
            return None;
        }
        let start = player_index * 32;
        let end = start + 32;
        let mut hash = [0u8; 32];
        hash.copy_from_slice(&self.committed_hand_hashes[start..end]);
        
        // Return None if hash is all zeros (not committed)
        if hash.iter().all(|&b| b == 0) {
            None
        } else {
            Some(hash)
        }
    }

    // Helper to set committed hand hash for a player
    pub fn set_committed_hand_hash(&mut self, player_index: usize, hash: [u8; 32]) {
        if player_index < 10 {
            let start = player_index * 32;
            let end = start + 32;
            self.committed_hand_hashes[start..end].copy_from_slice(&hash);
        }
    }
    
    // Per critique Issue #1: Helper to get/set floor card hash
    pub fn get_floor_card_hash(&self) -> Option<[u8; 32]> {
        if self.floor_card_hash.iter().all(|&b| b == 0) {
            None
        } else {
            Some(self.floor_card_hash)
        }
    }
    
    pub fn set_floor_card_hash(&mut self, hash: [u8; 32]) {
        self.floor_card_hash = hash;
    }
    
    pub fn clear_floor_card_hash(&mut self) {
        self.floor_card_hash = [0u8; 32];
    }
    
    // Per critique Issue #1: Helper to get/set hand size for a player
    pub fn get_hand_size(&self, player_index: usize) -> u8 {
        if player_index >= 10 {
            return 0;
        }
        self.hand_sizes[player_index]
    }
    
    pub fn set_hand_size(&mut self, player_index: usize, size: u8) {
        if player_index < 10 {
            self.hand_sizes[player_index] = size;
        }
    }
    
    // Helper to get player_id by index
    pub fn get_player_id(&self, player_index: usize) -> Option<[u8; 64]> {
        if player_index >= 10 {
            return None;
        }
        Some(self.player_ids[player_index])
    }
    
    // Helper to set player_id by index
    pub fn set_player_id(&mut self, player_index: usize, user_id: [u8; 64]) {
        if player_index < 10 {
            self.player_ids[player_index] = user_id;
        }
    }
    
    // Helper to find player index by user_id (Firebase UID)
    pub fn find_player_index(&self, user_id: &[u8]) -> Option<usize> {
        for (index, stored_id) in self.player_ids.iter().enumerate() {
            // Compare up to the length of the provided user_id (null-padded comparison)
            if stored_id.starts_with(user_id) && stored_id[user_id.len()..].iter().all(|&b| b == 0) {
                return Some(index);
            }
            // Also check exact match (in case user_id is exactly 64 bytes)
            if stored_id == user_id {
                return Some(index);
            }
        }
        None
    }
    
    // Helper to check if user_id is already in match
    pub fn has_player_id(&self, user_id: &[u8]) -> bool {
        self.find_player_index(user_id).is_some()
    }
}

