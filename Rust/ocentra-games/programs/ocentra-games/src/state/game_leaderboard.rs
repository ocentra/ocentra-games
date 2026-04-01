use anchor_lang::prelude::*;

/// LeaderboardEntry represents a single entry in the leaderboard.
/// Per spec Section 20.1.6: Per-game-type leaderboards with top 100 entries.
#[repr(C)]
#[derive(
    Clone, Copy, PartialEq, AnchorSerialize, AnchorDeserialize, bytemuck::Pod, bytemuck::Zeroable,
)]
pub struct LeaderboardEntry {
    pub user_id: [u8; 64], // User ID from database (Firebase UID, fixed 64 bytes, null-padded)
    pub score: u64,        // Calculated score (8 bytes) - 8-byte aligned
    pub wins: u32,         // Wins this season (4 bytes)
    pub games_played: u32, // Games this season (4 bytes)
    pub timestamp: u32,    // Last update timestamp (u32, relative to epoch, saves 4 bytes)
    pub _padding: [u8; 4], // Explicit padding to align to 8 bytes
}

impl LeaderboardEntry {
    pub const SIZE: usize = 64 + 8 + 4 + 4 + 4 + 4; // 88 bytes per entry (with explicit padding)
}

/// GameLeaderboard stores top 100 players per game type per season.
/// Per spec Section 20.1.6: One leaderboard per game type per season.
/// Uses zero-copy to avoid stack overflow (8,426 bytes > 4,096 byte stack limit).
#[repr(C)]
#[account(zero_copy)]
pub struct GameLeaderboard {
    pub game_type: u8,      // Game type (0=CLAIM, 1=Poker, 2=WordSearch, etc.)
    pub _padding1: [u8; 7], // Explicit padding to align season_id to 8 bytes
    pub season_id: u64,     // Season ID (timestamp / 604800) - 8-byte aligned
    pub entry_count: u8,    // Number of entries (0-100)
    pub _padding2: [u8; 7], // Explicit padding to align entries array
    pub entries: [LeaderboardEntry; 100], // Top 100 entries (fixed array)
    pub last_updated: i64,  // Last update timestamp - 8-byte aligned
}

// DO NOT manually implement Pod/Zeroable - Anchor's macro will derive them

impl GameLeaderboard {
    // MAX_SIZE needed for account initialization (space parameter)
    // With #[repr(C)], includes explicit padding fields
    pub const MAX_SIZE: usize = 8 +      // discriminator
        1 + 7 +                          // game_type + _padding1
        8 +                              // season_id
        1 + 7 +                          // entry_count + _padding2
        (88 * 100) +                     // entries (LeaderboardEntry: 88 bytes each × 100 = 8800 bytes)
        8; // last_updated

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
        let qualifies = (self.entry_count as usize) < 100
            || (self.entry_count > 0
                && score > self.entries[(self.entry_count - 1) as usize].score);

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
                    self.entries[i] = self.entries[i + 1];
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
                self.entries[i + 1] = self.entries[i];
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
