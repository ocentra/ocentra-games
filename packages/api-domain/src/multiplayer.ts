import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { requestJson } from './httpClient';

export type LobbyRoomType = 'lobby' | 'game' | 'tournament' | 'private';
export type LobbyRoomMode = 'casual' | 'ranked' | 'training' | 'benchmark' | 'stakes';
export type LobbyVisibility = 'public' | 'private' | 'friends';
export type LobbyStakeType = 'free' | 'game-coin' | 'real-money';

export interface LobbyRoomPlayer {
  userId: string;
  displayName?: string;
  seatIndex?: number;
  isHost?: boolean;
  isReady?: boolean;
  isAI?: boolean;
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
  turnTimerSeconds?: number;
  region?: string;
  isPrivate?: boolean;
  viewerJoined?: boolean;
  viewerSpectating?: boolean;
  joinCode?: string;
  players?: LobbyRoomPlayer[];
  createdAt?: number;
}

export interface LobbyRoomsResponse {
  rooms: LobbyRoom[];
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
  gameType?: string;
  mode?: string;
  visibility?: string;
}

export interface LobbyRoomPathOptions {
  gameType?: string;
}

export interface QuickJoinLobbyRoomRequest {
  userId: string;
  displayName?: string;
  gameType: string;
  mode?: LobbyRoomMode | string;
  allowAI?: boolean;
  stakeType?: LobbyStakeType | string;
  maxPlayers?: number;
  createIfMissing?: boolean;
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
  query: Record<string, string | undefined>
): string {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  const raw = params.toString();
  return raw.length === 0 ? endpoint : `${endpoint}?${raw}`;
}

export async function listLobbyRooms(options: ListLobbyRoomsOptions = {}): Promise<LobbyRoomsResponse> {
  return requestJson<LobbyRoomsResponse>(appendQuery(ApiEndpoint.Rooms.Base, {
    [QueryParam.GameType]: options.gameType,
    [QueryParam.Mode]: options.mode,
    [QueryParam.Visibility]: options.visibility,
  }));
}

export async function createLobbyRoom(payload: CreateLobbyRoomRequest): Promise<LobbyRoom> {
  return requestJson<LobbyRoom, CreateLobbyRoomRequest>(ApiEndpoint.Rooms.Base, {
    method: HttpMethod.Post,
    body: payload,
    authMode: 'required',
  });
}

export async function joinLobbyRoom(
  roomId: string,
  payload: JoinLobbyRoomRequest,
  options: LobbyRoomPathOptions = {}
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>, JoinLobbyRoomRequest>(
    appendQuery(ApiEndpoint.Rooms.Join(roomId), { [QueryParam.GameType]: options.gameType }),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function leaveLobbyRoom(
  roomId: string,
  payload: JoinLeaveLobbyRoomRequest,
  options: LobbyRoomPathOptions = {}
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>, JoinLeaveLobbyRoomRequest>(
    appendQuery(ApiEndpoint.Rooms.Leave(roomId), { [QueryParam.GameType]: options.gameType }),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function spectateLobbyRoom(
  roomId: string,
  payload: JoinLobbyRoomRequest,
  options: LobbyRoomPathOptions = {}
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>, JoinLobbyRoomRequest>(
    appendQuery(ApiEndpoint.Rooms.Spectate(roomId), { [QueryParam.GameType]: options.gameType }),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function quickJoinLobbyRoom(payload: QuickJoinLobbyRoomRequest): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>, QuickJoinLobbyRoomRequest>(
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
