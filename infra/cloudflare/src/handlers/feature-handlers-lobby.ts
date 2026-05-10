import type { Env } from '@/constants/env';
import { getCorsHeaders } from '@/utils/cors';
import { HttpContentType, HttpHeader, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import {
  DEFAULT_SHARD,
  getLobbyGameBucketKeys,
  getLobbyRoomShardKey,
  getLobbyShardKey,
} from '@/handlers/feature-handlers-helpers';

export type LobbyRoomListItem = {
  roomId: string;
  roomType: string;
  maxPlayers: number;
  currentPlayers: number;
  currentSpectators: number;
  gameStatus: string;
  status?: string;
  hostId: string;
  gameType?: string;
  isPrivate?: boolean;
  createdAt: number;
};

const DEFAULT_LOBBY_LIST_LIMIT = 50;
const MAX_LOBBY_LIST_LIMIT = 100;

export function clampLobbyListLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return DEFAULT_LOBBY_LIST_LIMIT;
  return Math.max(1, Math.min(MAX_LOBBY_LIST_LIMIT, parsed));
}

function lobbyRoomSortValue(room: LobbyRoomListItem, sort: string): number {
  if (sort === 'oldest' || sort === 'newest') return room.createdAt;
  return room.currentPlayers;
}

export function sortLobbyRooms(rooms: LobbyRoomListItem[], sort: string): LobbyRoomListItem[] {
  return [...rooms].sort((a, b) => {
    if (sort === 'oldest') return a.createdAt - b.createdAt || a.roomId.localeCompare(b.roomId);
    if (sort === 'fullest') return b.currentPlayers - a.currentPlayers || b.createdAt - a.createdAt || a.roomId.localeCompare(b.roomId);
    if (sort === 'emptiest') return a.currentPlayers - b.currentPlayers || b.createdAt - a.createdAt || a.roomId.localeCompare(b.roomId);
    return b.createdAt - a.createdAt || a.roomId.localeCompare(b.roomId);
  });
}

export function encodeLobbyCursor(room: LobbyRoomListItem, sort: string): string {
  return encodeURIComponent(JSON.stringify({
    sort,
    roomId: room.roomId,
    createdAt: room.createdAt,
    players: lobbyRoomSortValue(room, sort),
  }));
}

function uniqueLobbyShardKeys(keys: string[]): string[] {
  return [...new Set(keys.filter(Boolean))];
}

export function getLobbyRoomActionShardKeys(gameType: string, roomId: string): string[] {
  if (gameType) {
    return uniqueLobbyShardKeys([
      getLobbyRoomShardKey(gameType, roomId),
      ...getLobbyGameBucketKeys(gameType),
    ]);
  }
  return uniqueLobbyShardKeys([getLobbyShardKey(roomId), DEFAULT_SHARD]);
}

export function lobbyResponse(env: Env, data: unknown, status: number = HttpStatus.Ok): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson, ...getCorsHeaders(env) },
  });
}
