use anchor_lang::prelude::*;

#[account]
pub struct BatchAnchor {
    pub batch_id: [u8; 50],         // Fixed-size byte array (saves 4 bytes vs String)
    pub merkle_root: [u8; 32],
    pub count: u32,                  // Reduced from u64 (max 4B matches per batch is sufficient)
    pub first_match_id: [u8; 36],   // Fixed-size UUID (saves 4 bytes vs String)
    pub last_match_id: [u8; 36],    // Fixed-size UUID (saves 4 bytes vs String)
    pub timestamp: i64,
    pub authority: Pubkey,
}

impl BatchAnchor {
    pub const MAX_SIZE: usize = 8 +      // discriminator
        50 +                             // batch_id (fixed [u8; 50])
        32 +                             // merkle_root
        4 +                              // count (u32, reduced from u64)
        36 +                             // first_match_id (fixed [u8; 36])
        36 +                             // last_match_id (fixed [u8; 36])
        8 +                              // timestamp
        32;                              // authority
    
    // Total: 8 + 50 + 32 + 4 + 36 + 36 + 8 + 32 = 206 bytes
    // Previous: ~230 bytes (saved ~24 bytes)
}

