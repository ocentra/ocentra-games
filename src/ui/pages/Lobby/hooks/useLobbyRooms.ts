import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildLobbyRoomWebSocketUrl,
  createLobbyRoom,
  joinLobbyRoom,
  leaveLobbyRoom,
  listLobbyRooms,
  quickJoinLobbyRoom,
  readyLobbyRoom,
  spectateLobbyRoom,
  startLobbyRoom,
  unreadyLobbyRoom,
  type LobbyRoom,
  type LobbyRoomActionResponse,
} from '@ocentra/api-domain/multiplayer';
import type {
  CreateLobbyRoomForm,
  LobbyRoomChatMessage,
  LobbyRoomsState,
  QuickJoinLobbyRoomForm,
} from '@/ui/pages/Lobby/types';

const RoomPollIntervalMs = 10000;
const RoomListLimit = 40;
const MaxChatMessages = 40;
const ReconnectTokenPrefix = 'ocentra:lobby:reconnect:';

type LobbySessionUser = {
  userId: string;
  displayName?: string;
};

type LobbySocketMessage = {
  type?: string;
  message?: {
    senderName?: string;
    senderId?: string;
    content?: string;
    timestamp?: number;
  };
  reconnectToken?: string;
  roomId?: string;
  gameStatus?: string;
  room?: LobbyRoom;
};

function tagViewer(room: LobbyRoom, userId?: string): LobbyRoom {
  if (!userId) return room;
  const viewerJoined = room.players?.some(player => player.userId === userId && !player.isAI) ?? room.viewerJoined;
  return { ...room, viewerJoined };
}

function upsertRoom(rooms: LobbyRoom[], room: LobbyRoom): LobbyRoom[] {
  const index = rooms.findIndex(item => item.roomId === room.roomId);
  if (index === -1) return [room, ...rooms];
  return rooms.map(item => item.roomId === room.roomId ? room : item);
}

function chatMessageFromSocket(message: LobbySocketMessage['message']): LobbyRoomChatMessage | null {
  if (!message?.content) return null;
  return {
    name: message.senderName ?? message.senderId ?? 'Player',
    msg: message.content,
    ago: 'Now',
  };
}

function reconnectStorageKey(roomId: string): string {
  return `${ReconnectTokenPrefix}${roomId}`;
}

function readReconnectToken(roomId: string): string | null {
  try {
    return window.sessionStorage.getItem(reconnectStorageKey(roomId));
  } catch {
    return null;
  }
}

function writeReconnectToken(roomId: string, token: string): void {
  try {
    window.sessionStorage.setItem(reconnectStorageKey(roomId), token);
  } catch {
    void 0;
  }
}

