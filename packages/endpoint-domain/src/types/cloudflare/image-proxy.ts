/**
 * Image proxy endpoint request/response types.
 */

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for image proxy.
 */
export interface ImageProxyQuery {
  url: string;
  width?: number;
  height?: number;
  format?: 'webp' | 'jpeg' | 'png';
}
