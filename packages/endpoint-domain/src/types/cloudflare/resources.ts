/**
 * Resources endpoint request/response types.
 */

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for resources.
 */
export interface ResourcesQuery {
  guid?: string;
  hash?: string;
  action?: 'get-upload-url' | 'get-download-url';
}

/**
 * Query parameters for get upload URL.
 */
export interface GetUploadUrlQuery {
  action: 'get-upload-url';
  guid: string;
  content_type?: string;
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Resource metadata.
 */
export interface ResourceResponse {
  guid: string;
  hash: string;
  content_type: string;
  size: number;
  created_at: string;
  url: string;
  metadata?: Record<string, unknown>;
}

/**
 * Upload URL response.
 */
export interface UploadUrlResponse {
  uploadUrl: string;
  guid: string;
  expires_at: string;
}

/**
 * Download URL response.
 */
export interface DownloadUrlResponse {
  downloadUrl: string;
  guid: string;
  expires_at: string;
}