export function useLobbyRooms(gameTypeFilter?: string): LobbyRoomsState {
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [joinedRoom, setJoinedRoom] = useState<LobbyRoom | null>(null);
  const [sessionUser, setSessionUser] = useState<LobbySessionUser | null>(null);
  const [chatMessages, setChatMessages] = useState<LobbyRoomChatMessage[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const applyActionRoom = useCallback((response: LobbyRoomActionResponse, userId: string, displayName?: string) => {
    if (!response.room) return;
    const nextRoom = {
      ...tagViewer(response.room, userId),
      viewerSpectating: Boolean(response.spectating ?? response.room.viewerSpectating),
    };
    setSessionUser({ userId, displayName });
    setJoinedRoom(response.spectating ? null : nextRoom);
    setRooms(previous => upsertRoom(previous, nextRoom));
  }, []);

  const refresh = useCallback(async (viewerUserId = sessionUser?.userId) => {
    setError(null);

    try {
      const response = await listLobbyRooms({
        userId: viewerUserId,
        gameType: gameTypeFilter,
        limit: RoomListLimit,
        sort: 'newest',
      });
      const nextRooms = response.rooms ?? [];
      setRooms(nextRooms);
      setJoinedRoom(previous => {
        const targetRoomId = previous?.roomId;
        const refreshedRoom = targetRoomId
          ? nextRooms.find(room => room.roomId === targetRoomId)
          : nextRooms.find(room => room.viewerJoined);
        if (!refreshedRoom) return previous;
        return tagViewer(refreshedRoom, viewerUserId);
      });
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [gameTypeFilter, sessionUser?.userId]);

  const handleSocketMessage = useCallback((payload: LobbySocketMessage) => {
    if (payload.type === 'welcome') {
      setSocketConnected(true);
      if (payload.roomId && payload.reconnectToken) {
        writeReconnectToken(payload.roomId, payload.reconnectToken);
      }
    }

    if (payload.type === 'error') {
      const message = typeof (payload as { message?: unknown }).message === 'string'
        ? String((payload as { message?: unknown }).message)
        : 'Lobby realtime error';
      setError(message);
    }

    if (payload.type === 'chat') {
      const chatMessage = chatMessageFromSocket(payload.message);
      if (chatMessage) {
        setChatMessages(previous => [...previous.slice(Math.max(0, previous.length - MaxChatMessages + 1)), chatMessage]);
      }
    }

    if (payload.room) {
      const nextRoom = tagViewer(payload.room, sessionUser?.userId);
      setJoinedRoom(previous => previous?.roomId === nextRoom.roomId || nextRoom.viewerJoined ? nextRoom : previous);
      setRooms(previous => upsertRoom(previous, nextRoom));
      return;
    }

    const nextGameStatus = payload.gameStatus;
    if (payload.roomId && nextGameStatus) {
      setJoinedRoom(previous => {
        if (!previous || previous.roomId !== payload.roomId) return previous;
        return { ...previous, gameStatus: nextGameStatus };
      });
      setRooms(previous => previous.map(room => room.roomId === payload.roomId ? { ...room, gameStatus: nextGameStatus } : room));
    }

    if (payload.type === 'player-left' || payload.type === 'player-disconnected') {
      void refresh(sessionUser?.userId);
    }
  }, [refresh, sessionUser?.userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) {
        return;
      }
      void refresh();
    }, RoomPollIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    if (!joinedRoom?.roomId || !sessionUser?.userId) {
      setSocketConnected(false);
      return undefined;
    }

    const roomId = joinedRoom.roomId;
    const gameType = joinedRoom.gameType || gameTypeFilter || 'claim';
    let socket: WebSocket;
    let closed = false;

    try {
      socket = new WebSocket(buildLobbyRoomWebSocketUrl({ gameType, roomId }));
    } catch (socketError) {
      setSocketConnected(false);
      setError(socketError instanceof Error ? socketError.message : 'Failed to open lobby realtime connection');
      return undefined;
    }

    socketRef.current = socket;
    setSocketConnected(false);

    socket.onopen = () => {
      const reconnectToken = readReconnectToken(roomId);
      const payload = reconnectToken
        ? { type: 'reconnect', payload: { reconnectToken } }
        : { type: 'join-room', payload: { roomId, userId: sessionUser.userId, displayName: sessionUser.displayName } };
      socket.send(JSON.stringify(payload));
    };

    socket.onmessage = (event) => {
      try {
        handleSocketMessage(JSON.parse(String(event.data)) as LobbySocketMessage);
      } catch {
        void 0;
      }
    };

    socket.onerror = () => {
      setError('Lobby realtime connection failed');
    };

    socket.onclose = () => {
      if (!closed) setSocketConnected(false);
    };

    return () => {
      closed = true;
      if (socketRef.current === socket) socketRef.current = null;
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
    };
  }, [gameTypeFilter, handleSocketMessage, joinedRoom?.gameType, joinedRoom?.roomId, sessionUser?.displayName, sessionUser?.userId]);

  const createRoom = useCallback(async (form: CreateLobbyRoomForm, userId: string, displayName?: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await createLobbyRoom({
        hostId: userId,
        hostDisplayName: displayName,
        roomName: form.roomName,
        roomType: form.roomType,
        mode: form.mode,
        visibility: form.visibility,
        maxPlayers: form.maxPlayers,
        gameType: form.gameType || gameTypeFilter || '',
        variantId: form.variantId,
        allowAI: form.allowAI,
        aiCount: form.aiCount,
        aiProviderId: form.aiProviderId,
        aiModelId: form.aiModelId,
        difficulty: form.difficulty,
        aiRole: form.aiRole,
        coachEnabled: form.coachEnabled,
        coachModelId: form.coachModelId,
        guideMode: form.guideMode,
        allowSpectators: form.allowSpectators,
        stakeType: form.stakeType,
        stakeAmount: form.stakeAmount,
        turnTimerSeconds: form.turnTimerSeconds,
        region: form.region,
        isPrivate: form.isPrivate,
      });
      applyActionRoom(response, userId, displayName);
      await refresh(userId);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  }, [applyActionRoom, gameTypeFilter, refresh]);

  const quickJoin = useCallback(async (form: QuickJoinLobbyRoomForm, userId: string, displayName?: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId('quick-join');
    setError(null);

    try {
      const response = await quickJoinLobbyRoom({
        userId,
        displayName,
        gameType: gameTypeFilter || 'claim',
        mode: form.mode,
        allowAI: form.allowAI,
        stakeType: form.stakeType,
        maxPlayers: form.maxPlayers,
        createIfMissing: true,
      });
      applyActionRoom(response, userId, displayName);
      await refresh(userId);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to quick join');
    } finally {
      setBusyRoomId(null);
    }
  }, [applyActionRoom, gameTypeFilter, refresh]);

  const joinRoom = useCallback(async (roomId: string, userId: string, displayName?: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      const response = await joinLobbyRoom(roomId, { userId, displayName }, { gameType: gameTypeFilter });
      applyActionRoom(response, userId, displayName);
      await refresh(userId);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to join room');
    } finally {
      setBusyRoomId(null);
    }
  }, [applyActionRoom, gameTypeFilter, refresh]);

  const spectateRoom = useCallback(async (roomId: string, userId: string, displayName?: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      const response = await spectateLobbyRoom(roomId, { userId, displayName }, { gameType: gameTypeFilter });
      applyActionRoom(response, userId, displayName);
      await refresh(userId);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to spectate room');
    } finally {
      setBusyRoomId(null);
    }
  }, [applyActionRoom, gameTypeFilter, refresh]);

  const leaveRoom = useCallback(async (roomId: string, userId: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      await leaveLobbyRoom(roomId, { userId }, { gameType: gameTypeFilter });
      setJoinedRoom(previous => previous?.roomId === roomId ? null : previous);
      await refresh(userId);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to leave room');
    } finally {
      setBusyRoomId(null);
    }
  }, [gameTypeFilter, refresh]);

  const readyRoom = useCallback(async (roomId: string, userId: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      const response = await readyLobbyRoom(roomId, { userId }, { gameType: gameTypeFilter });
      applyActionRoom(response, userId, sessionUser?.displayName);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to ready room');
    } finally {
      setBusyRoomId(null);
    }
  }, [applyActionRoom, gameTypeFilter, sessionUser?.displayName]);

  const unreadyRoom = useCallback(async (roomId: string, userId: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      const response = await unreadyLobbyRoom(roomId, { userId }, { gameType: gameTypeFilter });
      applyActionRoom(response, userId, sessionUser?.displayName);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to unready room');
    } finally {
      setBusyRoomId(null);
    }
  }, [applyActionRoom, gameTypeFilter, sessionUser?.displayName]);

  const startRoom = useCallback(async (roomId: string, userId: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      const response = await startLobbyRoom(roomId, { userId }, { gameType: gameTypeFilter });
      applyActionRoom(response, userId, sessionUser?.displayName);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to start room');
    } finally {
      setBusyRoomId(null);
    }
  }, [applyActionRoom, gameTypeFilter, sessionUser?.displayName]);

  const sendRoomChat = useCallback((message: string) => {
    const content = message.trim();
    if (!content) return;
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      setError('Lobby chat disconnected');
      return;
    }
    socket.send(JSON.stringify({ type: 'chat', payload: { content } }));
  }, []);

  const server = useMemo(() => {
    const active = joinedRoom?.roomId ? `${joinedRoom.gameType ?? gameTypeFilter ?? 'claim'} room shard` : `${gameTypeFilter ?? 'claim'} discovery`;
    return {
      active,
      ping: socketConnected ? 'live ws' : '10s refresh',
      options: [
        { name: 'Room realtime', ping: socketConnected ? 'connected' : 'connecting', active: Boolean(joinedRoom?.roomId) },
        { name: 'Table discovery', ping: `${RoomPollIntervalMs / 1000}s`, active: true },
      ],
    };
  }, [gameTypeFilter, joinedRoom?.gameType, joinedRoom?.roomId, socketConnected]);

  return {
    rooms,
    joinedRoom,
    chatMessages,
    server,
    socketConnected,
    loading,
    busyRoomId,
    creating,
    error,
    refresh,
    createRoom,
    quickJoin,
    joinRoom,
    spectateRoom,
    leaveRoom,
    readyRoom,
    unreadyRoom,
    startRoom,
    sendRoomChat,
  };
}
