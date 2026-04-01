/// Match type constants (replaces enum to reduce program size)
pub mod match_type {
    pub const FREE: u8 = 0;
    pub const PAID: u8 = 1;
}

/// Payment method constants (replaces enum to reduce program size)
pub mod payment_method {
    pub const WALLET: u8 = 0; // Direct wallet payment (SOL from user's wallet)
    pub const PLATFORM: u8 = 1; // Platform deposit payment (SOL from user's deposit account)
}

/// KYC/Custody tier constants
pub mod kyc_tier {
    pub const NONE: u8 = 0; // No KYC required
    pub const BASIC: u8 = 1; // Basic KYC (email verification)
    pub const ENHANCED: u8 = 2; // Enhanced KYC (ID verification)
    pub const INSTITUTIONAL: u8 = 3; // Institutional (full compliance)
}

/// Match cancellation reason constants (stored in EscrowAccount.status_flags bits 3-5)
pub mod cancellation_reason {
    pub const PLATFORM_FAULT: u8 = 0;        // Platform issue (full refunds, no platform fee)
    pub const PLAYER_ABANDONMENT: u8 = 1;    // Player left/disconnected (abandoned player forfeits)
    pub const INSUFFICIENT_PLAYERS: u8 = 2;  // Not enough players joined (full refunds, small fee)
    pub const TIMEOUT: u8 = 3;               // Player timeout (abandoned player forfeits)
    pub const GRACE_PERIOD_EXPIRED: u8 = 4;  // Reconnection grace period expired (abandoned player forfeits)
    // Values 5-7: reserved for future use
}
