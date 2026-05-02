import { schema } from '@ocentra/schema-domain/effect-builder';
import { PlayerType } from '../constants/game';
import { ValidationPattern } from '../constants/validation-patterns';
import { TimestampSchema } from './common';

function requiredFields(shape: Record<string, schema.SchemaTypeAny>): string[] {
  return Object.entries(shape)
    .filter(([, schema]) => !schema.isOptional())
    .map(([key]) => key);
}

export const MatchPhaseValues = ['waiting', 'active', 'completed', 'finalized'] as const;

const MatchPlayerShape = {
  player_id: schema.string().min(1),
  display_name: schema.string().min(1).optional(),
  rating: schema.number().finite().optional(),
  wallet_address: schema.string().optional(),
  player_type: schema.nativeEnum(PlayerType).optional(),
  score: schema.number().finite().optional(),
  public_key: schema.string().min(1).optional(),
  pubkey: schema.string().min(1).optional(),
  type: schema.string().min(1).optional(),
  index: schema.number().int().nonnegative().optional(),
};

const MatchBoardStateShape = {
  fen: schema.string(),
};

const MatchFinalStateShape = {
  phase: schema.enum(MatchPhaseValues),
  current_turn: schema.number().int().nonnegative().optional(),
  current_player: schema.string().optional(),
  board_state: schema.object(MatchBoardStateShape).strict(),
  winner: schema.string().optional(),
};

/**
 * Match Player Schema
 */
export const MatchPlayerSchema = schema.object(MatchPlayerShape).strict();
export const MatchPlayerRequiredFields = requiredFields(MatchPlayerShape);

const MatchEventShape = {
  type: schema.string().min(1),
  timestamp: schema.union([TimestampSchema, schema.number().finite()]).optional(),
  player_id: schema.string().min(1).optional(),
};

/**
 * Match Event Schema
 */
export const MatchEventSchema = schema.object(MatchEventShape).strict();
export const MatchEventRequiredFields = requiredFields(MatchEventShape);

const MatchMoveShape = {
  turn: schema.number().int().nonnegative(),
  player_id: schema.string().min(1),
  move: schema.string().min(1),
  timestamp: schema.union([TimestampSchema, schema.number().finite()]).optional(),
  metadata: schema.record(schema.string(), schema.unknown()).optional(),
};

/**
 * Match Move Schema
 */
export const MatchMoveSchema = schema.object(MatchMoveShape).strict();
export const MatchMoveRequiredFields = requiredFields(MatchMoveShape);

/**
 * Match Final State Schema
 */
export const MatchFinalStateSchema = schema.object(MatchFinalStateShape).strict();
export const MatchFinalStateRequiredFields = requiredFields(MatchFinalStateShape);
export const MatchBoardStateRequiredFields = requiredFields(MatchBoardStateShape);

const MatchRecordShape = {
  match_id: schema.string().min(1).max(128),
  matchId: schema.string().min(1).max(128).optional(),
  version: schema.string().regex(ValidationPattern.SemanticVersion),
  schema_version: schema.string().regex(ValidationPattern.SemanticVersion).optional(),
  gameName: schema.string().min(1).optional(),
  gameType: schema.number().int().nonnegative().optional(),
  game_type: schema.number().int().nonnegative().optional(),
  seed: schema.number().int().nonnegative().optional(),
  phase: schema.union([schema.number().int().nonnegative(), schema.enum(MatchPhaseValues)]).optional(),
  currentPlayer: schema.union([schema.number().int().nonnegative(), schema.string().min(1)]).optional(),
  current_player: schema.string().min(1).optional(),
  moveCount: schema.number().int().nonnegative().optional(),
  createdAt: TimestampSchema.optional(),
  created_at: TimestampSchema.optional(),
  endedAt: TimestampSchema.optional(),
  ended_at: TimestampSchema.optional(),
  started_at: TimestampSchema.optional(),
  players: schema.array(MatchPlayerSchema).optional(),
  playerCount: schema.number().int().nonnegative().optional(),
  player_count: schema.number().int().nonnegative().optional(),
  scores: schema.array(schema.number().finite()).optional(),
  winner: schema.string().min(1).optional(),
  events: schema.array(MatchEventSchema),
  moves: schema.array(MatchMoveSchema).optional(),
  final_state: MatchFinalStateSchema.optional(),
  metadata: schema.record(schema.string(), schema.unknown()).optional(),
  matchHash: schema.string().min(1).optional(),
  hotUrl: schema.string().min(1).optional(),
  lastCheckpoint: schema.record(schema.string(), schema.unknown()).optional(),
  aiDump: schema.record(schema.string(), schema.unknown()).optional(),
  chatHistory: schema.array(schema.record(schema.string(), schema.unknown())).optional(),
  chain_of_thought: schema.record(schema.string(), schema.unknown()).optional(),
};

/**
 * Match Record Schema (Authoritative shape for R2 and Worker)
 */
export const MatchRecordSchema = schema.object(MatchRecordShape).strict();
export const MatchRecordRequiredFields = requiredFields(MatchRecordShape);

export type MatchRecord = schema.infer<typeof MatchRecordSchema>;
