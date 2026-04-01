/**
 * Data management endpoint request/response types.
 */

import type { MatchId, UserId, Timestamp } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for signed URL.
 */
export interface SignedUrlQuery {
  expires?: number;
}

/**
 * Query parameters for data export.
 */
export interface DataExportQuery {
  format?: 'json' | 'csv';
}

// ============================================================================
// Request Bodies
// ============================================================================

/**
 * Data deletion request.
 */
export interface DataDeletionRequest {
  user_id: UserId;
  reason?: string;
  confirmation: boolean;
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Signed URL response.
 */
export interface SignedUrlResponse {
  signedUrl: string;
  expires_at: Timestamp;
  match_id: MatchId;
}

/**
 * Data export response.
 */
export interface DataExportResponse {
  export_id: string;
  status: 'pending' | 'ready' | 'expired';
  download_url?: string;
  expires_at?: Timestamp;
}

/**
 * Data deletion response.
 */
export interface DataDeletionResponse {
  success: boolean;
  deletion_id: string;
  estimated_completion: Timestamp;
}

/**
 * Archive response.
 */
export interface ArchiveResponse {
  success: boolean;
  match_id: MatchId;
  archived_at: Timestamp;
  archive_url?: string;
}
