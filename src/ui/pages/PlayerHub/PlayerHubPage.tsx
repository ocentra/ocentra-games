import { useEffect, useState } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import { DynamicBackground } from '@ocentra/core-ui/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import {
  PlayerHubPageContent,
  type PlayerHubPageSvgControls,
  type PlayerHubTabId,
} from '@ocentra/core-ui/AppPages/MainAppPageSurfaces';
import { normalizePlayerHubPageSvgControls } from '@ocentra/core-ui/AppPages/PlayerHub/PlayerHubPageSvgSurfaceControls';
import {
  parsePlayerHubPageContent,
  type PlayerHubPageContentData,
} from '@ocentra/core-ui/AppPages/PlayerHub/PlayerHubPageSvgContent';
import { APP_VERSION } from '@/constants/version';
import { usePlayerHubData } from '@/ui/pages/PlayerHub/hooks/usePlayerHubData';
import { PlayerHubAISettingsPanel } from '@/ui/pages/PlayerHub/PlayerHubAISettingsPanel';
import { AppScreenToken } from '@/ui/navigation/appRoutes';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import { getEntryIndexResourceEntries } from '@/adapters/assets/EntryIndexService';
import { loadRawAssetDocumentByGuid } from '@/adapters/assets/rawAssetDocument';

interface PlayerHubPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
  initialTab?: PlayerHubTabId;
  matchId?: string;
}

type ResourceEntryRef = {
  guid?: string;
  path?: string;
  assetType?: string;
  checksum?: string;
};

type LooseRecord = Record<string, unknown>;

const PLAYER_HUB_PAGE_LAYOUT_ASSET_PATH = 'Resources/Pages/PlayerHubPageLayout.asset';

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function dataOf(document: unknown): LooseRecord {
  const record = asRecord(document);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '').toLowerCase();
}

function findResourceByPath(resources: ResourceEntryRef[], path: string, assetType = ''): ResourceEntryRef | null {
  const normalizedPath = normalizePath(path);
  if (!normalizedPath) return null;
  return resources.find((resource) => (
    resource.guid &&
    normalizePath(resource.path ?? '') === normalizedPath &&
    (!assetType || !resource.assetType || resource.assetType === assetType)
  )) ?? null;
}

async function loadPlayerHubPageLayoutControls(): Promise<{
  controls: PlayerHubPageSvgControls;
  content: PlayerHubPageContentData | null;
} | null> {
  const resources = await getEntryIndexResourceEntries();
  const resource = findResourceByPath(resources, PLAYER_HUB_PAGE_LAYOUT_ASSET_PATH, 'PageLayout');
  if (!resource?.guid) return null;
  const layoutDocument = await loadRawAssetDocumentByGuid(resource.guid, {
    cache: 'no-store',
    checksum: resource.checksum,
  });
  const data = dataOf(layoutDocument);
  return {
    controls: normalizePlayerHubPageSvgControls(data.playerHubControls),
    content: data.playerHubContent ? parsePlayerHubPageContent(data.playerHubContent) : null,
  };
}

export function PlayerHubPage({ user, onLogout, onLogoutClick, initialTab, matchId }: PlayerHubPageProps) {
  const {
    loading,
    error,
    targetUserId,
    profile,
    inventoryItems,
    marketplaceListings,
    creditBalance,
    dailyReward,
    settings,
    playerStats,
    learningProgress,
    performanceReport,
    serviceErrors,
    refreshAll,
    updateProfileFields,
    updateSettingsFields,
    claimDailyRewardNow,
  } = usePlayerHubData(user);
  const [playerHubControls, setPlayerHubControls] = useState<PlayerHubPageSvgControls | null>(null);
  const [playerHubContent, setPlayerHubContent] = useState<PlayerHubPageContentData | null>(null);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPlayerHubPageLayoutControls()
      .then((layout) => {
        if (cancelled) return;
        setPlayerHubControls(layout?.controls ?? null);
        setPlayerHubContent(layout?.content ?? null);
        setLayoutError(null);
      })
      .catch((layoutLoadError) => {
        if (!cancelled) {
          setLayoutError(layoutLoadError instanceof Error ? layoutLoadError.message : 'Failed to load player hub layout');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
            gameName: 'Player Hub',
            tagline: 'Private player command center.',
          }}
          config={{
            right: headerRightConfig,
            left: {
              onClick: () => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home)),
            },
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <PlayerHubPageContent
        loading={loading}
        error={error ?? layoutError}
        targetUserId={targetUserId}
        profile={profile}
        inventoryItems={inventoryItems}
        marketplaceListings={marketplaceListings}
        creditBalance={creditBalance}
        dailyReward={dailyReward}
        settings={settings}
        playerStats={playerStats}
        learningProgress={learningProgress}
        performanceReport={performanceReport}
        serviceErrors={serviceErrors}
        initialTab={initialTab}
        matchId={matchId}
        playerHubControls={playerHubControls}
        playerHubContent={playerHubContent}
        onRefresh={() => { void refreshAll(); }}
        onShop={() => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Shop))}
        onPlay={() => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Lobby))}
        onLobby={() => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Lobby))}
        onCompetition={() => EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Competition))}
        onUpdateProfile={updateProfileFields}
        onUpdateSettings={updateSettingsFields}
        onClaimDailyReward={claimDailyRewardNow}
        renderAiSettingsDetail={() => <PlayerHubAISettingsPanel />}
      />
    </UnifiedPageShell>
  );
}

