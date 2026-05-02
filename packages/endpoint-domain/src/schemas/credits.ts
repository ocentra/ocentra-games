/**
 * Credits endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { UserIdSchema, TransactionIdSchema, TimestampSchema, CurrencySchema, PaginationParamsSchema, IdempotencyKeySchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const TransactionHistoryQuerySchema = PaginationParamsSchema.extend({
  currency: schema.enum(['GP', 'AC']).optional(),
  type: schema.enum(['award', 'purchase', 'consume']).optional(),
  start_date: TimestampSchema.optional(),
  end_date: TimestampSchema.optional(),
});

// ============================================================================
// Request Bodies
// ============================================================================

export const AwardCreditsRequestSchema = schema.object({
  amount: schema.number().positive(),
  currency: schema.literal('GP'),
  reason: schema.enum(['win', 'daily_login', 'achievement', 'referral', 'other']),
  description: schema.string().optional(),
  match_id: schema.string().optional(),
});

export const PurchaseCreditsRequestSchema = schema.object({
  amount: schema.number().positive(),
  currency: schema.literal('AC'),
  payment_method: schema.enum(['solana', 'stripe', 'paypal']),
  payment_token: schema.string(),
  metadata: schema.record(schema.unknown()).optional(),
});

export const ConsumeCreditsRequestSchema = schema.object({
  amount: schema.number().positive(),
  currency: CurrencySchema,
  reason: schema.enum(['match_entry', 'premium_feature', 'item_purchase', 'other']),
  description: schema.string().optional(),
  match_id: schema.string().optional(),
});

export const PlanCreditsRequestSchema = schema.object({
  userId: UserIdSchema,
  tier: schema.enum(['free', 'pro', 'champion', 'founder']),
}).strict();

export const RewardDailyClaimRequestSchema = schema.object({
  idempotencyKey: IdempotencyKeySchema.optional(),
  userId: UserIdSchema.optional(),
}).strict();

// ============================================================================
// Response Bodies
// ============================================================================

export const CreditBalanceResponseSchema = schema.object({
  user_id: UserIdSchema,
  gp_balance: schema.number().int().nonnegative(),
  ac_balance: schema.number().int().nonnegative(),
  total_gp_earned: schema.number().int().nonnegative(),
  total_ac_purchased: schema.number().int().nonnegative(),
  total_ac_spent: schema.number().int().nonnegative(),
  updated_at: TimestampSchema,
});

export const TransactionSchema = schema.object({
  transaction_id: TransactionIdSchema,
  type: schema.enum(['award', 'purchase', 'consume']),
  currency: CurrencySchema,
  amount: schema.number().positive(),
  balance_after: schema.number().int(),
  reason: schema.string(),
  description: schema.string().optional(),
  match_id: schema.string().optional(),
  created_at: TimestampSchema,
});

export const TransactionHistoryResponseSchema = schema.object({
  transactions: schema.array(TransactionSchema),
  cursor: schema.string().optional(),
  has_more: schema.boolean(),
});

export const CreditOperationResponseSchema = schema.object({
  success: schema.boolean(),
  transaction_id: TransactionIdSchema,
  new_balance: schema.number().int(),
  currency: CurrencySchema,
});
