use anchor_lang::prelude::*;

/// GameDefinition represents a single game in the registry.
/// Per spec Section 16.5: Game registry system.
/// Uses fixed-size arrays for optimization (no String/Vec overhead).
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub struct GameDefinition {
    pub game_id: u8,                    // Unique game identifier (0-255)
    pub name: [u8; 20],                 // Game name (fixed 20 bytes, null-padded) - "CLAIM", "Poker", etc.
    pub min_players: u8,                 // Minimum players required
    pub max_players: u8,                 // Maximum players allowed
    pub rule_engine_url: [u8; 200],      // Off-chain rule engine endpoint (fixed 200 bytes, null-padded)
    pub version: u8,                     // Game version (for updates)
    pub enabled: bool,                   // Is game enabled?
}

impl GameDefinition {
    pub const SIZE: usize = 1 +           // game_id (u8)
        20 +                               // name ([u8; 20])
        1 +                                // min_players (u8)
        1 +                                // max_players (u8)
        200 +                              // rule_engine_url ([u8; 200])
        1 +                                // version (u8)
        1;                                 // enabled (bool)
    
    // Total: 1 + 20 + 1 + 1 + 200 + 1 + 1 = 225 bytes per entry
    
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
#[account]
pub struct GameRegistry {
    pub authority: Pubkey,                // Authority that can register/update games
    pub game_count: u8,                   // Number of registered games (0-20)
    pub games: [GameDefinition; 20],      // Fixed array of up to 20 games (saves 4 bytes vs Vec)
    pub last_updated: i64,                 // Last update timestamp
}

impl GameRegistry {
    pub const MAX_SIZE: usize = 8 +        // discriminator
        32 +                                // authority (Pubkey)
        1 +                                 // game_count (u8)
        (GameDefinition::SIZE * 20) +      // games ([GameDefinition; 20] = 4500 bytes)
        8;                                  // last_updated (i64)
    
    // Total: 8 + 32 + 1 + 4500 + 8 = 4549 bytes (within 10KB limit)
    
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
        require!(
            (self.game_count as usize) < 20,
            GameError::InvalidPayload
        );
        
        // Check if game_id already exists
        require!(
            self.find_game(game.game_id).is_none(),
            GameError::InvalidPayload
        );
        
        self.games[self.game_count as usize] = game;
        self.game_count += 1;
        Ok(())
    }
    
    /// Updates an existing game.
    pub fn update_game(&mut self, game_id: u8, updated_game: GameDefinition) -> Result<()> {
        use crate::error::GameError;
        let game = self.find_game_mut(game_id)
            .ok_or(GameError::InvalidPayload)?;
        
        // Ensure game_id doesn't change
        require!(
            updated_game.game_id == game_id,
            GameError::InvalidPayload
        );
        
        *game = updated_game;
        Ok(())
    }
    
    /// Removes a game from the registry (by setting enabled = false).
    pub fn disable_game(&mut self, game_id: u8) -> Result<()> {
        use crate::error::GameError;
        let game = self.find_game_mut(game_id)
            .ok_or(GameError::InvalidPayload)?;
        
        game.enabled = false;
        Ok(())
    }
    
    /// Gets all enabled games.
    pub fn get_enabled_games(&self) -> Vec<&GameDefinition> {
        let mut enabled = Vec::new();
        for i in 0..self.game_count as usize {
            if self.games[i].enabled {
                enabled.push(&self.games[i]);
            }
        }
        enabled
    }
}

