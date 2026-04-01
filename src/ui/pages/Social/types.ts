import type {
  FeedResponse,
  FriendsResponse,
  MessageItem,
  NotificationsResponse,
  PartyStateResponse,
  PresenceResponse,
} from '@ocentra/api-domain/social';

export interface SocialState {
  loading: boolean;
  error: string | null;
  presence: PresenceResponse | null;
  friends: FriendsResponse['friends'];
  party: PartyStateResponse | null;
  notifications: NotificationsResponse['notifications'];
  feedItems: FeedResponse['items'];
  messages: MessageItem[];
  activeConversationId: string;
}

export const SocialDefaultConversationId = 'dm:me:friend';
