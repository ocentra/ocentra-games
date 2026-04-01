/**
 * Assets endpoint Zod schemas.
 */

import { z } from 'zod';
import { AssetIdSchema, TimestampSchema, PaginationParamsSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const ListAssetsQuerySchema = PaginationParamsSchema.extend({
  prefix: z.string().optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const AssetSchema = z.object({
  key: z.string(),
  size: z.number().int().nonnegative(),
  etag: z.string(),
  uploaded: TimestampSchema,
  httpEtag: z.string(),
  contentType: z.string().optional(),
});

export const ListAssetsResponseSchema = z.object({
  objects: z.array(AssetSchema),
  truncated: z.boolean(),
  cursor: z.string().optional(),
  delimitedPrefixes: z.array(z.string()).optional(),
});

export const UploadAssetResponseSchema = z.object({
  success: z.boolean(),
  assetId: AssetIdSchema,
  path: z.string(),
  url: z.string(),
});

export const DeleteAssetResponseSchema = z.object({
  success: z.boolean(),
  assetId: AssetIdSchema,
});
