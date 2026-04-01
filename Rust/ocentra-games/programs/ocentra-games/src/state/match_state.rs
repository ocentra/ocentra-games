use crate::state::game_config::GameConfig;
use crate::state::game_registry::GameRegistry;
use anchor_lang::prelude::*;

/// Game phase constants (replaces GamePhase enum to reduce program size)
pub mod game_phase {
    pub const DEALING: u8 = 0;
    pub const PLAYING: u8 = 1;
    pub const ENDED: u8 = 2;
}

/// Match account - uses zero-copy for efficiency (1,140 bytes).
#[repr(C)]
#[account(zero_copy)]
pub struct Match {
    // Fixed-size byte arrays instead of String (saves 4 bytes per field for length prefix)
    pub match_id: [u8; 36], // UUID v4 (fixed 36 bytes, no length prefix)
    pub _padding1: [u8; 4], // Explicit padding to align to 8 bytes (36 + 4 = 40)
    pub version: [u8; 10],  // Schema version (e.g., "1.0.0" = 10 bytes, null-padded)
    // Note: Not in spec Section 7, but used for schema migration tracking
    pub game_name: [u8; 20], // Game name (fixed 20 bytes, null-padded)

    pub game_type: u8,              // GameType enum as u8
    pub _padding2: [u8; 1],         // Explicit padding to align seed to 4 bytes
    pub seed: u32,                  // RNG seed (u32 sufficient, saves 4 bytes) - 4-byte aligned
    pub phase: u8,                  // 0=Dealing, 1=Playing, 2=Ended
    pub current_player: u8,         // Index (0-9)
    pub player_count: u8,           // Current number of players
    pub _padding3: [u8; 1],         // Explicit padding
    pub player_ids: [[u8; 64]; 10], // Fixed array of 10 Firebase UIDs (max 64 bytes each, null-padded)
    pub move_count: u16,            // Total moves (u16 max = 65k moves, saves 2 bytes)
    pub _padding4: [u8; 6],         // Explicit padding to align created_at to 8 bytes

    pub created_at: i64,      // Unix timestamp - 8-byte aligned
    pub ended_at: i64, // Unix timestamp when ended (0 = not ended, saves 1 byte vs Option) - 8-byte aligned
    pub match_hash: [u8; 32], // SHA-256 hash (all zeros = not set, saves 1 byte vs Option)
    pub hot_url: [u8; 200], // Cloudflare R2 URL (fixed 200 bytes, null-padded, saves 4 bytes vs String)

    pub authority: Pubkey, // Match creator/coordinator - [u8; 32], 1-byte aligned

    // Packed bitfield: 4 bits per suit (0-3), 10 players = 40 bits = 5 bytes
    // Format: [player0_suit(4bits) | player1_suit(4bits) | ... | player9_suit(4bits)]
    // 0 = no suit declared, 1-4 = spades/hearts/diamonds/clubs
    pub declared_suits: [u8; 5], // Packed bitfield (saves 15 bytes vs [Option<u8>; 10])

    // Pack boolean flags into single u8 (saves 1 byte)
    // Bit 0: floor_card_revealed
    // Bit 1: all_players_joined
    // Bits 2-7: reserved
    pub flags: u8,
    pub _padding5: [u8; 2], // Explicit padding to align floor_card_hash? Actually arrays are 1-byte aligned

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
    // Note: u64 array needs 8-byte alignment
    // hand_sizes is 10 bytes, committed_hand_hashes is 320 bytes
    // Total before last_nonce: 10 + 320 = 330 bytes (330 % 8 = 2, so we need 6 bytes padding)
    pub _padding6: [u8; 6], // Explicit padding to align last_nonce to 8 bytes
    pub last_nonce: [u64; 10], // 10 players × 8 bytes = 80 bytes - 8-byte aligned

    // Phase 02: Paid match fields
    pub entry_fee_lamports: u64, // Entry fee in lamports (0 = free match) - 8-byte aligned
    pub prize_pool_lamports: u64, // Prize pool in lamports (0 = no prize) - 8-byte aligned
    pub match_type: u8,          // 0 = FREE, 1 = PAID (from enums::match_type)
    pub payment_method: u8,      // 0 = WALLET, 1 = PLATFORM (from enums::payment_method)
    pub _padding7: [u8; 6],      // Explicit padding to align tournament_id to 8 bytes
    pub tournament_id: [u8; 16], // Optional tournament ID (all zeros = not a tournament match) - 8-byte aligned
}

// DO NOT manually implement Pod/Zeroable - Anchor's macro will derive them
// If this fails, the explicit padding fields need adjustment

