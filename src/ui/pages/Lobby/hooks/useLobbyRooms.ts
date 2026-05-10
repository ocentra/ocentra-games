import { useCallback, useEffect, useState } from 'react';
import {
  createLobbyRoom,
  joinLobbyRoom,
  leaveLobbyRoom,
  listLobbyRooms,
  quickJoinLobbyRoom,
  spectateLobbyRoom,
  type LobbyRoom,
} from '@ocentra/api-domain/multiplayer';
import type { CreateLobbyRoomForm, LobbyRoomsState, QuickJoinLobbyRoomForm } from '@/ui/pages/Lobby/types';

const RoomPollIntervalMs = 10000;

export function useLobbyRooms(gameTypeFilter?: string): LobbyRoomsState {
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const response = await listLobbyRooms({ gameType: gameTypeFilter });
      setRooms(response.rooms ?? []);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  }, [gameTypeFilter]);

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

  const createRoom = useCallback(async (form: CreateLobbyRoomForm, userId: string, displayName?: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await createLobbyRoom({
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
        allowSpectators: form.allowSpectators,
        stakeType: form.stakeType,
        stakeAmount: form.stakeAmount,
        turnTimerSeconds: form.turnTimerSeconds,
        region: form.region,
        isPrivate: form.isPrivate,
      });
      await refresh();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  }, [gameTypeFilter, refresh]);

  const quickJoin = useCallback(async (form: QuickJoinLobbyRoomForm, userId: string, displayName?: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId('quick-join');
    setError(null);

    try {
      await quickJoinLobbyRoom({
        userId,
        displayName,
        gameType: gameTypeFilter || 'claim',
        mode: form.mode,
        allowAI: form.allowAI,
        stakeType: form.stakeType,
        maxPlayers: form.maxPlayers,
        createIfMissing: true,
      });
      await refresh();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to quick join');
    } finally {
      setBusyRoomId(null);
    }
  }, [gameTypeFilter, refresh]);

  const joinRoom = useCallback(async (roomId: string, userId: string, displayName?: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      await joinLobbyRoom(roomId, { userId, displayName }, { gameType: gameTypeFilter });
      await refresh();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to join room');
    } finally {
      setBusyRoomId(null);
    }
  }, [gameTypeFilter, refresh]);

  const spectateRoom = useCallback(async (roomId: string, userId: string, displayName?: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      await spectateLobbyRoom(roomId, { userId, displayName }, { gameType: gameTypeFilter });
      await refresh();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to spectate room');
    } finally {
      setBusyRoomId(null);
    }
  }, [gameTypeFilter, refresh]);

  const leaveRoom = useCallback(async (roomId: string, userId: string) => {
    if (!userId) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      await leaveLobbyRoom(roomId, { userId }, { gameType: gameTypeFilter });
      await refresh();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to leave room');
    } finally {
      setBusyRoomId(null);
    }
  }, [gameTypeFilter, refresh]);

  return {
    rooms,
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
  };
}
