/**
 * Data management endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { MatchIdSchema, UserIdSchema, TimestampSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const SignedUrlQuerySchema = schema.object({
  expires: schema.number().int().positive().optional(),
});

export const DataExportQuerySchema = schema.object({
  format: schema.enum(['json', 'csv']).optional(),
});

// ============================================================================
// Request Bodies
// ============================================================================

export const DataDeletionRequestSchema = schema.object({
  user_id: UserIdSchema,
  reason: schema.string().optional(),
  confirmation: schema.literal(true),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const SignedUrlResponseSchema = schema.object({
  signedUrl: schema.string().url(),
  expires_at: TimestampSchema,
  match_id: MatchIdSchema,
});

export const DataExportResponseSchema = schema.object({
  export_id: schema.string(),
  status: schema.enum(['pending', 'ready', 'expired']),
  download_url: schema.string().url().optional(),
  expires_at: TimestampSchema.optional(),
});

export const DataDeletionResponseSchema = schema.object({
  success: schema.boolean(),
  deletion_id: schema.string(),
  estimated_completion: TimestampSchema,
});

export const ArchiveResponseSchema = schema.object({
  success: schema.boolean(),
  match_id: MatchIdSchema,
  archived_at: TimestampSchema,
  archive_url: schema.string().url().optional(),
});
