import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addFriend as addSocialFriend,
  createParty as createSocialParty,
  getParty,
  getPresence,
  inviteToParty,
  leaveParty as leaveSocialParty,
  listFriends,
  listMessages,
  sendMessage,
  type PartyStateResponse,
} from '@ocentra/api-domain/social';
import {
  getSettings,
  updateSettings,
} from '@ocentra/api-domain/playerHub';
import type {
  LobbyChatMessageItem,
  LobbyFriendItem,
  LobbyPartyStatus,
  LobbyRewardStatus,
  LobbyRoomLike,
  LobbyServerStatus,
} from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import {
  claimDailyRewardSpinStatus,
  isDailyRewardSpinCollected,
  loadDailyRewardSpinStatus,
} from '@/ui/rewards/dailyRewardSpinState';

const LobbySideRefreshMs = 15000;
const LobbyMessageLimit = 6;
const PartyStoragePrefix = 'ocentra:lobby:party:';

const ServerOptions = [
  { regionId: 'na-east', name: 'NA East', ping: '42ms' },
  { regionId: 'na-west', name: 'NA West', ping: '63ms' },
  { regionId: 'eu-west', name: 'EU West', ping: '91ms' },
  { regionId: 'asia-south', name: 'Asia South', ping: '128ms' },
] as const;

type LobbySideServicesState = {
  friends: LobbyFriendItem[];
  lobbyChatMessages: LobbyChatMessageItem[];
  reward: LobbyRewardStatus | null;
  party: LobbyPartyStatus | null;
  server: LobbyServerStatus;
  loading: boolean;
  error: string | null;
  refresh: (nextUserId?: string) => Promise<void>;
  addFriend: (friendId: string, nextUserId?: string) => Promise<void>;
  inviteFriend: (friendId: string, nextUserId?: string) => Promise<void>;
  createParty: (nextUserId?: string) => Promise<void>;
  leaveParty: (nextUserId?: string) => Promise<void>;
  sendLobbyChat: (message: string, nextUserId?: string) => Promise<void>;
  claimReward: (nextUserId?: string) => Promise<void>;
  selectServer: (regionId: string, nextUserId?: string) => Promise<void>;
};

function normalizeConversationId(value: string): string {
  const normalized = value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'claim';
}

function lobbyConversationId(gameType: string): string {
  return `lobby-${normalizeConversationId(gameType)}`;
}

function directConversationId(userId: string, friendId: string): string {
  return `dm:${userId}:${friendId}`;
}

function partyStorageKey(userId: string, gameType: string): string {
  return `${PartyStoragePrefix}${userId}:${normalizeConversationId(gameType)}`;
}

function readStoredPartyId(userId: string, gameType: string): string | null {
  try {
    return window.sessionStorage.getItem(partyStorageKey(userId, gameType));
  } catch {
    return null;
  }
}

function writeStoredPartyId(userId: string, gameType: string, partyId: string): void {
  try {
    window.sessionStorage.setItem(partyStorageKey(userId, gameType), partyId);
  } catch {
    void 0;
  }
}

function clearStoredPartyId(userId: string, gameType: string): void {
  try {
    window.sessionStorage.removeItem(partyStorageKey(userId, gameType));
  } catch {
    void 0;
  }
}

