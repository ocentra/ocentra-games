/**
 * Resources endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';

// ============================================================================
// Query Parameters
// ============================================================================

export const ResourcesQuerySchema = schema.object({
  guid: schema.string().optional(),
  hash: schema.string().optional(),
  action: schema.enum(['get-upload-url', 'get-download-url']).optional(),
});

export const GetUploadUrlQuerySchema = schema.object({
  action: schema.literal('get-upload-url'),
  guid: schema.string(),
  content_type: schema.string().optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const ResourceResponseSchema = schema.object({
  guid: schema.string(),
  hash: schema.string(),
  content_type: schema.string(),
  size: schema.number().int().nonnegative(),
  created_at: schema.string(),
  url: schema.string().url(),
  metadata: schema.record(schema.unknown()).optional(),
});

export const UploadUrlResponseSchema = schema.object({
  uploadUrl: schema.string().url(),
  guid: schema.string(),
  expires_at: schema.string(),
});

export const DownloadUrlResponseSchema = schema.object({
  downloadUrl: schema.string().url(),
  guid: schema.string(),
  expires_at: schema.string(),
});
