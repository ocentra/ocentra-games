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

    // Game registry errors
    #[msg("Game already exists in registry")]
    GameAlreadyExists,

    #[msg("Game registry is full (maximum 20 games)")]
    GameRegistryFull,

    // Governance errors (Phase 01)
    #[msg("Program is paused - paid matches are temporarily disabled")]
    ProgramPaused,

    #[msg("Invalid fee parameter - value out of bounds")]
    InvalidFeeParameter,

    // Economic instruction errors (Phase 03)
    #[msg("Account is frozen - deposits and withdrawals are disabled")]
    AccountFrozen,

    #[msg("Account is locked - withdrawals are disabled until lock period expires")]
    AccountLocked,

    #[msg("Escrow already distributed - prizes have already been paid out")]
    EscrowAlreadyDistributed,

    #[msg("Escrow not funded - not all players have paid entry fees")]
    EscrowNotFunded,

    #[msg("Match not ended - cannot distribute prizes until match ends")]
    MatchNotEnded,

    #[msg("Match not cancelled - cannot refund escrow for active or ended matches")]
    MatchNotCancelled,

    #[msg("Invalid payment method - payment method mismatch")]
    InvalidPaymentMethod,
}
