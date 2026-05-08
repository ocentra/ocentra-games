import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { PlayerHubPageContent } from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { APP_VERSION } from '@/constants/version';
import { usePlayerHubData } from '@/ui/pages/PlayerHub/hooks/usePlayerHubData';
import { AppScreenToken } from '@/ui/navigation/appRoutes';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';

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
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });

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
            right: headerRightConfig,
            left: {
              onClick: () => EventBus.instance.publish(new ShowScreenEvent('home'))
            }
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <PlayerHubPageContent
        loading={loading}
        error={error}
        targetUserId={targetUserId}
        profile={profile}
        inventoryItems={inventoryItems}
        marketplaceListings={marketplaceListings}
        onRefresh={() => { void refreshAll(); }}
        onShop={() => EventBus.instance.publish(new ShowScreenEvent('shop'))}
        onSettings={() => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Settings))}
        onLoadUser={(nextUserId) => { void loadUserData(nextUserId); }}
      />
    </UnifiedPageShell>
  );
}

