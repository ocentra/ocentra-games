import { z } from 'zod';
import { PlayerType } from '../constants/game';
import { MatchIdSchema, TimestampSchema } from './common';

function requiredFields(shape: Record<string, z.ZodTypeAny>): string[] {
  return Object.entries(shape)
    .filter(([, schema]) => !schema.isOptional())
    .map(([key]) => key);
}

export const MatchPhaseValues = ['waiting', 'active', 'completed', 'finalized'] as const;

const MatchPlayerShape = {
  player_id: z.string().min(1),
  display_name: z.string().min(1),
  rating: z.number().finite(),
  wallet_address: z.string().optional(),
  player_type: z.nativeEnum(PlayerType),
  score: z.number().finite(),
};

/**
 * Match Player Schema
 */
export const MatchPlayerSchema = z.object(MatchPlayerShape).strict();
export const MatchPlayerRequiredFields = requiredFields(MatchPlayerShape);

const MatchEventShape = {
  type: z.string().min(1),
  timestamp: TimestampSchema,
};

/**
 * Match Event Schema
 */
export const MatchEventSchema = z.object(MatchEventShape).strict();
export const MatchEventRequiredFields = requiredFields(MatchEventShape);

const MatchMoveShape = {
  turn: z.number().int().nonnegative(),
  player_id: z.string().min(1),
  move: z.string().min(1),
  timestamp: TimestampSchema,
  metadata: z.record(z.string(), z.unknown()).optional(),
};

/**
 * Match Move Schema
 */
export const MatchMoveSchema = z.object(MatchMoveShape).strict();
export const MatchMoveRequiredFields = requiredFields(MatchMoveShape);

const MatchBoardStateShape = {
  fen: z.string(),
};

const MatchFinalStateShape = {
  phase: z.enum(MatchPhaseValues),
  current_turn: z.number().int().nonnegative().optional(),
  current_player: z.string().optional(),
  board_state: z.object(MatchBoardStateShape).strict().optional(),
  winner: z.string().optional(),
};

/**
 * Match Final State Schema
 */
export const MatchFinalStateSchema = z.object(MatchFinalStateShape).strict();
export const MatchFinalStateRequiredFields = requiredFields(MatchFinalStateShape);
export const MatchBoardStateRequiredFields = requiredFields(MatchBoardStateShape);

const MatchRecordShape = {
  match_id: MatchIdSchema,
  version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/),
  schema_version: z.string().regex(/^[0-9]+\.[0-9]+\.[0-9]+$/).optional(),
  game_type: z.number().int().nonnegative().optional(),
  created_at: TimestampSchema.optional(),
  ended_at: TimestampSchema.optional(),
  started_at: TimestampSchema.optional(),
  players: z.array(MatchPlayerSchema).optional(),
  events: z.array(MatchEventSchema),
  moves: z.array(MatchMoveSchema).optional(),
  final_state: MatchFinalStateSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
};

/**
 * Match Record Schema (Authoritative shape for R2 and Worker)
 */
export const MatchRecordSchema = z.object(MatchRecordShape).strict();
export const MatchRecordRequiredFields = requiredFields(MatchRecordShape);

export type MatchRecord = z.infer<typeof MatchRecordSchema>;