impl Match {
    // MAX_SIZE needed for account initialization (space parameter)
    // With #[repr(C)], includes explicit padding fields
    pub const MAX_SIZE: usize = 8 +      // discriminator
        36 + 4 +                         // match_id + _padding1
        10 + 20 +                        // version + game_name (arrays, 1-byte aligned)
        1 + 1 + 4 +                      // game_type + _padding2 + seed
        1 + 1 + 1 + 1 +                  // phase + current_player + player_count + _padding3
        (64 * 10) +                      // player_ids
        2 + 6 +                          // move_count + _padding4
        8 + 8 +                          // created_at + ended_at
        32 + 200 + 32 +                  // match_hash + hot_url + authority
        5 + 1 + 2 +                      // declared_suits + flags + _padding5
        32 + 10 + 320 +                  // floor_card_hash + hand_sizes + committed_hand_hashes
        6 +                              // _padding6 (to align last_nonce to 8 bytes)
        (8 * 10) +                       // last_nonce (u64 array, 8-byte aligned)
        8 + 8 +                          // entry_fee_lamports + prize_pool_lamports
        1 + 1 + 6 +                      // match_type + payment_method + _padding7
        16; // tournament_id

    /// Get game config from registry. Requires GameRegistry account to be passed.
    /// This method is used by instructions that have access to the registry.
    pub fn get_game_config_from_registry(&self, registry: &GameRegistry) -> Result<GameConfig> {
        use crate::error::GameError;
        let game_def = registry
            .find_game(self.game_type)
            .ok_or(GameError::InvalidPayload)?;

        Ok(GameConfig {
            min_players: game_def.min_players,
            max_players: game_def.max_players,
        })
    }

    /// Check if match is full. Requires GameRegistry account.
    pub fn is_full(&self, registry: &GameRegistry) -> Result<bool> {
        let config = self.get_game_config_from_registry(registry)?;
        Ok(self.player_count >= config.max_players)
    }

    /// Check if match has minimum players. Requires GameRegistry account.
    pub fn has_minimum_players(&self, registry: &GameRegistry) -> Result<bool> {
        let config = self.get_game_config_from_registry(registry)?;
        Ok(self.player_count >= config.min_players)
    }

    /// Get minimum players. Requires GameRegistry account.
    pub fn get_min_players(&self, registry: &GameRegistry) -> Result<u8> {
        let config = self.get_game_config_from_registry(registry)?;
        Ok(config.min_players)
    }

    /// Get maximum players. Requires GameRegistry account.
    pub fn get_max_players(&self, registry: &GameRegistry) -> Result<u8> {
        let config = self.get_game_config_from_registry(registry)?;
        Ok(config.max_players)
    }

    /// Check if match can accept new players. Requires GameRegistry account.
    pub fn can_join(&self, registry: &GameRegistry) -> Result<bool> {
        if self.phase != 0 {
            return Ok(false); // Only in Dealing phase
        }
        if self.all_players_joined() {
            return Ok(false);
        }
        let is_full = self.is_full(registry)?;
        Ok(!is_full)
    }

    /// Get current phase as u8 (0=Dealing, 1=Playing, 2=Ended)
    pub fn get_phase(&self) -> u8 {
        self.phase
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
        self.declared_suits[byte_index] =
            (self.declared_suits[byte_index] & !mask) | (suit_value << bit_offset);
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
            if stored_id.starts_with(user_id) && stored_id[user_id.len()..].iter().all(|&b| b == 0)
            {
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

    // Phase 02: Paid match helper methods
    pub fn is_paid_match(&self) -> bool {
        self.match_type == crate::state::enums::match_type::PAID
    }

    pub fn is_free_match(&self) -> bool {
        self.match_type == crate::state::enums::match_type::FREE
    }

    pub fn get_payment_method(&self) -> u8 {
        self.payment_method
    }

    pub fn is_wallet_payment(&self) -> bool {
        self.payment_method == crate::state::enums::payment_method::WALLET
    }

    pub fn is_platform_payment(&self) -> bool {
        self.payment_method == crate::state::enums::payment_method::PLATFORM
    }

    pub fn get_tournament_id(&self) -> Option<[u8; 16]> {
        if self.tournament_id.iter().all(|&b| b == 0) {
            None
        } else {
            Some(self.tournament_id)
        }
    }

    pub fn set_tournament_id(&mut self, tournament_id: [u8; 16]) {
        self.tournament_id = tournament_id;
    }

    pub fn clear_tournament_id(&mut self) {
        self.tournament_id = [0u8; 16];
    }
}
