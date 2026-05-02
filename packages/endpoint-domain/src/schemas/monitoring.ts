/**
 * Monitoring endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { TimestampSchema } from './common';

// ============================================================================
// Response Bodies
// ============================================================================

export const AlertSeveritySchema = schema.enum(['info', 'warning', 'critical']);

export const AlertSchema = schema.object({
  severity: AlertSeveritySchema,
  message: schema.string(),
  timestamp: TimestampSchema,
  metric: schema.string().optional(),
  threshold: schema.number().optional(),
  current_value: schema.number().optional(),
});

export const SystemMetricsSchema = schema.object({
  requests_total: schema.number().int().nonnegative(),
  requests_by_endpoint: schema.record(schema.number().int().nonnegative()),
  error_rate: schema.number().min(0).max(1),
  avg_latency_ms: schema.number().nonnegative(),
  active_connections: schema.number().int().nonnegative(),
});

export const MetricsResponseSchema = schema.object({
  metrics: SystemMetricsSchema,
  alerts: schema.array(AlertSchema),
});

export const AlertsResponseSchema = schema.object({
  alerts: schema.array(AlertSchema),
});
