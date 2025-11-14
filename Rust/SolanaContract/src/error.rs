use anchor_lang::prelude::*;

#[error_code]
pub enum GameError {
    #[msg("Match is full")]
    MatchFull,
    
    #[msg("Invalid game phase")]
    InvalidPhase,
    
    #[msg("Not player's turn")]
    NotPlayerTurn,
    
    #[msg("Player not in match")]
    PlayerNotInMatch,
    
    #[msg("Invalid action")]
    InvalidAction,
    
    #[msg("Invalid payload")]
    InvalidPayload,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Match not found")]
    MatchNotFound,
    
    #[msg("Move validation failed")]
    MoveValidationFailed,
    
    #[msg("Match already ended")]
    MatchAlreadyEnded,
    
    #[msg("Match not ready")]
    MatchNotReady,
    
    #[msg("Invalid move index")]
    InvalidMoveIndex,
    
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    
    #[msg("Insufficient funds")]
    InsufficientFunds,
    
    #[msg("Not enough players to start match (minimum 2 required)")]
    InsufficientPlayers,
    
    #[msg("Signer already exists in registry")]
    SignerAlreadyExists,
    
    #[msg("Signer registry is full")]
    SignerRegistryFull,
    
    #[msg("Signer not found in registry")]
    SignerNotFound,
    
    #[msg("Invalid batch ID")]
    InvalidBatchId,
    
    #[msg("Dispute not found")]
    DisputeNotFound,
    
    #[msg("Dispute already resolved")]
    DisputeAlreadyResolved,
    
    #[msg("Insufficient GP balance for dispute deposit")]
    InsufficientGPForDispute,
    
    #[msg("GP deposit already processed")]
    GPDepositAlreadyProcessed,
    
    #[msg("Invalid nonce - must be greater than last nonce")]
    InvalidNonce,
    
    #[msg("Card hash mismatch - cards don't match committed hand")]
    CardHashMismatch,
    
    // Economic model errors (Section 20)
    #[msg("Daily claim cooldown active - must wait 24 hours")]
    DailyClaimCooldown,
    
    #[msg("Ad cooldown active - must wait before watching another ad")]
    AdCooldownActive,
    
    #[msg("Invalid ad verification signature")]
    InvalidAdVerification,
    
    #[msg("Invalid subscription tier")]
    InvalidTier,
    
    #[msg("Arithmetic overflow")]
    Overflow,
    
    #[msg("Insufficient GP balance")]
    InsufficientGP,
    
    #[msg("Insufficient AC balance")]
    InsufficientAC,
    
    #[msg("Maximum daily ads limit reached")]
    MaxDailyAdsReached,
    
    #[msg("GP balance exceeds maximum cap")]
    GPBalanceExceeded,
}

