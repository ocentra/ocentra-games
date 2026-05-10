import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { buildApiUrlWithQueryParams } from '@ocentra/endpoint-domain/utils/url-builder';
import { requestJson } from './httpClient';

export type LobbyRoomType = 'lobby' | 'game' | 'tournament' | 'private';
export type LobbyRoomMode = 'casual' | 'ranked' | 'training' | 'benchmark' | 'stakes';
export type LobbyVisibility = 'public' | 'private' | 'friends';
export type LobbyStakeType = 'free' | 'game-coin' | 'real-money';
export type LobbyStakeStatus = 'none' | 'pending' | 'locked' | 'refunded' | 'settled';
export type LobbyChainStatus = 'local' | 'pending-chain' | 'confirmed' | 'conflict' | 'reconciled';
export type LobbyAIRole = 'opponent' | 'coach' | 'benchmark';
export type LobbyAIDifficulty = 'easy' | 'normal' | 'hard' | 'expert';
export type LobbyTrainingGuideMode = 'off' | 'hints' | 'guided' | 'review';

export interface LobbyRoomPlayer {
  userId: string;
  displayName?: string;
  seatIndex?: number;
  isHost?: boolean;
  isReady?: boolean;
  isAI?: boolean;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: LobbyAIDifficulty | string;
  role?: LobbyAIRole | string;
}

export interface LobbyRoom {
  roomId: string;
  hostId: string;
  roomName?: string;
  roomType?: LobbyRoomType | string;
  mode?: LobbyRoomMode | string;
  visibility?: LobbyVisibility | string;
  maxPlayers?: number;
  currentPlayers?: number;
  currentSpectators?: number;
  gameStatus?: string;
  status?: string;
  gameType?: string;
  variantId?: string;
  allowAI?: boolean;
  aiCount?: number;
  allowSpectators?: boolean;
  stakeType?: LobbyStakeType | string;
  stakeAmount?: number;
  stakeStatus?: LobbyStakeStatus | string;
  stakeEscrowId?: string;
  chainStatus?: LobbyChainStatus | string;
  turnTimerSeconds?: number;
  region?: string;
  isPrivate?: boolean;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: LobbyAIDifficulty | string;
  aiRole?: LobbyAIRole | string;
  coachEnabled?: boolean;
  coachModelId?: string;
  guideMode?: LobbyTrainingGuideMode | string;
  matchId?: string;
  stateVersion?: number;
  viewerJoined?: boolean;
  viewerSpectating?: boolean;
  joinCode?: string;
  players?: LobbyRoomPlayer[];
  createdAt?: number;
}

export interface LobbyRoomsResponse {
  rooms: LobbyRoom[];
  nextCursor?: string | null;
  limit?: number;
}

export interface LobbyRoomActionResponse {
  joined?: boolean;
  spectating?: boolean;
  created?: boolean;
  left?: boolean;
  ready?: boolean;
  started?: boolean;
  roomId?: string;
  matchId?: string;
  reconnectToken?: string;
  room?: LobbyRoom;
  handoff?: {
    roomId: string;
    matchId: string;
    gameType?: string;
    status: string;
  };
}

export interface CreateLobbyRoomRequest {
  hostId: string;
  hostDisplayName?: string;
  roomName?: string;
  roomType: LobbyRoomType | string;
  mode?: LobbyRoomMode | string;
  visibility?: LobbyVisibility | string;
  maxPlayers: number;
  gameType: string;
  variantId?: string;
  allowAI?: boolean;
  aiCount?: number;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: LobbyAIDifficulty | string;
  aiRole?: LobbyAIRole | string;
  coachEnabled?: boolean;
  coachModelId?: string;
  guideMode?: LobbyTrainingGuideMode | string;
  allowSpectators?: boolean;
  stakeType?: LobbyStakeType | string;
  stakeAmount?: number;
  turnTimerSeconds?: number;
  region?: string;
  isPrivate: boolean;
  roomId?: string;
}

export interface JoinLobbyRoomRequest {
  userId: string;
  displayName?: string;
}

