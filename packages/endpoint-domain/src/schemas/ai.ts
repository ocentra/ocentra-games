/**
 * AI endpoint Zod schemas.
 */

import { z } from 'zod';

// ============================================================================
// Request Bodies
// ============================================================================

export const AIRequestSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  context: z.record(z.unknown()).optional(),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const AIEventRequestSchema = z.object({
  event_type: z.enum(['match_start', 'match_end', 'player_action', 'dispute']),
  match_id: z.string().optional(),
  player_id: z.string().optional(),
  event_data: z.record(z.unknown()),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const TokenUsageSchema = z.object({
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});

export const AIResponseSchema = z.object({
  response: z.string(),
  model: z.string(),
  usage: TokenUsageSchema,
  finish_reason: z.string(),
});

export const AIActionSchema = z.object({
  action_type: z.enum(['notify', 'analyze', 'flag']),
  target: z.string(),
  payload: z.record(z.unknown()).optional(),
});

export const AIEventResponseSchema = z.object({
  success: z.boolean(),
  actions: z.array(AIActionSchema).optional(),
});
