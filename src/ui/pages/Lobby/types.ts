import type {
  LobbyRoom,
  LobbyAIDifficulty,
  LobbyAIRole,
  LobbyRoomMode,
  LobbyRoomType,
  LobbyStakeType,
  LobbyTrainingGuideMode,
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
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: LobbyAIDifficulty;
  aiRole?: LobbyAIRole;
  coachEnabled?: boolean;
  coachModelId?: string;
  guideMode?: LobbyTrainingGuideMode;
  allowSpectators: boolean;
  stakeType: LobbyStakeType;
  stakeAmount: number;
  turnTimerSeconds: number;
  region: string;
  isPrivate: boolean;
}

export interface LobbyRoomChatMessage {
  name: string;
  msg: string;
  ago: string;
  avatarUrl?: string | null;
}

export interface LobbyRoomServerStatus {
  active: string;
  ping: string;
  options: Array<{
    name: string;
    ping: string;
    active: boolean;
  }>;
}

export interface QuickJoinLobbyRoomForm {
  mode?: LobbyRoomMode;
  allowAI?: boolean;
  stakeType?: LobbyStakeType;
  maxPlayers?: number;
}

export interface AddLobbyAIRoomSeatForm {
  displayName?: string;
  aiProviderId?: string;
  aiModelId?: string;
  difficulty?: LobbyAIDifficulty;
  aiRole?: LobbyAIRole;
}

export interface LobbyRoomListFilters {
  search?: string;
  mode?: LobbyRoomMode;
  visibility?: LobbyVisibility;
  status?: string;
  stakeType?: LobbyStakeType;
  allowAI?: boolean;
  sort?: 'newest' | 'oldest' | 'fullest' | 'emptiest';
}

export interface LobbyRoomsState {
  rooms: LobbyRoom[];
  joinedRoom: LobbyRoom | null;
  chatMessages: LobbyRoomChatMessage[];
  server: LobbyRoomServerStatus | null;
  socketConnected: boolean;
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
  readyRoom: (roomId: string, userId: string) => Promise<void>;
  unreadyRoom: (roomId: string, userId: string) => Promise<void>;
  startRoom: (roomId: string, userId: string) => Promise<void>;
  addAIRoomSeat: (roomId: string, userId: string, form?: AddLobbyAIRoomSeatForm) => Promise<void>;
  sendRoomChat: (message: string) => void;
  filters: LobbyRoomListFilters;
  setFilters: (filters: LobbyRoomListFilters) => void;
}

export const DefaultCreateLobbyRoomForm: CreateLobbyRoomForm = {
  roomType: 'game',
  mode: 'casual',
  visibility: 'public',
  maxPlayers: 4,
  gameType: 'claim',
  allowAI: true,
  aiCount: 0,
  difficulty: 'normal',
  aiRole: 'opponent',
  coachEnabled: false,
  guideMode: 'off',
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