export interface JoinLeaveLobbyRoomRequest {
  userId: string;
}

export interface ListLobbyRoomsOptions {
  userId?: string;
  gameType?: string;
  mode?: string;
  visibility?: string;
  status?: string;
  stakeType?: string;
  allowAI?: boolean;
  search?: string;
  sort?: string;
  limit?: number;
  cursor?: string;
}

export interface LobbyRoomPathOptions {
  gameType?: string;
}

export interface QuickJoinLobbyRoomRequest {
  roomId?: string;
  userId: string;
  displayName?: string;
  gameType: string;
  mode?: LobbyRoomMode | string;
  allowAI?: boolean;
  stakeType?: LobbyStakeType | string;
  maxPlayers?: number;
  createIfMissing?: boolean;
}

export interface LobbyRoomWebSocketOptions {
  gameType: string;
  roomId: string;
  baseUrl?: string;
}

export interface StartLobbyRoomResponse {
  started: boolean;
  roomId: string;
  matchId?: string;
  handoff?: {
    roomId: string;
    matchId: string;
    gameType?: string;
    status: string;
  };
  room?: LobbyRoom;
}

export interface AddLobbyAISeatRequest {
  userId: string;
  displayName?: string;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: LobbyAIDifficulty | string;
  aiRole?: LobbyAIRole | string;
}

export interface MatchmakingQueueRequest {
  userId: string;
  displayName?: string;
  elo?: number;
  gameType?: number;
}

export interface MatchmakingQueueResponse {
  ticketId: string;
  position: number;
  status?: string;
  matchId?: string;
}

export interface MatchmakingStatusResponse {
  ticketId?: string;
  position?: number;
  status?: string;
  matchId?: string;
}

function appendQuery(
  endpoint: string,
  query: Record<string, string | number | boolean | null | undefined>
): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const raw = params.toString();
  return raw.length === 0 ? endpoint : `${endpoint}?${raw}`;
}

function getBrowserBaseUrl(baseUrl?: string): string {
  if (baseUrl && baseUrl.length > 0) return baseUrl;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  throw new Error('Base URL unavailable');
}

function toWebSocketUrl(url: string): string {
  const resolved = new URL(url);
  resolved.protocol = resolved.protocol === 'https:' ? 'wss:' : 'ws:';
  return resolved.toString();
}

export function buildLobbyRoomWebSocketUrl(options: LobbyRoomWebSocketOptions): string {
  const httpUrl = buildApiUrlWithQueryParams(ApiEndpoint.Ws.Lobby, {
    [QueryParam.GameType]: options.gameType,
    [QueryParam.RoomId]: options.roomId,
  }, { baseUrl: getBrowserBaseUrl(options.baseUrl) });
  return toWebSocketUrl(httpUrl);
}

export async function listLobbyRooms(options: ListLobbyRoomsOptions = {}): Promise<LobbyRoomsResponse> {
  return requestJson<LobbyRoomsResponse>(appendQuery(ApiEndpoint.Rooms.Base, {
    [QueryParam.UserId]: options.userId,
    [QueryParam.GameType]: options.gameType,
    [QueryParam.Mode]: options.mode,
    [QueryParam.Visibility]: options.visibility,
    [QueryParam.Status]: options.status,
    [QueryParam.StakeType]: options.stakeType,
    [QueryParam.AllowAI]: options.allowAI,
    [QueryParam.Search]: options.search,
    [QueryParam.Sort]: options.sort,
    [QueryParam.Limit]: options.limit,
    [QueryParam.Cursor]: options.cursor,
  }));
}

export async function createLobbyRoom(payload: CreateLobbyRoomRequest): Promise<LobbyRoomActionResponse> {
  return requestJson<LobbyRoomActionResponse, CreateLobbyRoomRequest>(ApiEndpoint.Rooms.Base, {
    method: HttpMethod.Post,
    body: payload,
    authMode: 'required',
  });
}

