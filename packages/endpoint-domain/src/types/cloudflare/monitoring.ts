/**
 * Monitoring endpoint request/response types.
 */

import type { Timestamp } from './common';

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Alert severity.
 */
export type AlertSeverity = 'info' | 'warning' | 'critical';

/**
 * Alert.
 */
export interface Alert {
  severity: AlertSeverity;
  message: string;
  timestamp: Timestamp;
  metric?: string;
  threshold?: number;
  current_value?: number;
}

/**
 * System metrics.
 */
export interface SystemMetrics {
  requests_total: number;
  requests_by_endpoint: Record<string, number>;
  error_rate: number;
  avg_latency_ms: number;
  active_connections: number;
}

/**
 * Metrics response.
 */
export interface MetricsResponse {
  metrics: SystemMetrics;
  alerts: Alert[];
}

/**
 * Alerts response.
 */
export interface AlertsResponse {
  alerts: Alert[];
}
