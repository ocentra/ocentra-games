use anchor_lang::prelude::*;

/// GameDefinition represents a single game in the registry.
/// Per spec Section 16.5: Game registry system.
/// Uses fixed-size arrays for optimization (no String/Vec overhead).
#[repr(C)]
#[derive(
    Clone, Copy, PartialEq, AnchorSerialize, AnchorDeserialize, bytemuck::Pod, bytemuck::Zeroable,
)]
pub struct GameDefinition {
    pub game_id: u8,                // Unique game identifier (0-255)
    pub name: [u8; 20], // Game name (fixed 20 bytes, null-padded) - "CLAIM", "Poker", etc.
    pub min_players: u8, // Minimum players required
    pub max_players: u8, // Maximum players allowed
    pub rule_engine_url: [u8; 200], // Off-chain rule engine endpoint (fixed 200 bytes, null-padded)
    pub version: u8,    // Game version (for updates)
    pub enabled: u8,    // Is game enabled? (u8 instead of bool for zero-copy compatibility)
    pub _padding: [u8; 6], // Explicit padding to align to 8 bytes (225 + 6 = 231, but we'll keep 225 for now)
}

impl GameDefinition {
    pub const SIZE: usize = 1 +           // game_id (u8)
        20 +                               // name ([u8; 20])
        1 +                                // min_players (u8)
        1 +                                // max_players (u8)
        200 +                              // rule_engine_url ([u8; 200])
        1 +                                // version (u8)
        1 +                                // enabled (u8)
        6; // _padding

    // Total: 1 + 20 + 1 + 1 + 200 + 1 + 1 + 6 = 231 bytes per entry

    pub fn get_name_string(&self) -> String {
        String::from_utf8_lossy(&self.name)
            .trim_end_matches('\0')
            .to_string()
    }

    pub fn get_rule_engine_url_string(&self) -> String {
        String::from_utf8_lossy(&self.rule_engine_url)
            .trim_end_matches('\0')
            .to_string()
    }
}

/// GameRegistry stores all registered games.
/// Per spec Section 16.5: On-chain game registry.
/// Uses fixed-size array for optimization (max 20 games = 4500 bytes).
/// Uses zero-copy to avoid stack overflow (4,549 bytes > 4,096 byte stack limit).
#[repr(C)]
#[account(zero_copy)]
pub struct GameRegistry {
    pub authority: Pubkey, // Authority that can register/update games - [u8; 32], 1-byte aligned
    pub game_count: u8,    // Number of registered games (0-20)
    pub _padding1: [u8; 7], // Explicit padding to align games array (though arrays are 1-byte aligned)
    pub games: [GameDefinition; 20], // Fixed array of up to 20 games (saves 4 bytes vs Vec)
    pub _padding2: [u8; 4], // Explicit padding to align last_updated to 8 bytes
    pub last_updated: i64,  // Last update timestamp - 8-byte aligned
}

// DO NOT manually implement Pod/Zeroable - Anchor's macro will derive them

impl GameRegistry {
    // MAX_SIZE needed for account initialization (space parameter)
    // With #[repr(C)], includes explicit padding fields
    pub const MAX_SIZE: usize = 8 +      // discriminator
        32 +                              // authority
        1 + 7 +                           // game_count + _padding1
        (231 * 20) +                      // games (GameDefinition: 231 bytes each × 20 = 4620 bytes)
        4 +                               // _padding2
        8; // last_updated

    /// Finds a game by game_id.
    pub fn find_game(&self, game_id: u8) -> Option<&GameDefinition> {
        for i in 0..self.game_count as usize {
            if self.games[i].game_id == game_id {
                return Some(&self.games[i]);
            }
        }
        None
    }

    /// Finds a game by game_id (mutable).
    pub fn find_game_mut(&mut self, game_id: u8) -> Option<&mut GameDefinition> {
        for i in 0..self.game_count as usize {
            if self.games[i].game_id == game_id {
                return Some(&mut self.games[i]);
            }
        }
        None
    }

    /// Adds a new game to the registry.
    pub fn add_game(&mut self, game: GameDefinition) -> Result<()> {
        use crate::error::GameError;

        // Check if registry is full
        require!((self.game_count as usize) < 20, GameError::GameRegistryFull);

        // Check if game_id already exists
        require!(
            self.find_game(game.game_id).is_none(),
            GameError::GameAlreadyExists
        );

        self.games[self.game_count as usize] = game;
        self.game_count += 1;
        Ok(())
    }

    /// Updates an existing game.
    pub fn update_game(&mut self, game_id: u8, updated_game: GameDefinition) -> Result<()> {
        use crate::error::GameError;
        let game = self
            .find_game_mut(game_id)
            .ok_or(GameError::InvalidPayload)?;

        // Ensure game_id doesn't change
        require!(updated_game.game_id == game_id, GameError::InvalidPayload);

        *game = updated_game;
        Ok(())
    }

    /// Removes a game from the registry (by setting enabled = false).
    pub fn disable_game(&mut self, game_id: u8) -> Result<()> {
        use crate::error::GameError;
        let game = self
            .find_game_mut(game_id)
            .ok_or(GameError::InvalidPayload)?;

        game.enabled = 0;
        Ok(())
    }

    /// Gets all enabled games.
    /// Note: Returns a fixed-size array slice instead of Vec for zero-copy compatibility.
    pub fn get_enabled_games(&self) -> impl Iterator<Item = &GameDefinition> {
        (0..self.game_count as usize)
            .map(move |i| &self.games[i])
            .filter(|g| g.enabled != 0)
    }
}
