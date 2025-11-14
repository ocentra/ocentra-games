use anchor_lang::prelude::*;

/// LeaderboardEntry represents a single entry in the leaderboard.
/// Per spec Section 20.1.6: Per-game-type leaderboards with top 100 entries.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub struct LeaderboardEntry {
    pub user_id: [u8; 64],                // User ID from database (Firebase UID, fixed 64 bytes, null-padded)
    pub score: u64,                       // Calculated score (8 bytes)
    pub wins: u32,                        // Wins this season (4 bytes)
    pub games_played: u32,                // Games this season (4 bytes)
    pub timestamp: i64,                    // Last update timestamp (8 bytes)
}

impl LeaderboardEntry {
    pub const SIZE: usize = 64 + 8 + 4 + 4 + 8; // 88 bytes per entry
}

/// GameLeaderboard stores top 100 players per game type per season.
/// Per spec Section 20.1.6: One leaderboard per game type per season.
#[account]
pub struct GameLeaderboard {
    pub game_type: u8,                    // Game type (0=CLAIM, 1=Poker, 2=WordSearch, etc.)
    pub season_id: u64,                   // Season ID (timestamp / 604800)
    pub entry_count: u8,                  // Number of entries (0-100)
    pub entries: [LeaderboardEntry; 100], // Top 100 entries (fixed array)
    pub last_updated: i64,                // Last update timestamp
}

impl GameLeaderboard {
    pub const MAX_SIZE: usize = 8 +        // discriminator
        1 +                                 // game_type (u8)
        8 +                                 // season_id (u64)
        1 +                                 // entry_count (u8)
        (LeaderboardEntry::SIZE * 100) +   // entries ([LeaderboardEntry; 100] = 8800 bytes)
        8;                                  // last_updated (i64)
    
    // Total: 8 + 1 + 8 + 1 + 8800 + 8 = 8826 bytes (within 10KB limit)
    
    /// Find the insertion point for a new score using binary search.
    /// Returns the index where the entry should be inserted to maintain descending order.
    pub fn find_insertion_point(&self, score: u64) -> usize {
        let count = self.entry_count as usize;
        if count == 0 {
            return 0;
        }
        
        // Binary search for insertion point (descending order: highest score first)
        let mut left = 0;
        let mut right = count;
        
        while left < right {
            let mid = (left + right) / 2;
            if self.entries[mid].score > score {
                left = mid + 1;
            } else {
                right = mid;
            }
        }
        
        left
    }
    
    /// Insert or update an entry in the leaderboard.
    /// Returns true if the entry was inserted/updated, false if it doesn't qualify.
    pub fn insert_entry(&mut self, entry: LeaderboardEntry) -> bool {
        let score = entry.score;
        let user_id = entry.user_id;
        
        // Check if score qualifies (beats rank 100 OR entry_count < 100)
        let qualifies = (self.entry_count as usize) < 100 || 
                       (self.entry_count > 0 && score > self.entries[(self.entry_count - 1) as usize].score);
        
        if !qualifies {
            return false;
        }
        
        // Remove user's old entry if exists
        let mut old_index = None;
        for (i, e) in self.entries.iter().enumerate() {
            if i >= self.entry_count as usize {
                break;
            }
            if e.user_id == user_id {
                old_index = Some(i);
                break;
            }
        }
        
        if let Some(idx) = old_index {
            // Remove old entry, shift down
            for i in idx..((self.entry_count as usize).saturating_sub(1)) {
                if i + 1 < 100 {
                    self.entries[i] = self.entries[i + 1].clone();
                }
            }
            if self.entry_count > 0 {
                self.entry_count -= 1;
            }
        }
        
        // Find insertion point
        let insert_pos = self.find_insertion_point(score);
        
        // Shift entries down to make room
        let count = self.entry_count as usize;
        for i in (insert_pos..count).rev() {
            if i < 99 {
                self.entries[i + 1] = self.entries[i].clone();
            }
        }
        
        // Insert new entry
        if insert_pos < 100 {
            self.entries[insert_pos] = entry;
            if (self.entry_count as usize) < 100 {
                self.entry_count += 1;
            }
        }
        
        true
    }
    
    /// Get the rank of a user in the leaderboard.
    /// Returns 0 if not found, 1-100 if found.
    pub fn get_user_rank(&self, user_id: &[u8; 64]) -> u16 {
        for (i, entry) in self.entries.iter().enumerate() {
            if i >= self.entry_count as usize {
                break;
            }
            if entry.user_id == *user_id {
                return (i + 1) as u16;
            }
        }
        0
    }
}

