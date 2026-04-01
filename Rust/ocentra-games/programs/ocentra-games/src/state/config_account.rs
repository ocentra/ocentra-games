use anchor_lang::prelude::*;

/// ConfigAccount stores economic model parameters.
/// Per spec Section 20.1.1: Global configuration for token system.
#[account]
pub struct ConfigAccount {
    pub authority: Pubkey, // Authority that can update config

    // AC (AI Credits) pricing
    pub ac_price_usd: [u8; 8], // Price of AC in USD (f64 as bytes, 0.01 = $0.01 per AC)
    pub ac_price_lamports: u64, // Price of 1 AC in lamports (for on-chain reference)

    // GP (Game Points) configuration
    pub gp_daily_amount: u64,  // Daily GP distribution (e.g., 1000)
    pub gp_cost_per_game: u32, // GP cost to start a game
    pub gp_per_ad: u32,        // GP reward per ad watched
    pub max_daily_ads: u8,     // Maximum ads per day
    pub max_gp_balance: u64,   // Maximum GP balance cap

    // Ad system configuration
    pub ad_cooldown_seconds: i64, // Cooldown between ads (300 seconds)

    // Subscription configuration
    pub pro_gp_multiplier: u8, // Pro subscription GP multiplier (2x or 3x)

    // Dispute system configuration
    pub dispute_deposit_gp: u32, // GP deposit required to file dispute (e.g., 100 GP)

    // AI model costs (per 1k tokens for each model)
    // Fixed array of 10 models (saves 4 bytes vs Vec)
    pub ai_model_costs: [u32; 10], // Cost per 1k tokens for each model

    // Leaderboard configuration
    pub current_season_id: u64,       // Current active season ID
    pub season_duration_seconds: i64, // Season duration (604800 = 7 days)

    // Treasury and fee configuration (Phase 01)
    pub treasury_multisig: Pubkey, // Squads v4 multisig address for treasury operations
    pub platform_fee_bps: u16,     // Platform fee in basis points (500 = 5%)
    pub withdrawal_fee_lamports: u64, // Fixed withdrawal fee in lamports
    pub min_entry_fee: u64,        // Minimum entry fee per match in lamports
    pub max_entry_fee: u64,        // Maximum entry fee per match in lamports
    pub cancellation_fee_bps: u16, // Cancellation fee in basis points (250 = 2.5% of total entry fees)

    // Emergency controls
    pub is_paused: bool, // Global pause flag (pauses all paid matches)

    // Phase 02: KYC and payment method configuration
    pub kyc_tier_wallet: u8, // Minimum KYC tier required for wallet payments
    pub kyc_tier_platform: u8, // Minimum KYC tier required for platform payments
    pub supported_payment_methods: u8, // Bitmask: bit 0 = WALLET, bit 1 = PLATFORM
    pub _padding_phase02: [u8; 5], // Explicit padding to align timestamps to 8 bytes

    // Timestamps
    pub created_at: i64,   // Account creation timestamp
    pub last_updated: i64, // Last update timestamp
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
        32 +                                // treasury_multisig (Pubkey)
        2 +                                 // platform_fee_bps (u16)
        8 +                                 // withdrawal_fee_lamports (u64)
        8 +                                 // min_entry_fee (u64)
        8 +                                 // max_entry_fee (u64)
        2 +                                 // cancellation_fee_bps (u16)
        1 +                                 // is_paused (bool)
        1 +                                 // kyc_tier_wallet (u8)
        1 +                                 // kyc_tier_platform (u8)
        1 +                                 // supported_payment_methods (u8)
        5 +                                 // _padding_phase02
        8 +                                 // created_at (i64)
        8; // last_updated (i64)

    // Total: 8 + 32 + 8 + 8 + 8 + 4 + 4 + 1 + 8 + 8 + 1 + 4 + 40 + 8 + 8 + 32 + 2 + 8 + 8 + 8 + 8 + 1 + 1 + 1 + 1 + 5 + 8 + 8 = 248 bytes

    pub fn get_ac_price_usd(&self) -> f64 {
        // Convert [u8; 8] back to f64
        f64::from_le_bytes(self.ac_price_usd)
    }

    pub fn set_ac_price_usd(&mut self, price: f64) {
        self.ac_price_usd = price.to_le_bytes();
    }

    // Phase 02: Payment method helpers
    pub fn is_payment_method_supported(&self, payment_method: u8) -> bool {
        match payment_method {
            crate::state::enums::payment_method::WALLET => {
                (self.supported_payment_methods & 0x01) != 0
            }
            crate::state::enums::payment_method::PLATFORM => {
                (self.supported_payment_methods & 0x02) != 0
            }
            _ => false,
        }
    }

    pub fn get_required_kyc_tier(&self, payment_method: u8) -> u8 {
        match payment_method {
            crate::state::enums::payment_method::WALLET => self.kyc_tier_wallet,
            crate::state::enums::payment_method::PLATFORM => self.kyc_tier_platform,
            _ => crate::state::enums::kyc_tier::NONE,
        }
    }
}
