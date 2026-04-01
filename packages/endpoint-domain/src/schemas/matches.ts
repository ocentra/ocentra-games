/**
 * Matches endpoint Zod schemas.
 */

import { z } from 'zod';
import { MatchIdSchema, UserIdSchema, GameTypeSchema, TimestampSchema, PaginationParamsSchema } from './common';

// ============================================================================
// Query Parameters
// ============================================================================

export const ListMatchesQuerySchema = PaginationParamsSchema.extend({
  game_type: GameTypeSchema.optional(),
  player_id: UserIdSchema.optional(),
  sort: z.enum(['newest', 'oldest', 'popular']).optional(),
});

export const ListBenchmarksQuerySchema = PaginationParamsSchema.extend({
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  game_type: GameTypeSchema.optional(),
});

export const GetMatchQuerySchema = z.object({
  token: z.string().optional(),
});

// ============================================================================
// Request Bodies
// ============================================================================

export const PlayerDataSchema = z.object({
  player_id: UserIdSchema,
  display_name: z.string(),
  rating: z.number().optional(),
});

export const MoveDataSchema = z.object({
  turn: z.number().int().positive(),
  player_id: UserIdSchema,
  move: z.string(),
  timestamp: TimestampSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const GameStateSchema = z.object({
  phase: z.enum(['waiting', 'active', 'completed', 'finalized']),
  current_turn: z.number().int().positive().optional(),
  current_player: UserIdSchema.optional(),
  board_state: z.record(z.unknown()).optional(),
  winner: UserIdSchema.optional(),
});

export const UploadMatchRequestSchema = z.object({
  game_type: GameTypeSchema,
  players: z.array(PlayerDataSchema),
  moves: z.array(MoveDataSchema),
  final_state: GameStateSchema,
  started_at: TimestampSchema,
  ended_at: TimestampSchema,
  metadata: z.record(z.unknown()).optional(),
});

export const AnonymizeMatchRequestSchema = z.object({
  reason: z.enum(['gdpr', 'privacy', 'testing']).optional(),
});

// ============================================================================
// Response Bodies
// ============================================================================

export const MatchSummarySchema = z.object({
  match_id: MatchIdSchema,
  game_type: GameTypeSchema,
  created_at: TimestampSchema,
  player_count: z.number().int().nonnegative(),
  duration_seconds: z.number().positive().optional(),
  is_benchmark: z.boolean(),
});

export const ListMatchesResponseSchema = z.object({
  data: z.array(MatchSummarySchema),
  cursor: z.string().optional(),
  has_more: z.boolean(),
  total_count: z.number().int().nonnegative(),
});

export const GetMatchResponseSchema = z.object({
  match_id: MatchIdSchema,
  game_type: GameTypeSchema,
  players: z.array(PlayerDataSchema),
  moves: z.array(MoveDataSchema),
  final_state: GameStateSchema,
  created_at: TimestampSchema,
  updated_at: TimestampSchema,
});

export const UploadMatchResponseSchema = z.object({
  success: z.boolean(),
  matchId: MatchIdSchema,
  url: z.string().url(),
});

export const AnonymizeMatchResponseSchema = z.object({
  success: z.boolean(),
  match_id: MatchIdSchema,
  anonymized_at: TimestampSchema,
  anonymized_url: z.string(),
});

export const AIDecisionSchema = z.object({
  turn: z.number().int().positive(),
  player_id: UserIdSchema,
  decision: z.string(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().optional(),
});

export const AIDecisionsResponseSchema = z.object({
  match_id: MatchIdSchema,
  decisions: z.array(AIDecisionSchema),
});

export const DeleteMatchResponseSchema = z.object({
  success: z.boolean(),
  match_id: MatchIdSchema,
});
