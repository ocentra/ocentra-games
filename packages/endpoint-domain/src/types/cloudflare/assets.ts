/**
 * Assets endpoint request/response types.
 */

import type { AssetId, Timestamp, PaginationParams } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for listing assets.
 */
export interface ListAssetsQuery extends PaginationParams {
  prefix?: string;
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Asset metadata.
 */
export interface Asset {
  key: string;
  size: number;
  etag: string;
  uploaded: Timestamp;
  httpEtag: string;
  contentType?: string;
}

/**
 * List assets response.
 */
export interface ListAssetsResponse {
  objects: Asset[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes?: string[];
}

/**
 * Upload asset response.
 */
export interface UploadAssetResponse {
  success: boolean;
  assetId: AssetId;
  path: string;
  url: string;
}

/**
 * Delete asset response.
 */
export interface DeleteAssetResponse {
  success: boolean;
  assetId: AssetId;
}
