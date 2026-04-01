/**
 * Monitoring endpoint Zod schemas.
 */

import { z } from 'zod';
import { TimestampSchema } from './common';

// ============================================================================
// Response Bodies
// ============================================================================

export const AlertSeveritySchema = z.enum(['info', 'warning', 'critical']);

export const AlertSchema = z.object({
  severity: AlertSeveritySchema,
  message: z.string(),
  timestamp: TimestampSchema,
  metric: z.string().optional(),
  threshold: z.number().optional(),
  current_value: z.number().optional(),
});

export const SystemMetricsSchema = z.object({
  requests_total: z.number().int().nonnegative(),
  requests_by_endpoint: z.record(z.number().int().nonnegative()),
  error_rate: z.number().min(0).max(1),
  avg_latency_ms: z.number().nonnegative(),
  active_connections: z.number().int().nonnegative(),
});

export const MetricsResponseSchema = z.object({
  metrics: SystemMetricsSchema,
  alerts: z.array(AlertSchema),
});

export const AlertsResponseSchema = z.object({
  alerts: z.array(AlertSchema),
});
