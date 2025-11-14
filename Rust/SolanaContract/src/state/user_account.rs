use anchor_lang::prelude::*;

/// UserAccount stores user statistics and aggregates for leaderboards.
/// Token balances (GP/AC) are stored in database, not on-chain.
/// Per spec Section 20.1.1: Database is source of truth for balances.
#[account]
pub struct UserAccount {
    // User identification (Firebase UID, not Solana pubkey)
    pub user_id: [u8; 64],              // Fixed-size Firebase UID (max 64 bytes, null-padded)
    
    // Daily login tracking
    pub last_claim: i64,                  // Last daily login claim timestamp (0 = never claimed)
    pub last_ad_watch: i64,               // Last ad watch timestamp (0 = never watched)
    
    // Subscription info
    pub subscription_expiry: i64,         // Subscription expiry timestamp (0 = no subscription)
    pub subscription_tier: u8,            // 0=Free, 1=Pro, 2=ProPlus
    
    // Lifetime stats (for leaderboards and tier calculation)
    pub lifetime_gp_earned: u64,          // Total GP earned (lifetime)
    pub games_played: u32,                // Total games played
    pub games_won: u32,                    // Total games won
    pub win_streak: u32,                   // Current win streak
    pub total_ac_spent: u64,               // Total AC spent (lifetime)
    pub api_calls_made: u32,               // Total API calls made
    
    // Season stats (for leaderboards)
    pub current_tier: u8,                  // Current tier (0-5: Bronze, Silver, Gold, Platinum, Diamond, Master)
    pub current_season_id: u64,            // Current season ID (timestamp / 604800)
    pub season_score: u64,                 // Score this season
    pub season_wins: u32,                  // Wins this season
    pub season_games: u32,                 // Games played this season
    pub leaderboard_rank: u16,             // 0 = not ranked, 1-100 = rank
    pub active_multiplier: u8,             // Reward multiplier (1-5x based on rank)
}

impl UserAccount {
    pub const MAX_SIZE: usize = 8 +        // discriminator
        64 +                                // user_id (fixed [u8; 64])
        8 +                                 // last_claim (i64)
        8 +                                 // last_ad_watch (i64)
        8 +                                 // subscription_expiry (i64)
        1 +                                 // subscription_tier (u8)
        8 +                                 // lifetime_gp_earned (u64)
        4 +                                 // games_played (u32)
        4 +                                 // games_won (u32)
        4 +                                 // win_streak (u32)
        8 +                                 // total_ac_spent (u64)
        4 +                                 // api_calls_made (u32)
        1 +                                 // current_tier (u8)
        8 +                                 // current_season_id (u64)
        8 +                                 // season_score (u64)
        4 +                                 // season_wins (u32)
        4 +                                 // season_games (u32)
        2 +                                 // leaderboard_rank (u16)
        1;                                  // active_multiplier (u8)
    
    // Total: 8 + 64 + 8 + 8 + 8 + 1 + 8 + 4 + 4 + 4 + 8 + 4 + 1 + 8 + 8 + 4 + 4 + 2 + 1 = 161 bytes
    
    pub fn has_active_subscription(&self, clock: &Clock) -> bool {
        self.subscription_expiry > clock.unix_timestamp && self.subscription_tier > 0
    }
    
    pub fn can_claim_daily(&self, clock: &Clock) -> bool {
        let time_since_last_claim = clock.unix_timestamp - self.last_claim;
        time_since_last_claim >= 86400 // 24 hours in seconds
    }
    
    pub fn can_watch_ad(&self, clock: &Clock, cooldown_seconds: i64) -> bool {
        let time_since_last_ad = clock.unix_timestamp - self.last_ad_watch;
        time_since_last_ad >= cooldown_seconds
    }
    
    pub fn calculate_tier(lifetime_gp: u64) -> u8 {
        match lifetime_gp {
            0..=999 => 0,           // Bronze
            1000..=4999 => 1,       // Silver
            5000..=19999 => 2,      // Gold
            20000..=49999 => 3,     // Platinum
            50000..=99999 => 4,     // Diamond
            _ => 5,                 // Master
        }
    }
    
    pub fn calculate_score(wins: u32, games: u32) -> u64 {
        let win_rate = if games > 0 {
            (wins as u64 * 10_000) / games as u64
        } else {
            0
        };
        (wins as u64 * 1_000_000) + win_rate
    }
    
    pub fn calculate_multiplier(rank: u16) -> u8 {
        match rank {
            0 => 1,                 // Not ranked
            1..=5 => 5,              // Top 5: 5x
            6..=10 => 4,             // Top 10: 4x
            11..=25 => 3,            // Top 25: 3x
            26..=50 => 2,            // Top 50: 2x
            _ => 1,                  // 51-100: 1x
        }
    }
}

