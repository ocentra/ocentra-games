/**
 * Common Zod schemas for validation.
 */

import { z } from 'zod';

/**
 * UUID validation schema.
 */
export const UUIDSchema = z.string().uuid();

/**
 * ISO 8601 timestamp validation schema.
 */
export const TimestampSchema = z.string().datetime();

/**
 * Match ID schema.
 */
export const MatchIdSchema = UUIDSchema;

/**
 * User ID schema.
 */
export const UserIdSchema = UUIDSchema;

/**
 * Dispute ID schema.
 */
export const DisputeIdSchema = UUIDSchema;

/**
 * Transaction ID schema.
 */
export const TransactionIdSchema = UUIDSchema;

/**
 * Badge ID schema.
 */
export const BadgeIdSchema = z.string().min(1);

/**
 * Asset ID schema.
 */
export const AssetIdSchema = z.string().min(1);

/**
 * Game type schema (positive integer).
 */
export const GameTypeSchema = z.number().int().positive();

/**
 * Currency schema.
 */
export const CurrencySchema = z.enum(['GP', 'AC']);

/**
 * Pagination parameters schema.
 */
export const PaginationParamsSchema = z.object({
  limit: z.number().int().positive().max(1000).optional(),
  cursor: z.string().optional(),
});

/**
 * Error response schema.
 */
export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.array(z.string())).optional(),
  request_id: z.string().optional(),
  timestamp: TimestampSchema,
});
