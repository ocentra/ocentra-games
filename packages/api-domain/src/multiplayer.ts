import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { requestJson } from './httpClient';

export interface LobbyRoom {
  roomId: string;
  hostId: string;
  roomType?: string;
  maxPlayers?: number;
  currentPlayers?: number;
  gameStatus?: string;
  gameType?: string;
  isPrivate?: boolean;
  createdAt?: number;
}

export interface LobbyRoomsResponse {
  rooms: LobbyRoom[];
}

export interface CreateLobbyRoomRequest {
  hostId: string;
  roomType: string;
  maxPlayers: number;
  gameType: string;
  isPrivate: boolean;
  roomId?: string;
}

export interface JoinLeaveLobbyRoomRequest {
  userId: string;
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

export async function listLobbyRooms(): Promise<LobbyRoomsResponse> {
  return requestJson<LobbyRoomsResponse>(ApiEndpoint.Rooms.Base);
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
  payload: JoinLeaveLobbyRoomRequest
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>, JoinLeaveLobbyRoomRequest>(
    ApiEndpoint.Rooms.Join(roomId),
    { method: HttpMethod.Post, body: payload, authMode: 'required' }
  );
}

export async function leaveLobbyRoom(
  roomId: string,
  payload: JoinLeaveLobbyRoomRequest
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>, JoinLeaveLobbyRoomRequest>(
    ApiEndpoint.Rooms.Leave(roomId),
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
