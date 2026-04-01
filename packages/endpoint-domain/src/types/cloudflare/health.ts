/**
 * Health endpoint types.
 */

import type { Timestamp } from './common';

/**
 * Health check response.
 */
export interface HealthResponse {
  status: 'ok';
  timestamp?: Timestamp;
  version?: string;
}
