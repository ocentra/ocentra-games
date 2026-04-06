/**
 * Disputes endpoint Zod schemas.
 */

import { z } from 'zod';
import { MatchIdSchema, UserIdSchema, DisputeIdSchema, TimestampSchema } from './common';

// ============================================================================
// Request Bodies
// ============================================================================

export const CreateDisputeRequestSchema = z.object({
  match_id: MatchIdSchema,
  reason: z.enum(['cheating', 'bug', 'disconnection', 'other']),
  description: z.string().min(1),
  reported_player_id: UserIdSchema.optional(),
  dispute_id: DisputeIdSchema.optional(),
});

export const SubmitEvidenceRequestSchema = z.object({
  evidence_type: z.enum(['screenshot', 'replay', 'log', 'other']),
  description: z.string(),
  attachment_url: z.string().url().optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const EvidenceItemSchema = z.object({
  evidence_id: z.string(),
  evidence_type: z.string(),
  description: z.string(),
  submitted_at: TimestampSchema,
  attachment_url: z.string().url().optional(),
});

export const DisputeResponseSchema = z.object({
  dispute_id: DisputeIdSchema,
  match_id: MatchIdSchema,
  status: z.enum(['open', 'under_review', 'resolved', 'rejected']),
  reason: z.string(),
  description: z.string(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  evidence: z.array(EvidenceItemSchema).optional(),
});

export const CreateDisputeResponseSchema = z.object({
  success: z.boolean(),
  dispute_id: DisputeIdSchema,
  status: z.string(),
  created_at: TimestampSchema,
});
