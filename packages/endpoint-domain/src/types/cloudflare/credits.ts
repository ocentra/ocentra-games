/**
 * Credits endpoint request/response types.
 */

import type { UserId, TransactionId, Timestamp, Currency, PaginationParams } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for transaction history.
 */
export interface TransactionHistoryQuery extends PaginationParams {
  currency?: 'GP' | 'AC';
  type?: 'award' | 'purchase' | 'consume';
  start_date?: Timestamp;
  end_date?: Timestamp;
}

// ============================================================================
// Request Bodies
// ============================================================================

/**
 * Award credits request.
 */
export interface AwardCreditsRequest {
  amount: number;
  currency: 'GP';
  reason: 'win' | 'daily_login' | 'achievement' | 'referral' | 'other';
  description?: string;
  match_id?: string;
}

/**
 * Purchase credits request.
 */
export interface PurchaseCreditsRequest {
  amount: number;
  currency: 'AC';
  payment_method: 'solana' | 'stripe' | 'paypal';
  payment_token: string;
  metadata?: Record<string, unknown>;
}

/**
 * Consume credits request.
 */
export interface ConsumeCreditsRequest {
  amount: number;
  currency: Currency;
  reason: 'match_entry' | 'premium_feature' | 'item_purchase' | 'other';
  description?: string;
  match_id?: string;
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Credit balance response (flat format per ARCHITECTURE).
 */
export interface CreditBalanceResponse {
  user_id: UserId;
  gp_balance: number;
  ac_balance: number;
  total_gp_earned: number;
  total_ac_purchased: number;
  total_ac_spent: number;
  updated_at: Timestamp;
}

/**
 * Transaction record.
 */
export interface Transaction {
  transaction_id: TransactionId;
  type: 'award' | 'purchase' | 'consume';
  currency: Currency;
  amount: number;
  balance_after: number;
  reason: string;
  description?: string;
  match_id?: string;
  created_at: Timestamp;
}

/**
 * Transaction history response.
 */
export interface TransactionHistoryResponse {
  transactions: Transaction[];
  cursor?: string;
  has_more: boolean;
}

/**
 * Credit operation response.
 */
export interface CreditOperationResponse {
  success: boolean;
  transaction_id: TransactionId;
  new_balance: number;
  currency: Currency;
}
