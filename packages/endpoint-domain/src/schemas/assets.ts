/**
 * Assets endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { AssetIdSchema, TimestampSchema, PaginationParamsSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const ListAssetsQuerySchema = PaginationParamsSchema.extend({
  prefix: schema.string().optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const AssetSchema = schema.object({
  key: schema.string(),
  size: schema.number().int().nonnegative(),
  etag: schema.string(),
  uploaded: TimestampSchema,
  httpEtag: schema.string(),
  contentType: schema.string().optional(),
});

export const ListAssetsResponseSchema = schema.object({
  objects: schema.array(AssetSchema),
  truncated: schema.boolean(),
  cursor: schema.string().optional(),
  delimitedPrefixes: schema.array(schema.string()).optional(),
});

export const UploadAssetResponseSchema = schema.object({
  success: schema.boolean(),
  assetId: AssetIdSchema,
  path: schema.string(),
  url: schema.string(),
});

export const DeleteAssetResponseSchema = schema.object({
  success: schema.boolean(),
  assetId: AssetIdSchema,
});
