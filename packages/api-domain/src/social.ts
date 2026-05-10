import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import {
  ActivityFeedDOSegment,
  MessageDOSegment,
  NotificationDOSegment,
  PartyDOSegment,
} from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { requestJson } from './httpClient';

export interface PresenceResponse {
  status?: string;
  friends?: string[];
}

export interface FriendsResponse {
  friends: Array<{ friendId: string; status?: string }>;
}

export interface PartyMember {
  userId: string;
}

export interface PartyStateResponse {
  partyId: string;
  leaderId?: string;
  members: Array<PartyMember | string>;
  invites?: Array<string | { userId: string; invitedBy?: string; invitedAt?: number }>;
}

export interface MessageItem {
  messageId: string;
  senderId: string;
  content: string;
  timestamp: number;
}

export interface MessagesResponse {
  messages: MessageItem[];
}

export interface MessageListOptions {
  limit?: number;
  before?: string;
}

export interface NotificationsResponse {
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string;
    read: boolean;
  }>;
}

export interface FeedResponse {
  items: Array<{
    id: string;
    type: string;
    payload: Record<string, unknown>;
  }>;
}

export async function getPresence(userId: string): Promise<PresenceResponse> {
  return requestJson<PresenceResponse>(ApiEndpoint.Presence.ById(userId));
}

export async function listFriends(): Promise<FriendsResponse> {
  return requestJson<FriendsResponse>(ApiEndpoint.Friends.Base, {
    method: HttpMethod.Get,
    authMode: 'required',
  });
}

export async function addFriend(friendId: string): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(ApiEndpoint.Friends.ById(friendId), {
    method: HttpMethod.Post,
    body: {},
    authMode: 'required',
  });
}

export async function removeFriend(friendId: string): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(ApiEndpoint.Friends.ById(friendId), {
    method: HttpMethod.Delete,
    body: {},
    authMode: 'required',
  });
}

export async function createParty(): Promise<PartyStateResponse> {
  return requestJson<PartyStateResponse>(ApiEndpoint.Party.Base, {
    method: HttpMethod.Post,
    body: {},
    authMode: 'required',
  });
}

export async function getParty(partyId: string): Promise<PartyStateResponse> {
  return requestJson<PartyStateResponse>(ApiEndpoint.Party.ById(partyId), {
    method: HttpMethod.Get,
    authMode: 'required',
  });
}

export async function joinParty(partyId: string): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(`${ApiEndpoint.Party.ById(partyId)}/${PartyDOSegment.Join}`, {
    method: HttpMethod.Post,
    body: {},
    authMode: 'required',
  });
}

export async function leaveParty(partyId: string): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(`${ApiEndpoint.Party.ById(partyId)}/${PartyDOSegment.Leave}`, {
    method: HttpMethod.Post,
    body: {},
    authMode: 'required',
  });
}

export async function inviteToParty(partyId: string, inviteeId: string): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(`${ApiEndpoint.Party.ById(partyId)}/${PartyDOSegment.Invite}`, {
    method: HttpMethod.Post,
    body: { inviteeId },
    authMode: 'required',
  });
}

function withMessageQuery(endpoint: string, options?: MessageListOptions): string {
  const params = new URLSearchParams();
  if (options?.limit !== undefined) params.set(QueryParam.Limit, String(options.limit));
  if (options?.before) params.set('before', options.before);
  const query = params.toString();
  return query ? `${endpoint}?${query}` : endpoint;
}

export async function listMessages(conversationId: string, options?: MessageListOptions): Promise<MessagesResponse> {
  return requestJson<MessagesResponse>(withMessageQuery(ApiEndpoint.Message.ByConversation(conversationId), options), {
    method: HttpMethod.Get,
    authMode: 'required',
  });
}

export async function sendMessage(conversationId: string, content: string): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(
    `${ApiEndpoint.Message.ByConversation(conversationId)}/${MessageDOSegment.Send}`,
    {
      method: HttpMethod.Post,
      body: { content },
      authMode: 'required',
    }
  );
}

export async function markMessagesRead(conversationId: string, messageIds: string[]): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(
    `${ApiEndpoint.Message.ByConversation(conversationId)}/${MessageDOSegment.ReadReceipt}`,
    {
      method: HttpMethod.Post,
      body: { messageIds },
      authMode: 'required',
    }
  );
}

export async function listNotifications(): Promise<NotificationsResponse> {
  return requestJson<NotificationsResponse>(`${ApiEndpoint.Notification.Base}/${NotificationDOSegment.List}`, {
    method: HttpMethod.Get,
    authMode: 'required',
  });
}

export async function markNotificationsRead(ids: string[]): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(`${ApiEndpoint.Notification.Base}/${NotificationDOSegment.MarkRead}`, {
    method: HttpMethod.Post,
    body: { ids },
    authMode: 'required',
  });
}

export async function getNotificationPreferences(): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(`${ApiEndpoint.Notification.Base}/${NotificationDOSegment.Preferences}`, {
    method: HttpMethod.Get,
    authMode: 'required',
  });
}

export async function updateNotificationPreferences(
  preferences: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(`${ApiEndpoint.Notification.Base}/${NotificationDOSegment.Preferences}`, {
    method: HttpMethod.Post,
    body: preferences,
    authMode: 'required',
  });
}

export async function listFeed(): Promise<FeedResponse> {
  return requestJson<FeedResponse>(`${ApiEndpoint.Feed.Base}/${ActivityFeedDOSegment.List}`, {
    method: HttpMethod.Get,
    authMode: 'required',
  });
}

export async function appendFeed(
  type: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  return requestJson<Record<string, unknown>>(`${ApiEndpoint.Feed.Base}/${ActivityFeedDOSegment.Append}`, {
    method: HttpMethod.Post,
    body: { type, payload },
    authMode: 'required',
  });
}
