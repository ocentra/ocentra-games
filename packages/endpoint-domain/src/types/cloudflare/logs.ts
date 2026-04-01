/**
 * Logs endpoint request/response types.
 */

import type { Timestamp, PaginationParams } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for logs.
 */
export interface LogsQuery extends PaginationParams {
  level?: 'debug' | 'info' | 'warn' | 'error';
  source?: string;
  context?: string;
  start_time?: Timestamp;
  end_time?: Timestamp;
}

// ============================================================================
// Request Bodies
// ============================================================================

/**
 * Logs query filter.
 */
export interface LogsFilter {
  level?: string[];
  source?: string[];
  context?: string[];
  time_range?: {
    from: Timestamp;
    to: Timestamp;
  };
}

/**
 * Logs query request.
 */
export interface LogsQueryRequest extends PaginationParams {
  filter: LogsFilter;
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Log entry.
 */
export interface LogEntry {
  id: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  source: string;
  context: string;
  message: string;
  timestamp: Timestamp;
  data?: unknown;
  correlation_id?: string;
  file?: string;
  line?: number;
}

/**
 * Logs response.
 */
export interface LogsResponse {
  entries: LogEntry[];
  cursor?: string;
  has_more: boolean;
  total_count: number;
}

/**
 * Logs stats response.
 */
export interface LogsStatsResponse {
  total_entries: number;
  by_level: Record<string, number>;
  by_source: Record<string, number>;
  time_range: {
    earliest: Timestamp;
    latest: Timestamp;
  };
}

