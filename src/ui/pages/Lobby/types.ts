import type { LobbyRoom } from '@ocentra/api-domain/multiplayer';

export interface CreateLobbyRoomForm {
  roomType: string;
  maxPlayers: number;
  gameType: string;
  isPrivate: boolean;
}

export interface LobbyRoomsState {
  rooms: LobbyRoom[];
  loading: boolean;
  busyRoomId: string | null;
  creating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createRoom: (form: CreateLobbyRoomForm, userId: string) => Promise<void>;
  joinRoom: (roomId: string, userId: string) => Promise<void>;
  leaveRoom: (roomId: string, userId: string) => Promise<void>;
}

export const DefaultCreateLobbyRoomForm: CreateLobbyRoomForm = {
  roomType: 'public',
  maxPlayers: 4,
  gameType: 'claim',
  isPrivate: false,
};

export function createDefaultLobbyRoomForm(gameType?: string): CreateLobbyRoomForm {
  if (!gameType || gameType.length === 0) {
    return DefaultCreateLobbyRoomForm;
  }

  return {
    ...DefaultCreateLobbyRoomForm,
    gameType,
  };
}
