/**
 * Logs endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { TimestampSchema, PaginationParamsSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const LogsQuerySchema = PaginationParamsSchema.extend({
  level: schema.enum(['debug', 'info', 'warn', 'error']).optional(),
  source: schema.string().optional(),
  context: schema.string().optional(),
  start_time: TimestampSchema.optional(),
  end_time: TimestampSchema.optional(),
});

// ============================================================================
// Request Bodies
// ============================================================================

export const LogsFilterSchema = schema.object({
  level: schema.array(schema.string()).optional(),
  source: schema.array(schema.string()).optional(),
  context: schema.array(schema.string()).optional(),
  time_range: schema.object({
    from: TimestampSchema,
    to: TimestampSchema,
  }).optional(),
});

export const LogsQueryRequestSchema = schema.object({
  filter: LogsFilterSchema,
  limit: schema.number().int().positive().optional(),
  cursor: schema.string().optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const LogEntrySchema = schema.object({
  id: schema.string(),
  level: schema.enum(['debug', 'info', 'warn', 'error']),
  source: schema.string(),
  context: schema.string(),
  message: schema.string(),
  timestamp: TimestampSchema,
  data: schema.unknown().optional(),
  correlation_id: schema.string().optional(),
  file: schema.string().optional(),
  line: schema.number().int().optional(),
});

export const LogsResponseSchema = schema.object({
  entries: schema.array(LogEntrySchema),
  cursor: schema.string().optional(),
  has_more: schema.boolean(),
  total_count: schema.number().int().nonnegative(),
});

export const LogsStatsResponseSchema = schema.object({
  total_entries: schema.number().int().nonnegative(),
  by_level: schema.record(schema.number().int().nonnegative()),
  by_source: schema.record(schema.number().int().nonnegative()),
  time_range: schema.object({
    earliest: TimestampSchema,
    latest: TimestampSchema,
  }),
});