function formatAgo(timestamp?: number): string {
  if (!timestamp) return 'Now';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'Now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

function toPartyStatus(party: PartyStateResponse | null): LobbyPartyStatus | null {
  if (!party?.partyId) return null;
  return {
    partyId: party.partyId,
    leaderId: party.leaderId,
    memberCount: party.members?.length ?? 0,
    inviteCount: party.invites?.length ?? 0,
    members: (party.members ?? []).map(member => ({ userId: typeof member === 'string' ? member : member.userId })),
  };
}

function toServerStatus(selectedRegionId: string, selecting = false): LobbyServerStatus {
  const active = ServerOptions.find(option => option.regionId === selectedRegionId) ?? ServerOptions[0];
  return {
    active: active.name,
    ping: selecting ? 'saving' : active.ping,
    selectedRegionId: active.regionId,
    selecting,
    options: ServerOptions.map(option => ({
      regionId: option.regionId,
      name: option.name,
      ping: option.ping,
      active: option.regionId === active.regionId,
    })),
  };
}

function toFriendState(status?: string): string {
  if (status === 'in-game') return 'In Game';
  if (status === 'online') return 'Online';
  if (status === 'lobby') return 'In Lobby';
  return 'Offline';
}

function toInviteMessage(gameType: string, room: LobbyRoomLike | null | undefined): string {
  const code = room?.joinCode ?? room?.roomId;
  if (!code) return `Join me in the ${gameType} lobby.`;
  return `Join my ${gameType} table with code ${code}.`;
}

export function useLobbySideServices(gameType: string, userId?: string | null, joinedRoom?: LobbyRoomLike | null): LobbySideServicesState {
  const [runtimeUserId, setRuntimeUserId] = useState<string | null>(userId ?? null);
  const [friends, setFriends] = useState<LobbyFriendItem[]>([]);
  const [lobbyChatMessages, setLobbyChatMessages] = useState<LobbyChatMessageItem[]>([]);
  const [reward, setReward] = useState<LobbyRewardStatus | null>(null);
  const [party, setParty] = useState<LobbyPartyStatus | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState<string>(ServerOptions[0].regionId);
  const [selectingServer, setSelectingServer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const activeUserId = userId ?? runtimeUserId;
  const conversationId = useMemo(() => lobbyConversationId(gameType), [gameType]);
  const server = useMemo(() => toServerStatus(selectedRegionId, selectingServer), [selectedRegionId, selectingServer]);

  useEffect(() => {
    if (userId) setRuntimeUserId(userId);
  }, [userId]);

  const loadMessages = useCallback(async () => {
    const response = await listMessages(conversationId, { limit: LobbyMessageLimit });
    setLobbyChatMessages((response.messages ?? []).slice(-LobbyMessageLimit).map(message => ({
      messageId: message.messageId,
      senderId: message.senderId,
      name: message.senderId === activeUserId ? 'You' : message.senderId,
      msg: message.content,
      ago: formatAgo(message.timestamp),
      timestamp: message.timestamp,
    })));
  }, [activeUserId, conversationId]);

  const loadFriends = useCallback(async () => {
    const response = await listFriends();
    const friendItems = await Promise.all((response.friends ?? []).slice(0, 6).map(async friend => {
      const presence = await getPresence(friend.friendId).catch(() => ({ status: friend.status }));
      return {
        userId: friend.friendId,
        name: friend.friendId,
        state: toFriendState(presence.status ?? friend.status),
        inviteState: 'idle' as const,
      };
    }));
    setFriends(previous => friendItems.map(item => ({
      ...item,
      inviteState: previous.find(existing => existing.userId === item.userId)?.inviteState ?? item.inviteState,
    })));
  }, []);

  const loadParty = useCallback(async (nextUserId: string) => {
    const storedPartyId = readStoredPartyId(nextUserId, gameType);
    if (!storedPartyId) {
      setParty(null);
      return;
    }
    const partyState = await getParty(storedPartyId).catch(() => null);
    if (!partyState?.partyId) {
      clearStoredPartyId(nextUserId, gameType);
      setParty(null);
      return;
    }
    setParty(toPartyStatus(partyState));
  }, [gameType]);

  const loadReward = useCallback(async (nextUserId: string) => {
    setReward(await loadDailyRewardSpinStatus(nextUserId));
  }, []);

  const loadSettings = useCallback(async (nextUserId: string) => {
    const response = await getSettings(nextUserId).catch(() => null);
    const preferred = response?.settings?.preferredServerRegion;
    if (preferred && ServerOptions.some(option => option.regionId === preferred)) {
      setSelectedRegionId(preferred);
    }
  }, []);

  const refresh = useCallback(async (nextUserId = activeUserId ?? undefined) => {
    if (!nextUserId) return;
    setRuntimeUserId(nextUserId);
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        loadFriends(),
        loadMessages(),
        loadParty(nextUserId),
        loadReward(nextUserId),
        loadSettings(nextUserId),
      ]);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to load lobby services');
    } finally {
      setLoading(false);
    }
  }, [activeUserId, loadFriends, loadMessages, loadParty, loadReward, loadSettings]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      void refresh();
    }, LobbySideRefreshMs);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const addFriend = useCallback(async (friendId: string, nextUserId = activeUserId ?? undefined) => {
    const normalizedFriendId = friendId.trim();
    if (!nextUserId || !normalizedFriendId) return;
    setRuntimeUserId(nextUserId);
    setError(null);
    try {
      await addSocialFriend(normalizedFriendId);
      await loadFriends();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to add friend');
    }
  }, [activeUserId, loadFriends]);

  const createParty = useCallback(async (nextUserId = activeUserId ?? undefined) => {
    if (!nextUserId) return;
    setRuntimeUserId(nextUserId);
    setError(null);
    try {
      const created = await createSocialParty();
      if (created.partyId) {
        writeStoredPartyId(nextUserId, gameType, created.partyId);
        const state = await getParty(created.partyId).catch(() => created);
        setParty(toPartyStatus(state));
      }
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to create party');
    }
  }, [activeUserId, gameType]);

  const leaveParty = useCallback(async (nextUserId = activeUserId ?? undefined) => {
    if (!nextUserId || !party?.partyId) return;
    setRuntimeUserId(nextUserId);
    setError(null);
    try {
      await leaveSocialParty(party.partyId);
      clearStoredPartyId(nextUserId, gameType);
      setParty(null);
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to leave party');
    }
  }, [activeUserId, gameType, party?.partyId]);

  const inviteFriend = useCallback(async (friendId: string, nextUserId = activeUserId ?? undefined) => {
    if (!nextUserId || !friendId) return;
    setRuntimeUserId(nextUserId);
    setError(null);
    setFriends(previous => previous.map(friend => friend.userId === friendId ? { ...friend, inviteState: 'inviting' } : friend));
    try {
      let partyId = party?.partyId ?? readStoredPartyId(nextUserId, gameType);
      if (!partyId) {
        const created = await createSocialParty();
        partyId = created.partyId;
        if (partyId) writeStoredPartyId(nextUserId, gameType, partyId);
      }
      if (!partyId) throw new Error('Party creation failed');
      await inviteToParty(partyId, friendId);
      await sendMessage(directConversationId(nextUserId, friendId), toInviteMessage(gameType, joinedRoom));
      const state = await getParty(partyId).catch(() => null);
      setParty(toPartyStatus(state));
      setFriends(previous => previous.map(friend => friend.userId === friendId ? { ...friend, inviteState: 'invited' } : friend));
    } catch (responseError) {
      setFriends(previous => previous.map(friend => friend.userId === friendId ? { ...friend, inviteState: 'failed' } : friend));
      setError(responseError instanceof Error ? responseError.message : 'Failed to invite friend');
    }
  }, [activeUserId, gameType, joinedRoom, party?.partyId]);

  const sendLobbyChat = useCallback(async (message: string, nextUserId = activeUserId ?? undefined) => {
    const content = message.trim();
    if (!nextUserId || !content) return;
    setRuntimeUserId(nextUserId);
    setError(null);
    try {
      await sendMessage(conversationId, content);
      await loadMessages();
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to send lobby chat');
    }
  }, [activeUserId, conversationId, loadMessages]);

  const claimReward = useCallback(async (nextUserId = activeUserId ?? undefined) => {
    if (!nextUserId) return;
    if (isDailyRewardSpinCollected(reward)) return;
    setRuntimeUserId(nextUserId);
    setReward(previous => previous ? { ...previous, claiming: true, readyLabel: 'CLAIMING...' } : previous);
    setError(null);
    try {
      setReward(await claimDailyRewardSpinStatus(nextUserId));
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to claim daily reward');
      await loadReward(nextUserId);
    }
  }, [activeUserId, loadReward, reward]);

  const selectServer = useCallback(async (regionId: string, nextUserId = activeUserId ?? undefined) => {
    if (!nextUserId || !ServerOptions.some(option => option.regionId === regionId)) return;
    setRuntimeUserId(nextUserId);
    setSelectingServer(true);
    setSelectedRegionId(regionId);
    setError(null);
    try {
      await updateSettings(nextUserId, { preferredServerRegion: regionId });
    } catch (responseError) {
      setError(responseError instanceof Error ? responseError.message : 'Failed to save server preference');
    } finally {
      setSelectingServer(false);
    }
  }, [activeUserId]);

  return {
    friends,
    lobbyChatMessages,
    reward,
    party,
    server,
    loading,
    error,
    refresh,
    addFriend,
    inviteFriend,
    createParty,
    leaveParty,
    sendLobbyChat,
    claimReward,
    selectServer,
  };
}
