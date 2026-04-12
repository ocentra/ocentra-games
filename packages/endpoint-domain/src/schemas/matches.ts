import { z } from 'zod';
import { PlayerType } from '../constants/game';
import { ValidationPattern } from '../constants/validation-patterns';
import { TimestampSchema } from './common';

function requiredFields(shape: Record<string, z.ZodTypeAny>): string[] {
  return Object.entries(shape)
    .filter(([, schema]) => !schema.isOptional())
    .map(([key]) => key);
}

export const MatchPhaseValues = ['waiting', 'active', 'completed', 'finalized'] as const;

const MatchPlayerShape = {
  player_id: z.string().min(1),
  display_name: z.string().min(1).optional(),
  rating: z.number().finite().optional(),
  wallet_address: z.string().optional(),
  player_type: z.nativeEnum(PlayerType).optional(),
  score: z.number().finite().optional(),
  public_key: z.string().min(1).optional(),
  pubkey: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  index: z.number().int().nonnegative().optional(),
};

const MatchBoardStateShape = {
  fen: z.string(),
};

const MatchFinalStateShape = {
  phase: z.enum(MatchPhaseValues),
  current_turn: z.number().int().nonnegative().optional(),
  current_player: z.string().optional(),
  board_state: z.object(MatchBoardStateShape).strict(),
  winner: z.string().optional(),
};

/**
 * Match Player Schema
 */
export const MatchPlayerSchema = z.object(MatchPlayerShape).strict();
export const MatchPlayerRequiredFields = requiredFields(MatchPlayerShape);

const MatchEventShape = {
  type: z.string().min(1),
  timestamp: z.union([TimestampSchema, z.number().finite()]).optional(),
  player_id: z.string().min(1).optional(),
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
  timestamp: z.union([TimestampSchema, z.number().finite()]).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
};

/**
 * Match Move Schema
 */
export const MatchMoveSchema = z.object(MatchMoveShape).strict();
export const MatchMoveRequiredFields = requiredFields(MatchMoveShape);

/**
 * Match Final State Schema
 */
export const MatchFinalStateSchema = z.object(MatchFinalStateShape).strict();
export const MatchFinalStateRequiredFields = requiredFields(MatchFinalStateShape);
export const MatchBoardStateRequiredFields = requiredFields(MatchBoardStateShape);

const MatchRecordShape = {
  match_id: z.string().min(1).max(128),
  matchId: z.string().min(1).max(128).optional(),
  version: z.string().regex(ValidationPattern.SemanticVersion),
  schema_version: z.string().regex(ValidationPattern.SemanticVersion).optional(),
  gameName: z.string().min(1).optional(),
  gameType: z.number().int().nonnegative().optional(),
  game_type: z.number().int().nonnegative().optional(),
  seed: z.number().int().nonnegative().optional(),
  phase: z.union([z.number().int().nonnegative(), z.enum(MatchPhaseValues)]).optional(),
  currentPlayer: z.union([z.number().int().nonnegative(), z.string().min(1)]).optional(),
  current_player: z.string().min(1).optional(),
  moveCount: z.number().int().nonnegative().optional(),
  createdAt: TimestampSchema.optional(),
  created_at: TimestampSchema.optional(),
  endedAt: TimestampSchema.optional(),
  ended_at: TimestampSchema.optional(),
  started_at: TimestampSchema.optional(),
  players: z.array(MatchPlayerSchema).optional(),
  playerCount: z.number().int().nonnegative().optional(),
  player_count: z.number().int().nonnegative().optional(),
  scores: z.array(z.number().finite()).optional(),
  winner: z.string().min(1).optional(),
  events: z.array(MatchEventSchema),
  moves: z.array(MatchMoveSchema).optional(),
  final_state: MatchFinalStateSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  matchHash: z.string().min(1).optional(),
  hotUrl: z.string().min(1).optional(),
  lastCheckpoint: z.record(z.string(), z.unknown()).optional(),
  aiDump: z.record(z.string(), z.unknown()).optional(),
  chatHistory: z.array(z.record(z.string(), z.unknown())).optional(),
  chain_of_thought: z.record(z.string(), z.unknown()).optional(),
};

/**
 * Match Record Schema (Authoritative shape for R2 and Worker)
 */
export const MatchRecordSchema = z.object(MatchRecordShape).strict();
export const MatchRecordRequiredFields = requiredFields(MatchRecordShape);

export type MatchRecord = z.infer<typeof MatchRecordSchema>;