export async function joinLobbyRoom(
  roomId: string,
  payload: JoinLobbyRoomRequest,
  options: LobbyRoomPathOptions = {}
): Promise<LobbyRoomActionResponse> {
  return requestJson<LobbyRoomActionResponse, JoinLobbyRoomRequest>(
    appendQuery(ApiEndpoint.Rooms.Join(roomId), { [QueryParam.GameType]: options.gameType }),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function leaveLobbyRoom(
  roomId: string,
  payload: JoinLeaveLobbyRoomRequest,
  options: LobbyRoomPathOptions = {}
): Promise<LobbyRoomActionResponse> {
  return requestJson<LobbyRoomActionResponse, JoinLeaveLobbyRoomRequest>(
    appendQuery(ApiEndpoint.Rooms.Leave(roomId), { [QueryParam.GameType]: options.gameType }),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function spectateLobbyRoom(
  roomId: string,
  payload: JoinLobbyRoomRequest,
  options: LobbyRoomPathOptions = {}
): Promise<LobbyRoomActionResponse> {
  return requestJson<LobbyRoomActionResponse, JoinLobbyRoomRequest>(
    appendQuery(ApiEndpoint.Rooms.Spectate(roomId), { [QueryParam.GameType]: options.gameType }),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function readyLobbyRoom(
  roomId: string,
  payload: JoinLeaveLobbyRoomRequest,
  options: LobbyRoomPathOptions = {}
): Promise<LobbyRoomActionResponse> {
  return requestJson<LobbyRoomActionResponse, JoinLeaveLobbyRoomRequest>(
    appendQuery(ApiEndpoint.Rooms.Ready(roomId), { [QueryParam.GameType]: options.gameType }),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function unreadyLobbyRoom(
  roomId: string,
  payload: JoinLeaveLobbyRoomRequest,
  options: LobbyRoomPathOptions = {}
): Promise<LobbyRoomActionResponse> {
  return requestJson<LobbyRoomActionResponse, JoinLeaveLobbyRoomRequest>(
    appendQuery(ApiEndpoint.Rooms.Unready(roomId), { [QueryParam.GameType]: options.gameType }),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function startLobbyRoom(
  roomId: string,
  payload: JoinLeaveLobbyRoomRequest,
  options: LobbyRoomPathOptions = {}
): Promise<StartLobbyRoomResponse> {
  return requestJson<StartLobbyRoomResponse, JoinLeaveLobbyRoomRequest>(
    appendQuery(ApiEndpoint.Rooms.Start(roomId), { [QueryParam.GameType]: options.gameType }),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function addLobbyAIRoomSeat(
  roomId: string,
  payload: AddLobbyAISeatRequest,
  options: LobbyRoomPathOptions = {}
): Promise<LobbyRoomActionResponse> {
  return requestJson<LobbyRoomActionResponse, AddLobbyAISeatRequest>(
    appendQuery(ApiEndpoint.Rooms.AddAI(roomId), { [QueryParam.GameType]: options.gameType }),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function quickJoinLobbyRoom(payload: QuickJoinLobbyRoomRequest): Promise<LobbyRoomActionResponse> {
  return requestJson<LobbyRoomActionResponse, QuickJoinLobbyRoomRequest>(
    ApiEndpoint.Rooms.QuickJoin,
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function enqueueMatchmaking(payload: MatchmakingQueueRequest): Promise<MatchmakingQueueResponse> {
  return requestJson<MatchmakingQueueResponse, MatchmakingQueueRequest>(
    ApiEndpoint.Matchmaking.Queue,
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function getMatchmakingStatus(ticketId: string): Promise<MatchmakingStatusResponse> {
  const endpoint = appendQuery(ApiEndpoint.Matchmaking.Base, { ticketId });
  return requestJson<MatchmakingStatusResponse>(endpoint, {
    method: HttpMethod.Get,
    authMode: 'required',
  });
}

export async function leaveMatchmaking(ticketId: string): Promise<Record<string, unknown>> {
  const endpoint = appendQuery(ApiEndpoint.Matchmaking.Queue, { ticketId });
  return requestJson<Record<string, unknown>>(endpoint, {
    method: HttpMethod.Delete,
    authMode: 'required',
  });
}
