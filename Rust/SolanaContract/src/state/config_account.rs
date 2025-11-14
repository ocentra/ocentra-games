use anchor_lang::prelude::*;

/// ConfigAccount stores economic model parameters.
/// Per spec Section 20.1.1: Global configuration for token system.
#[account]
pub struct ConfigAccount {
    pub authority: Pubkey,                 // Authority that can update config
    
    // AC (AI Credits) pricing
    pub ac_price_usd: [u8; 8],            // Price of AC in USD (f64 as bytes, 0.01 = $0.01 per AC)
    pub ac_price_lamports: u64,           // Price of 1 AC in lamports (for on-chain reference)
    
    // GP (Game Points) configuration
    pub gp_daily_amount: u64,             // Daily GP distribution (e.g., 1000)
    pub gp_cost_per_game: u32,            // GP cost to start a game
    pub gp_per_ad: u32,                   // GP reward per ad watched
    pub max_daily_ads: u8,                // Maximum ads per day
    pub max_gp_balance: u64,              // Maximum GP balance cap
    
    // Ad system configuration
    pub ad_cooldown_seconds: i64,         // Cooldown between ads (300 seconds)
    
    // Subscription configuration
    pub pro_gp_multiplier: u8,            // Pro subscription GP multiplier (2x or 3x)
    
    // Dispute system configuration
    pub dispute_deposit_gp: u32,          // GP deposit required to file dispute (e.g., 100 GP)
    
    // AI model costs (per 1k tokens for each model)
    // Fixed array of 10 models (saves 4 bytes vs Vec)
    pub ai_model_costs: [u32; 10],        // Cost per 1k tokens for each model
    
    // Leaderboard configuration
    pub current_season_id: u64,           // Current active season ID
    pub season_duration_seconds: i64,     // Season duration (604800 = 7 days)
    
    // Timestamps
    pub created_at: i64,                  // Account creation timestamp
    pub last_updated: i64,                // Last update timestamp
}

impl ConfigAccount {
    pub const MAX_SIZE: usize = 8 +        // discriminator
        32 +                                // authority (Pubkey)
        8 +                                 // ac_price_usd (f64 as [u8; 8])
        8 +                                 // ac_price_lamports (u64)
        8 +                                 // gp_daily_amount (u64)
        4 +                                 // gp_cost_per_game (u32)
        4 +                                 // gp_per_ad (u32)
        1 +                                 // max_daily_ads (u8)
        8 +                                 // max_gp_balance (u64)
        8 +                                 // ad_cooldown_seconds (i64)
        1 +                                 // pro_gp_multiplier (u8)
        4 +                                 // dispute_deposit_gp (u32)
        (4 * 10) +                         // ai_model_costs ([u32; 10] = 40 bytes)
        8 +                                 // current_season_id (u64)
        8 +                                 // season_duration_seconds (i64)
        8 +                                 // created_at (i64)
        8;                                  // last_updated (i64)
    
    // Total: 8 + 32 + 8 + 8 + 8 + 4 + 4 + 1 + 8 + 8 + 1 + 4 + 40 + 8 + 8 + 8 + 8 = 174 bytes
    
    pub fn get_ac_price_usd(&self) -> f64 {
        // Convert [u8; 8] back to f64
        f64::from_le_bytes(self.ac_price_usd)
    }
    
    pub fn set_ac_price_usd(&mut self, price: f64) {
        self.ac_price_usd = price.to_le_bytes();
    }
}

