import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { CloudflareHttpError } from '@ocentra/api-domain/httpClient';
import {
  addFriend,
  appendFeed,
  createParty,
  getParty,
  getPresence,
  inviteToParty,
  joinParty,
  leaveParty,
  listFeed,
  listFriends,
  listMessages,
  listNotifications,
  markMessagesRead,
  markNotificationsRead,
  removeFriend,
  sendMessage,
  type MessageItem,
  type PartyStateResponse,
} from '@ocentra/api-domain/social';
import { SocialDefaultConversationId, type SocialState } from '@/ui/pages/Social/types';

interface SocialHubData extends SocialState {
  refreshAll: () => Promise<void>;
  addFriendById: (friendId: string) => Promise<void>;
  removeFriendById: (friendId: string) => Promise<void>;
  createPartyForUser: () => Promise<void>;
  loadPartyById: (partyId: string) => Promise<void>;
  joinPartyById: (partyId: string) => Promise<void>;
  leaveCurrentParty: () => Promise<void>;
  inviteToCurrentParty: (inviteeId: string) => Promise<void>;
  loadMessagesForConversation: (conversationId: string) => Promise<void>;
  sendMessageToConversation: (conversationId: string, content: string) => Promise<void>;
  markConversationRead: (conversationId: string, messageIds: string[]) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  appendActivityFeed: (type: string, payload: Record<string, unknown>) => Promise<void>;
}

function mapError(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return fallback;
}

export function useSocialHubData(user: UserProfile | null): SocialHubData {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<SocialState['presence']>(null);
  const [friends, setFriends] = useState<SocialState['friends']>([]);
  const [party, setParty] = useState<PartyStateResponse | null>(null);
  const [notifications, setNotifications] = useState<SocialState['notifications']>([]);
  const [feedItems, setFeedItems] = useState<SocialState['feedItems']>([]);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [activeConversationId, setActiveConversationId] = useState(SocialDefaultConversationId);

  const refreshAll = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [presenceResult, friendsResult, notificationResult, feedResult] = await Promise.all([
        getPresence(user.uid),
        listFriends(),
        listNotifications(),
        listFeed(),
      ]);

      setPresence(presenceResult);
      setFriends(friendsResult.friends ?? []);
      setNotifications(notificationResult.notifications ?? []);
      setFeedItems(feedResult.items ?? []);
    } catch (refreshError) {
      if (refreshError instanceof CloudflareHttpError && refreshError.status === 401) {
        setPresence(null);
        setFriends([]);
        setNotifications([]);
        setFeedItems([]);
        setError(null);
      } else {
        setError(mapError(refreshError, 'Failed to load social data'));
      }
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const addFriendById = useCallback(async (friendId: string) => {
    if (!friendId) {
      return;
    }
    setError(null);
    try {
      await addFriend(friendId);
      const response = await listFriends();
      setFriends(response.friends ?? []);
    } catch (friendError) {
      setError(mapError(friendError, 'Failed to add friend'));
    }
  }, []);

  const removeFriendById = useCallback(async (friendId: string) => {
    if (!friendId) {
      return;
    }
    setError(null);
    try {
      await removeFriend(friendId);
      const response = await listFriends();
      setFriends(response.friends ?? []);
    } catch (friendError) {
      setError(mapError(friendError, 'Failed to remove friend'));
    }
  }, []);

  const createPartyForUser = useCallback(async () => {
    setError(null);
    try {
      const response = await createParty();
      setParty(response);
    } catch (partyError) {
      setError(mapError(partyError, 'Failed to create party'));
    }
  }, []);

  const loadPartyById = useCallback(async (partyId: string) => {
    if (!partyId) {
      return;
    }
    setError(null);
    try {
      const response = await getParty(partyId);
      setParty(response);
    } catch (partyError) {
      setError(mapError(partyError, 'Failed to load party'));
    }
  }, []);

  const joinPartyById = useCallback(async (partyId: string) => {
    if (!partyId) {
      return;
    }
    setError(null);
    try {
      await joinParty(partyId);
      const response = await getParty(partyId);
      setParty(response);
    } catch (partyError) {
      setError(mapError(partyError, 'Failed to join party'));
    }
  }, []);

  const leaveCurrentParty = useCallback(async () => {
    if (!party?.partyId) {
      return;
    }
    setError(null);
    try {
      await leaveParty(party.partyId);
      setParty(null);
    } catch (partyError) {
      setError(mapError(partyError, 'Failed to leave party'));
    }
  }, [party?.partyId]);

  const inviteToCurrentParty = useCallback(async (inviteeId: string) => {
    if (!party?.partyId || !inviteeId) {
      return;
    }
    setError(null);
    try {
      await inviteToParty(party.partyId, inviteeId);
      const response = await getParty(party.partyId);
      setParty(response);
    } catch (partyError) {
      setError(mapError(partyError, 'Failed to invite player'));
    }
  }, [party?.partyId]);

  const loadMessagesForConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) {
      return;
    }
    setError(null);
    try {
      const response = await listMessages(conversationId);
      setMessages(response.messages ?? []);
      setActiveConversationId(conversationId);
    } catch (messageError) {
      setError(mapError(messageError, 'Failed to load messages'));
    }
  }, []);

  const sendMessageToConversation = useCallback(async (conversationId: string, content: string) => {
    if (!conversationId || !content) {
      return;
    }
    setError(null);
    try {
      await sendMessage(conversationId, content);
      const response = await listMessages(conversationId);
      setMessages(response.messages ?? []);
      setActiveConversationId(conversationId);
    } catch (messageError) {
      setError(mapError(messageError, 'Failed to send message'));
    }
  }, []);

  const markConversationRead = useCallback(async (conversationId: string, messageIds: string[]) => {
    if (!conversationId || messageIds.length === 0) {
      return;
    }
    setError(null);
    try {
      await markMessagesRead(conversationId, messageIds);
    } catch (messageError) {
      setError(mapError(messageError, 'Failed to mark messages read'));
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    const ids = notifications.filter((item) => !item.read).map((item) => item.id);
    if (ids.length === 0) {
      return;
    }
    setError(null);
    try {
      await markNotificationsRead(ids);
      const response = await listNotifications();
      setNotifications(response.notifications ?? []);
    } catch (notificationError) {
      setError(mapError(notificationError, 'Failed to mark notifications read'));
    }
  }, [notifications]);

  const appendActivityFeed = useCallback(async (type: string, payload: Record<string, unknown>) => {
    if (!type) {
      return;
    }
    setError(null);
    try {
      await appendFeed(type, payload);
      const response = await listFeed();
      setFeedItems(response.items ?? []);
    } catch (feedError) {
      setError(mapError(feedError, 'Failed to append feed'));
    }
  }, []);

  return {
    loading,
    error,
    presence,
    friends,
    party,
    notifications,
    feedItems,
    messages,
    activeConversationId,
    refreshAll,
    addFriendById,
    removeFriendById,
    createPartyForUser,
    loadPartyById,
    joinPartyById,
    leaveCurrentParty,
    inviteToCurrentParty,
    loadMessagesForConversation,
    sendMessageToConversation,
    markConversationRead,
    markAllNotificationsRead,
    appendActivityFeed,
  };
}
