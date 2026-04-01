/**
 * Logs endpoint Zod schemas.
 */

import { z } from 'zod';
import { TimestampSchema, PaginationParamsSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const LogsQuerySchema = PaginationParamsSchema.extend({
  level: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  source: z.string().optional(),
  context: z.string().optional(),
  start_time: TimestampSchema.optional(),
  end_time: TimestampSchema.optional(),
});

// ============================================================================
// Request Bodies
// ============================================================================

export const LogsFilterSchema = z.object({
  level: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  context: z.array(z.string()).optional(),
  time_range: z.object({
    from: TimestampSchema,
    to: TimestampSchema,
  }).optional(),
});

export const LogsQueryRequestSchema = z.object({
  filter: LogsFilterSchema,
  limit: z.number().int().positive().optional(),
  cursor: z.string().optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const LogEntrySchema = z.object({
  id: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error']),
  source: z.string(),
  context: z.string(),
  message: z.string(),
  timestamp: TimestampSchema,
  data: z.unknown().optional(),
  correlation_id: z.string().optional(),
  file: z.string().optional(),
  line: z.number().int().optional(),
});

export const LogsResponseSchema = z.object({
  entries: z.array(LogEntrySchema),
  cursor: z.string().optional(),
  has_more: z.boolean(),
  total_count: z.number().int().nonnegative(),
});

export const LogsStatsResponseSchema = z.object({
  total_entries: z.number().int().nonnegative(),
  by_level: z.record(z.number().int().nonnegative()),
  by_source: z.record(z.number().int().nonnegative()),
  time_range: z.object({
    earliest: TimestampSchema,
    latest: TimestampSchema,
  }),
});

