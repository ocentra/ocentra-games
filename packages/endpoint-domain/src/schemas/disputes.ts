/**
 * Disputes endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';
import { MatchIdSchema, UserIdSchema, DisputeIdSchema, TimestampSchema } from './common';

export const DisputeReasonValues = ['cheating', 'bug', 'disconnection', 'other'] as const;
export const DisputeReasonSchema = schema.enum(DisputeReasonValues);
export const LegacyDisputeReasonValues = ['Cheating detected', 'Bug', 'Disconnection', 'Other'] as const;
export const DisputeReasonInputSchema = schema.union([
  DisputeReasonSchema,
  schema.enum(LegacyDisputeReasonValues),
]);
export const DisputeDescriptionPattern = "^[A-Za-z0-9][A-Za-z0-9 .,;:'\"!?()/-]*$";
export const DisputeDescriptionRegex = new RegExp(DisputeDescriptionPattern);
export const DisputeDescriptionSchema = schema.string().min(5).regex(new RegExp(DisputeDescriptionPattern));

// ============================================================================
// Request Bodies
// ============================================================================

export const CreateDisputeRequestSchema = schema.object({
  match_id: MatchIdSchema,
  reason: DisputeReasonInputSchema,
  description: DisputeDescriptionSchema,
  reported_player_id: UserIdSchema.optional(),
  dispute_id: DisputeIdSchema.optional(),
  reason_hash: schema.string().optional(),
  created_by: schema.string().optional(),
  timestamp: schema.string().datetime({ offset: true, message: 'timestamp must be a valid date-time string' }).optional(),
});

export const UpdateDisputeRequestSchema = schema.object({
  match_id: MatchIdSchema,
  reason: DisputeReasonInputSchema,
  description: DisputeDescriptionSchema,
}).strict();

export const SubmitEvidenceRequestSchema = schema.object({
  evidence_type: schema.enum(['screenshot', 'replay', 'log', 'other']),
  description: schema.string(),
  attachment_url: schema.string().url().optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const EvidenceItemSchema = schema.object({
  evidence_id: schema.string(),
  evidence_type: schema.string(),
  description: schema.string(),
  submitted_at: TimestampSchema,
  attachment_url: schema.string().url().optional(),
});

export const DisputeResponseSchema = schema.object({
  dispute_id: DisputeIdSchema,
  match_id: MatchIdSchema,
  status: schema.enum(['open', 'under_review', 'resolved', 'rejected']),
  reason: schema.string(),
  description: schema.string(),
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
  evidence: schema.array(EvidenceItemSchema).optional(),
});

export const CreateDisputeResponseSchema = schema.object({
  success: schema.boolean(),
  dispute_id: DisputeIdSchema,
  status: schema.string(),
  created_at: TimestampSchema,
});
