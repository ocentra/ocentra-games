import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { SocialPageContent } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { APP_VERSION } from '@/constants/version';
import { useSocialHubData } from '@/ui/pages/Social/hooks/useSocialHubData';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';

interface SocialPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function SocialPage({ user, onLogout, onLogoutClick }: SocialPageProps) {
  const {
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
  } = useSocialHubData(user);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });

  return (
    <UnifiedPageShell
      className="social-page"
      background={<DynamicBackground />}
      header={
        <UnifiedHeader
          dynamicData={{
            gameName: "Social Hub",
            tagline: "Friends, parties, messages, notifications, and activity."
          }}
          config={{
            right: headerRightConfig,
            left: {
              onClick: () => EventBus.instance.publish(new ShowScreenEvent('home'))
            }
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <SocialPageContent
        loading={loading}
        error={error}
        presenceStatus={presence?.status ?? 'offline'}
        friends={friends}
        partyId={party?.partyId ?? ''}
        partyMembers={(party?.members ?? []).map(member => typeof member === 'string' ? { userId: member } : member)}
        messages={messages}
        activeConversationId={activeConversationId}
        notifications={notifications}
        feedItems={feedItems}
        onRefresh={() => { void refreshAll(); }}
        onMatchmaking={() => EventBus.instance.publish(new ShowScreenEvent('matchmaking'))}
        onLobby={() => EventBus.instance.publish(new ShowScreenEvent('lobby'))}
        onAddFriend={(friendId) => { void addFriendById(friendId); }}
        onRemoveFriend={(friendId) => { void removeFriendById(friendId); }}
        onCreateParty={() => { void createPartyForUser(); }}
        onLoadParty={(partyId) => { void loadPartyById(partyId); }}
        onJoinParty={(partyId) => { void joinPartyById(partyId); }}
        onLeaveParty={() => { void leaveCurrentParty(); }}
        onInvite={(inviteeId) => { void inviteToCurrentParty(inviteeId); }}
        onLoadMessages={(conversationId) => { void loadMessagesForConversation(conversationId); }}
        onSendMessage={(conversationId, content) => { void sendMessageToConversation(conversationId, content); }}
        onMarkRead={(conversationId, messageIds) => { void markConversationRead(conversationId, messageIds); }}
        onMarkAllNotificationsRead={() => { void markAllNotificationsRead(); }}
        onAppendActivity={(type, payload) => { void appendActivityFeed(type, payload); }}
      />
    </UnifiedPageShell>
  );
}

