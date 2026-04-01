/**
 * Matches endpoint request/response types.
 */

import type { MatchId, UserId, GameType, Timestamp, PaginationParams, PaginatedResponse } from './common';
import type { PlayerTypeValue } from '@/constants/game';
import { MatchWSChannel, MatchWSMessageType } from '@/constants/cloudflare-do';

// ============================================================================
// Query Parameters
// ============================================================================

/**
 * Query parameters for listing matches.
 */
export interface ListMatchesQuery extends PaginationParams {
  game_type?: GameType;
  player_id?: UserId;
  sort?: 'newest' | 'oldest' | 'popular';
}

/**
 * Query parameters for listing benchmarks.
 */
export interface ListBenchmarksQuery extends PaginationParams {
  difficulty?: 'easy' | 'medium' | 'hard';
  game_type?: GameType;
}

/**
 * Query parameters for getting a match.
 */
export interface GetMatchQuery {
  token?: string;
}

// ============================================================================
// Request Bodies
// ============================================================================

/**
 * Player data within a match.
 */
export interface PlayerData {
  player_id: UserId;
  display_name: string;
  rating?: number;
}

/**
 * Move data within a match.
 */
export interface MoveData {
  turn: number;
  player_id: UserId;
  move: string;
  timestamp: Timestamp;
  metadata?: Record<string, unknown>;
}

/**
 * Game state.
 */
export interface GameState {
  phase: 'waiting' | 'active' | 'completed' | 'finalized';
  current_turn?: number;
  current_player?: UserId;
  board_state?: Record<string, unknown>;
  winner?: UserId;
}

/**
 * Upload match request body.
 */
export interface UploadMatchRequest {
  game_type: GameType;
  players: PlayerData[];
  moves: MoveData[];
  final_state: GameState;
  started_at: Timestamp;
  ended_at: Timestamp;
  metadata?: Record<string, unknown>;
}

/**
 * Anonymize match request body.
 */
export interface AnonymizeMatchRequest {
  reason?: 'gdpr' | 'privacy' | 'testing';
}

// ============================================================================
// Response Bodies
// ============================================================================

/**
 * Match summary for list views.
 */
export interface MatchSummary {
  match_id: MatchId;
  game_type: GameType;
  created_at: Timestamp;
  player_count: number;
  duration_seconds?: number;
  is_benchmark: boolean;
}

/**
 * List matches response.
 */
export type ListMatchesResponse = PaginatedResponse<MatchSummary>;

/**
 * List benchmarks response.
 */
export type ListBenchmarksResponse = PaginatedResponse<MatchSummary>;

/**
 * Full match data response.
 */
export interface GetMatchResponse {
  match_id: MatchId;
  game_type: GameType;
  players: PlayerData[];
  moves: MoveData[];
  final_state: GameState;
  created_at: Timestamp;
  updated_at: Timestamp;
}

/**
 * Upload match response.
 */
export interface UploadMatchResponse {
  success: boolean;
  matchId: MatchId;
  url: string;
}

/**
 * Anonymize match response.
 */
export interface AnonymizeMatchResponse {
  success: boolean;
  match_id: MatchId;
  anonymized_at: Timestamp;
  anonymized_url: string;
}

/**
 * AI decision data.
 */
export interface AIDecision {
  turn: number;
  player_id: UserId;
  decision: string;
  confidence: number;
  reasoning?: string;
}

/**
 * AI decisions response.
 */
export interface AIDecisionsResponse {
  match_id: MatchId;
  decisions: AIDecision[];
}

/**
 * Delete match response.
 */
export interface DeleteMatchResponse {
  success: boolean;
  match_id: MatchId;
}

export interface MatchWSAttachment {
  userId: UserId;
  matchId: MatchId;
  connectedAt: number;
  playerIndex: number;
}

export type MatchWSChannelValue = (typeof MatchWSChannel)[keyof typeof MatchWSChannel];

export interface MatchChatMessage {
  messageId: string;
  senderId: UserId;
  senderType: PlayerTypeValue;
  content: string;
  timestamp: number;
  channel: MatchWSChannelValue;
}

export interface AIDecisionRecord {
  [key: string]: unknown;
}

export interface MatchAIDump {
  decisions: AIDecisionRecord[];
}

export interface MatchWSMoveMessage {
  type: typeof MatchWSMessageType.Move;
  matchId: MatchId;
  move: Record<string, unknown>;
  txSignature: string;
}

export interface MatchWSSyncMessage {
  type: typeof MatchWSMessageType.Sync;
  matchId: MatchId;
  onChainState: Record<string, unknown>;
}

export interface MatchWSFinalizeMessage {
  type: typeof MatchWSMessageType.Finalize;
  matchId: MatchId;
  matchHash?: string;
  hotUrl?: string;
  events?: unknown[];
  scores?: number[];
  winner?: string;
}

export interface MatchWSChatMessage {
  type: typeof MatchWSMessageType.Chat;
  matchId: MatchId;
  content: string;
  senderType: PlayerTypeValue;
  aiPlayerId?: string;
}

export interface MatchWSVoiceTextMessage {
  type: typeof MatchWSMessageType.VoiceText;
  matchId: MatchId;
  content: string;
  senderType: PlayerTypeValue;
  aiPlayerId?: string;
  channel?: typeof MatchWSChannel.Voice;
}

export interface MatchWSAiDumpMessage {
  type: typeof MatchWSMessageType.AiDump;
  matchId: MatchId;
  decisions: AIDecisionRecord[];
}

export interface MatchWSPingMessage {
  type: typeof MatchWSMessageType.Ping;
  matchId?: MatchId;
}

export type MatchWSIncomingMessage =
  | MatchWSMoveMessage
  | MatchWSSyncMessage
  | MatchWSFinalizeMessage
  | MatchWSChatMessage
  | MatchWSVoiceTextMessage
  | MatchWSAiDumpMessage
  | MatchWSPingMessage;

export interface MatchWSStateUpdateMessage {
  type: typeof MatchWSMessageType.StateUpdate;
  matchId: MatchId;
  matchState: unknown;
}

export interface MatchWSChatBroadcastMessage {
  type: typeof MatchWSMessageType.ChatBroadcast;
  matchId: MatchId;
  message: MatchChatMessage;
}

export interface MatchWSCheckpointCreatedMessage {
  type: typeof MatchWSMessageType.CheckpointCreated;
  matchId: MatchId;
  checkpoint: unknown;
}

export interface MatchWSErrorMessage {
  type: typeof MatchWSMessageType.Error;
  matchId?: MatchId;
  code?: string;
  message: string;
}

export interface MatchWSPongMessage {
  type: typeof MatchWSMessageType.Pong;
  matchId?: MatchId;
  timestamp: number;
}

export type MatchWSOutgoingMessage =
  | MatchWSStateUpdateMessage
  | MatchWSChatBroadcastMessage
  | MatchWSCheckpointCreatedMessage
  | MatchWSErrorMessage
  | MatchWSPongMessage;
