/**
 * Disputes endpoint Zod schemas.
 */

import { z } from 'zod';
import { MatchIdSchema, UserIdSchema, DisputeIdSchema, TimestampSchema } from './common';

export const DisputeReasonValues = ['cheating', 'bug', 'disconnection', 'other'] as const;
export const DisputeReasonSchema = z.enum(DisputeReasonValues);
export const DisputeDescriptionPattern = "^[A-Za-z0-9][A-Za-z0-9 .,;:'\"!?()/-]*$";
export const DisputeDescriptionRegex = new RegExp(DisputeDescriptionPattern);
export const DisputeDescriptionSchema = z.string().min(5).regex(new RegExp(DisputeDescriptionPattern));

// ============================================================================
// Request Bodies
// ============================================================================

export const CreateDisputeRequestSchema = z.object({
  match_id: MatchIdSchema,
  reason: DisputeReasonSchema,
  description: DisputeDescriptionSchema,
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
