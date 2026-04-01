import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import {
  createLobbyRoom,
  joinLobbyRoom,
  leaveLobbyRoom,
  listLobbyRooms,
  type LobbyRoom,
} from '@ocentra/api-domain/multiplayer';
import type { CreateLobbyRoomForm, LobbyRoomsState } from '@/ui/pages/Lobby/types';

const RoomPollIntervalMs = 5000;

export function useLobbyRooms(user: UserProfile | null, gameTypeFilter?: string): LobbyRoomsState {
  const [rooms, setRooms] = useState<LobbyRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyRoomId, setBusyRoomId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);

    try {
      const response = await listLobbyRooms();
      const allRooms = response.rooms ?? [];
      const filteredRooms = gameTypeFilter
        ? allRooms.filter((room) => room.gameType === gameTypeFilter)
        : allRooms;
      setRooms(filteredRooms);
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
      void refresh();
    }, RoomPollIntervalMs);

    return () => {
      window.clearInterval(timer);
    };
  }, [refresh]);

  const createRoom = useCallback(async (form: CreateLobbyRoomForm) => {
    if (!user?.uid) {
      setError('Sign in required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      await createLobbyRoom({
        hostId: user.uid,
        roomType: form.roomType,
        maxPlayers: form.maxPlayers,
        gameType: form.gameType || gameTypeFilter || '',
        isPrivate: form.isPrivate,
      });
      await refresh();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to create room');
    } finally {
      setCreating(false);
    }
  }, [gameTypeFilter, refresh, user?.uid]);

  const joinRoom = useCallback(async (roomId: string) => {
    if (!user?.uid) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      await joinLobbyRoom(roomId, { userId: user.uid });
      await refresh();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to join room');
    } finally {
      setBusyRoomId(null);
    }
  }, [refresh, user?.uid]);

  const leaveRoom = useCallback(async (roomId: string) => {
    if (!user?.uid) {
      setError('Sign in required');
      return;
    }

    setBusyRoomId(roomId);
    setError(null);

    try {
      await leaveLobbyRoom(roomId, { userId: user.uid });
      await refresh();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to leave room');
    } finally {
      setBusyRoomId(null);
    }
  }, [refresh, user?.uid]);

  return {
    rooms,
    loading,
    busyRoomId,
    creating,
    error,
    refresh,
    createRoom,
    joinRoom,
    leaveRoom,
  };
}
