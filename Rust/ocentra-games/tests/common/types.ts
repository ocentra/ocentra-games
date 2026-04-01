/**
 * Shared TypeScript types for Anchor account data
 * Handles both camelCase and snake_case property names from Anchor IDL
 */

// Type for ConfigAccount that handles both camelCase and snake_case property names
export type ConfigAccountType = {
  isPaused?: boolean
  is_paused?: boolean
  withdrawalFeeLamports?: { toNumber(): number }
  withdrawal_fee_lamports?: { toNumber(): number }
  platformFeeBps?: number
  platform_fee_bps?: number
  minEntryFee?: { toNumber(): number }
  min_entry_fee?: { toNumber(): number }
  maxEntryFee?: { toNumber(): number }
  max_entry_fee?: { toNumber(): number }
  treasuryMultisig?:
    | { toString(): string; equals(other: { toString(): string }): boolean }
    | { toString(): string }
  treasury_multisig?:
    | { toString(): string; equals(other: { toString(): string }): boolean }
    | { toString(): string }
  supportedPaymentMethods?: number
  supported_payment_methods?: number
  cancellationFeeBps?: number
  cancellation_fee_bps?: number
  kycTierWallet?: number
  kyc_tier_wallet?: number
  kycTierPlatform?: number
  kyc_tier_platform?: number
  authority?:
    | { toString(): string; equals(other: { toString(): string }): boolean }
    | { toString(): string }
}

// Type for UserDepositAccount that handles both camelCase and snake_case property names
export type UserDepositAccountType = {
  authority?: { toString(): string }
  bump?: number
  totalDeposited?: { toNumber(): number }
  total_deposited?: { toNumber(): number }
  availableLamports?: { toNumber(): number }
  available_lamports?: { toNumber(): number }
  inPlayLamports?: { toNumber(): number }
  in_play_lamports?: { toNumber(): number }
  withdrawnLamports?: { toNumber(): number }
  withdrawn_lamports?: { toNumber(): number }
  flags?: number
  lockedUntil?: { toNumber(): number }
  locked_until?: { toNumber(): number }
}

// Type for EscrowAccount that handles both camelCase and snake_case property names
export type EscrowAccountType = {
  matchPda?: { toString(): string }
  match_pda?: { toString(): string }
  bump?: number
  totalEntryLamports?: { toNumber(): number }
  total_entry_lamports?: { toNumber(): number }
  playerStakes?: Array<{ toNumber(): number }>
  player_stakes?: Array<{ toNumber(): number }>
  statusFlags?: number
  status_flags?: number
}

// Type for Match account that handles both camelCase and snake_case property names
export type MatchAccountType = {
  matchId?: number[]
  match_id?: number[]
  playerCount?: number
  player_count?: number
  phase?: number
  matchType?: number
  match_type?: number
  entryFeeLamports?: { toNumber(): number }
  entry_fee_lamports?: { toNumber(): number }
  prizePoolLamports?: { toNumber(): number }
  prize_pool_lamports?: { toNumber(): number }
  paymentMethod?: number
  payment_method?: number
  tournamentId?: number[]
  tournament_id?: number[]
}
