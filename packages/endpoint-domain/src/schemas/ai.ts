/**
 * AI endpoint Effect schemas.
 */

import { schema } from '@ocentra/schema-domain/effect-builder';

// ============================================================================
// Request Bodies
// ============================================================================

export const AIRequestSchema = schema.object({
  model: schema.string(),
  prompt: schema.string(),
  context: schema.record(schema.unknown()).optional(),
  max_tokens: schema.number().int().positive().optional(),
  temperature: schema.number().min(0).max(2).optional(),
});

export const AIEventRequestSchema = schema.object({
  event_type: schema.enum(['match_start', 'match_end', 'player_action', 'dispute']),
  match_id: schema.string().optional(),
  player_id: schema.string().optional(),
  event_data: schema.record(schema.unknown()),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const TokenUsageSchema = schema.object({
  prompt_tokens: schema.number().int().nonnegative(),
  completion_tokens: schema.number().int().nonnegative(),
  total_tokens: schema.number().int().nonnegative(),
});

export const AIResponseSchema = schema.object({
  response: schema.string(),
  model: schema.string(),
  usage: TokenUsageSchema,
  finish_reason: schema.string(),
});

export const AIActionSchema = schema.object({
  action_type: schema.enum(['notify', 'analyze', 'flag']),
  target: schema.string(),
  payload: schema.record(schema.unknown()).optional(),
});

export const AIEventResponseSchema = schema.object({
  success: schema.boolean(),
  actions: schema.array(AIActionSchema).optional(),
});
