import type {
  LobbyRoom,
  LobbyRoomMode,
  LobbyRoomType,
  LobbyStakeType,
  LobbyVisibility,
} from '@ocentra/api-domain/multiplayer';

export interface CreateLobbyRoomForm {
  roomType: LobbyRoomType;
  roomName?: string;
  mode: LobbyRoomMode;
  visibility: LobbyVisibility;
  maxPlayers: number;
  gameType: string;
  variantId?: string;
  allowAI: boolean;
  aiCount: number;
  allowSpectators: boolean;
  stakeType: LobbyStakeType;
  stakeAmount: number;
  turnTimerSeconds: number;
  region: string;
  isPrivate: boolean;
}

export interface QuickJoinLobbyRoomForm {
  mode?: LobbyRoomMode;
  allowAI?: boolean;
  stakeType?: LobbyStakeType;
  maxPlayers?: number;
}

export interface LobbyRoomsState {
  rooms: LobbyRoom[];
  loading: boolean;
  busyRoomId: string | null;
  creating: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createRoom: (form: CreateLobbyRoomForm, userId: string, displayName?: string) => Promise<void>;
  quickJoin: (form: QuickJoinLobbyRoomForm, userId: string, displayName?: string) => Promise<void>;
  joinRoom: (roomId: string, userId: string, displayName?: string) => Promise<void>;
  spectateRoom: (roomId: string, userId: string, displayName?: string) => Promise<void>;
  leaveRoom: (roomId: string, userId: string) => Promise<void>;
}

export const DefaultCreateLobbyRoomForm: CreateLobbyRoomForm = {
  roomType: 'game',
  mode: 'casual',
  visibility: 'public',
  maxPlayers: 4,
  gameType: 'claim',
  allowAI: true,
  aiCount: 0,
  allowSpectators: true,
  stakeType: 'free',
  stakeAmount: 0,
  turnTimerSeconds: 60,
  region: 'global',
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
