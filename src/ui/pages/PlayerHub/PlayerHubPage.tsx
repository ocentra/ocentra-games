import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@/ui/components/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { APP_VERSION } from '@/constants/version';
import { InventoryPanel } from '@/ui/pages/PlayerHub/components/InventoryPanel';
import { MarketplacePanel } from '@/ui/pages/PlayerHub/components/MarketplacePanel';
import { ProfilePanel } from '@/ui/pages/PlayerHub/components/ProfilePanel';
import { usePlayerHubData } from '@/ui/pages/PlayerHub/hooks/usePlayerHubData';
import { AppScreenToken } from '@/ui/navigation/appRoutes';
import { getHeaderAvatarUrl } from '@/ui/header/getHeaderAvatarUrl';
import './PlayerHubPage.css';

interface PlayerHubPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

export function PlayerHubPage({ user, onLogout, onLogoutClick }: PlayerHubPageProps) {
  const {
    loading,
    error,
    targetUserId,
    profile,
    inventoryItems,
    marketplaceListings,
    refreshAll,
    loadUserData,
  } = usePlayerHubData(user);

  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };

  return (
    <UnifiedPageShell
      className="ph-page"
      background={<DynamicBackground />}
      header={
        <UnifiedHeader
          dynamicData={{
            gameName: "Player Hub",
            tagline: "Profile, inventory, and marketplace in one control center."
          }}
          config={{
            right: {
              isProfile: Boolean(user),
              user: user ? {
                name: user.displayName || 'Player',
                email: user.email,
                avatarUrl: getHeaderAvatarUrl(user.photoURL),
                isLoggedIn: true,
                isGuest: user.isGuest,
              } : undefined,
              onLogout: handleLogout
            },
            left: {
              onClick: () => EventBus.instance.publish(new ShowScreenEvent('home'))
            }
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <main className="ph-content">
        <section className="ph-shell">
          <div className="ph-toolbar">
            <h1 className="ph-title">Player Hub</h1>
            <div className="ph-toolbar-actions">
              <button
                type="button"
                className="ph-btn ph-btn-secondary"
                onClick={() => {
                  void refreshAll();
                }}
              >
                Refresh
              </button>
              <button
                type="button"
                className="ph-btn ph-btn-secondary"
                onClick={() => EventBus.instance.publish(new ShowScreenEvent('shop'))}
              >
                Shop
              </button>
              <button
                type="button"
                className="ph-btn ph-btn-secondary"
                onClick={() => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Settings))}
              >
                Settings
              </button>
            </div>
          </div>

          {error && <div className="ph-error">{error}</div>}
          {loading ? (
            <div className="ph-loading">Loading player hub data...</div>
          ) : (
            <div className="ph-grid">
              <ProfilePanel
                targetUserId={targetUserId}
                profile={profile}
                onLoadUser={loadUserData}
              />
              <InventoryPanel items={inventoryItems} />
              <MarketplacePanel listings={marketplaceListings} />
            </div>
          )}
        </section>
      </main>
    </UnifiedPageShell>
  );
}

