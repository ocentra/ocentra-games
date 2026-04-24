import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@/ui/components/Background/DynamicBackground';
import { GameHeader } from '@ocentra/core-ui/Header/GameHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { APP_VERSION } from '@/constants/version';
import { FeedPanel } from '@/ui/pages/Social/components/FeedPanel';
import { FriendsPanel } from '@/ui/pages/Social/components/FriendsPanel';
import { MessagesPanel } from '@/ui/pages/Social/components/MessagesPanel';
import { NotificationsPanel } from '@/ui/pages/Social/components/NotificationsPanel';
import { PartyPanel } from '@/ui/pages/Social/components/PartyPanel';
import { useSocialHubData } from '@/ui/pages/Social/hooks/useSocialHubData';
import './SocialPage.css';

interface SocialPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function SocialPage({ user, onLogout, onLogoutClick }: SocialPageProps) {
  const headerProps = useCoreUIHeaderProps();
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

  return (
    <div className="social-page">
      <DynamicBackground />
      <GameHeader
        {...headerProps}
        user={user}
        onLogout={handleLogout}
        showProfile
        variant="game"
        gameName="Social Hub"
        tagline="Friends, parties, messages, notifications, and activity."
        onHomeClick={() => EventBus.instance.publish(new ShowScreenEvent('home'))}
      />

      <main className="social-content">
        <section className="social-shell">
          <div className="social-toolbar">
            <h1 className="social-title">Community</h1>
            <div className="social-toolbar-actions">
              <button
                type="button"
                className="social-btn social-btn-secondary"
                onClick={() => {
                  void refreshAll();
                }}
              >
                Refresh
              </button>
              <button
                type="button"
                className="social-btn social-btn-secondary"
                onClick={() => EventBus.instance.publish(new ShowScreenEvent('matchmaking'))}
              >
                Matchmaking
              </button>
              <button
                type="button"
                className="social-btn social-btn-secondary"
                onClick={() => EventBus.instance.publish(new ShowScreenEvent('lobby'))}
              >
                Lobby
              </button>
            </div>
          </div>

          {error && <div className="social-error">{error}</div>}
          {loading ? (
            <div className="social-loading">Loading social data...</div>
          ) : (
            <div className="social-grid">
              <FriendsPanel
                friends={friends}
                presenceStatus={presence?.status ?? 'offline'}
                onAddFriend={addFriendById}
                onRemoveFriend={removeFriendById}
              />
              <PartyPanel
                partyId={party?.partyId ?? ''}
                members={party?.members ?? []}
                onCreateParty={createPartyForUser}
                onLoadParty={loadPartyById}
                onJoinParty={joinPartyById}
                onLeaveParty={leaveCurrentParty}
                onInvite={inviteToCurrentParty}
              />
              <MessagesPanel
                messages={messages}
                activeConversationId={activeConversationId}
                onLoadMessages={loadMessagesForConversation}
                onSendMessage={sendMessageToConversation}
                onMarkRead={markConversationRead}
              />
              <NotificationsPanel
                notifications={notifications}
                onMarkAllRead={markAllNotificationsRead}
              />
              <FeedPanel
                items={feedItems}
                onAppend={appendActivityFeed}
              />
            </div>
          )}
        </section>
      </main>

      <GameFooter appVersion={APP_VERSION} />
    </div>
  );
}
