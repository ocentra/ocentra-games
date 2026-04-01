/**
 * Resources endpoint Zod schemas.
 */

import { z } from 'zod';

// ============================================================================
// Query Parameters
// ============================================================================

export const ResourcesQuerySchema = z.object({
  guid: z.string().optional(),
  hash: z.string().optional(),
  action: z.enum(['get-upload-url', 'get-download-url']).optional(),
});

export const GetUploadUrlQuerySchema = z.object({
  action: z.literal('get-upload-url'),
  guid: z.string(),
  content_type: z.string().optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const ResourceResponseSchema = z.object({
  guid: z.string(),
  hash: z.string(),
  content_type: z.string(),
  size: z.number().int().nonnegative(),
  created_at: z.string(),
  url: z.string().url(),
  metadata: z.record(z.unknown()).optional(),
});

export const UploadUrlResponseSchema = z.object({
  uploadUrl: z.string().url(),
  guid: z.string(),
  expires_at: z.string(),
});

export const DownloadUrlResponseSchema = z.object({
  downloadUrl: z.string().url(),
  guid: z.string(),
  expires_at: z.string(),
});
