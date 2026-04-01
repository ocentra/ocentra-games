/**
 * Data management endpoint Zod schemas.
 */

import { z } from 'zod';
import { MatchIdSchema, UserIdSchema, TimestampSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const SignedUrlQuerySchema = z.object({
  expires: z.number().int().positive().optional(),
});

export const DataExportQuerySchema = z.object({
  format: z.enum(['json', 'csv']).optional(),
});

// ============================================================================
// Request Bodies
// ============================================================================

export const DataDeletionRequestSchema = z.object({
  user_id: UserIdSchema,
  reason: z.string().optional(),
  confirmation: z.literal(true),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const SignedUrlResponseSchema = z.object({
  signedUrl: z.string().url(),
  expires_at: TimestampSchema,
  match_id: MatchIdSchema,
});

export const DataExportResponseSchema = z.object({
  export_id: z.string(),
  status: z.enum(['pending', 'ready', 'expired']),
  download_url: z.string().url().optional(),
  expires_at: TimestampSchema.optional(),
});

export const DataDeletionResponseSchema = z.object({
  success: z.boolean(),
  deletion_id: z.string(),
  estimated_completion: TimestampSchema,
});

export const ArchiveResponseSchema = z.object({
  success: z.boolean(),
  match_id: MatchIdSchema,
  archived_at: TimestampSchema,
  archive_url: z.string().url().optional(),
});
