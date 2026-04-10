/**
 * Credits endpoint Zod schemas.
 */

import { z } from 'zod';
import { UserIdSchema, TransactionIdSchema, TimestampSchema, CurrencySchema, PaginationParamsSchema, IdempotencyKeySchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const TransactionHistoryQuerySchema = PaginationParamsSchema.extend({
  currency: z.enum(['GP', 'AC']).optional(),
  type: z.enum(['award', 'purchase', 'consume']).optional(),
  start_date: TimestampSchema.optional(),
  end_date: TimestampSchema.optional(),
});

// ============================================================================
// Request Bodies
// ============================================================================

export const AwardCreditsRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.literal('GP'),
  reason: z.enum(['win', 'daily_login', 'achievement', 'referral', 'other']),
  description: z.string().optional(),
  match_id: z.string().optional(),
});

export const PurchaseCreditsRequestSchema = z.object({
  amount: z.number().positive(),
  currency: z.literal('AC'),
  payment_method: z.enum(['solana', 'stripe', 'paypal']),
  payment_token: z.string(),
  metadata: z.record(z.unknown()).optional(),
});

export const ConsumeCreditsRequestSchema = z.object({
  amount: z.number().positive(),
  currency: CurrencySchema,
  reason: z.enum(['match_entry', 'premium_feature', 'item_purchase', 'other']),
  description: z.string().optional(),
  match_id: z.string().optional(),
});

export const PlanCreditsRequestSchema = z.object({
  userId: UserIdSchema,
  tier: z.enum(['free', 'pro', 'champion', 'founder']),
}).strict();

export const RewardDailyClaimRequestSchema = z.object({
  idempotencyKey: IdempotencyKeySchema.optional(),
  userId: UserIdSchema.optional(),
}).strict();

// ============================================================================
// Response Bodies
// ============================================================================

export const CreditBalanceResponseSchema = z.object({
  user_id: UserIdSchema,
  gp_balance: z.number().int().nonnegative(),
  ac_balance: z.number().int().nonnegative(),
  total_gp_earned: z.number().int().nonnegative(),
  total_ac_purchased: z.number().int().nonnegative(),
  total_ac_spent: z.number().int().nonnegative(),
  updated_at: TimestampSchema,
});

export const TransactionSchema = z.object({
  transaction_id: TransactionIdSchema,
  type: z.enum(['award', 'purchase', 'consume']),
  currency: CurrencySchema,
  amount: z.number().positive(),
  balance_after: z.number().int(),
  reason: z.string(),
  description: z.string().optional(),
  match_id: z.string().optional(),
  created_at: TimestampSchema,
});

export const TransactionHistoryResponseSchema = z.object({
  transactions: z.array(TransactionSchema),
  cursor: z.string().optional(),
  has_more: z.boolean(),
});

export const CreditOperationResponseSchema = z.object({
  success: z.boolean(),
  transaction_id: TransactionIdSchema,
  new_balance: z.number().int(),
  currency: CurrencySchema,
});
