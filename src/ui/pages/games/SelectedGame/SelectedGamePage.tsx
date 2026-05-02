import { useState, useEffect } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import type { GamePage } from '@ocentra/game-asset-domain/schemas/game-page-schema';
import type { PageSection } from '@/ui/components/GameInfo/types';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { APP_VERSION } from '@/constants/version';
import { GameModeSelector } from '@/ui/components/Common/GamePlayersSelector/GameModeSelector';
import { GameInfoTabs } from '@/ui/components/GameInfo/GameInfoTabs';
import { GameCardDeckPreview } from '@/ui/components/GameInfo/GameCardDeckPreview';
import { GameNotFound } from '@/ui/pages/games/NotFound/GameNotFound';
import { isAssetGUID, type AssetGUIDType } from '@ocentra/asset-domain/types/assetIdentifier';
import { MultiplayerStorageKey } from '@/ui/pages/Matchmaking/types';
import { AppScreenToken, buildCardGameTemplatePath, buildGameMatchmakingPath, buildGamePlayPath } from '@/ui/navigation/appRoutes';
import { getSelectedGamePageInfos } from '@/adapters/assets/GameCatalogService';
import { getLocalPilotStatus } from '@/ui/pages/games/CardGamePlay/localPilotCatalog';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import {
  loadGameDetailAssetContent,
  type GameDetailAssetSummary,
} from '@/ui/pages/games/SelectedGame/gameDetailAssetSections';
import './SelectedGamePage.css';

interface SelectedGamePageProps {
  gameId: string;
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

interface ParsedGameId {
  name: string;
  guid: AssetGUIDType;
}

const GAME_DETAIL_PAGE_LOAD_TIMEOUT_MS = 10000;

function parseGameIdentifier(identifier: string): ParsedGameId | null {
  const parts = identifier.split(':');

  if (parts.length !== 2) {
    return null;
  }

  const [name, guidStr] = parts;

  if (!name || !guidStr) {
    return null;
  }

  if (!isAssetGUID(guidStr)) {
    return null;
  }

  return { name, guid: guidStr };
}

async function withPageLoadTimeout<T>(promise: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = globalThis.setTimeout(() => resolve(null), GAME_DETAIL_PAGE_LOAD_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== null) {
      globalThis.clearTimeout(timer);
    }
  }
}

export function SelectedGamePage({ gameId, user, onLogout, onLogoutClick }: SelectedGamePageProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [gameInfo, setGameInfo] = useState<GamePage | null>(null);
  const [assetSections, setAssetSections] = useState<PageSection[]>([]);
  const [assetSummary, setAssetSummary] = useState<GameDetailAssetSummary | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [parsedGameName, setParsedGameName] = useState<string>('');
  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });

  useEffect(() => {
    async function validateGame() {
      setIsValidating(true);

      const parsed = parseGameIdentifier(gameId);
      if (!parsed) {
        setIsValid(false);
        setErrorMessage('');
        setIsValidating(false);
        return;
      }

      setParsedGameName(parsed.name);
      setAssetSections([]);
      setAssetSummary(null);

      try {
        const loadedInfo =
          await withPageLoadTimeout(getSelectedGamePageInfos(parsed.name)) ??
          await withPageLoadTimeout(getSelectedGamePageInfos(parsed.guid));
        const fallbackSections = (loadedInfo?.sections ?? []) as unknown as PageSection[];
        const enriched = await withPageLoadTimeout(loadGameDetailAssetContent(parsed.guid, fallbackSections).catch(() => null));

        if (loadedInfo || enriched?.sections.length) {
          setGameInfo(loadedInfo ?? null);
          setAssetSections(enriched?.sections ?? fallbackSections);
          setAssetSummary(enriched?.summary ?? null);
          setIsValid(true);
        } else {
          setIsValid(false);
          setErrorMessage(`Game "${parsed.name}" not found.`);
        }
      } catch {
        setIsValid(false);
        setErrorMessage('Error loading game information.');
      } finally {
        setIsValidating(false);
      }
    }

    validateGame();
  }, [gameId]);

  if (isValidating) {
    return (
      <div className="generic-game-page">
        <div className="generic-game-main">
          <div className="generic-game-loading">
            Loading game...
          </div>
        </div>
      </div>
    );
  }

  if (!isValid) {
    return <GameNotFound user={user} onLogout={onLogout} onLogoutClick={onLogoutClick} message={errorMessage} />;
  }

  const localPilotStatus = getLocalPilotStatus(parsedGameName || gameId);

  const handlePlayLocalGame = () => {
    EventBus.instance.publish(new ShowScreenEvent(buildGamePlayPath(parsedGameName)));
  };

  const handlePlaySinglePlayer = (config: { aiCount: number; aiModel: string }) => {
    void config;
    if (localPilotStatus.isReady) {
      handlePlayLocalGame();
    }
  };

  const handlePlayMultiplayer = (config: { humans: number; ai: number; aiModel: string }) => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        MultiplayerStorageKey.Config,
        JSON.stringify({
          humans: config.humans,
          ai: config.ai,
          aiModel: config.aiModel,
          gameId,
          gameName: parsedGameName || gameId,
        })
      );
    }
    EventBus.instance.publish(new ShowScreenEvent(buildGameMatchmakingPath(gameId)));
  };

  const handleBackToHome = () => {
    EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home));
  };

  const formatGameName = (name: string): string => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const formatAvailabilityMessage = (message: string): string =>
    message.replace(/\blocal pilot\b/gi, 'local match').replace(/\bpilot\b/gi, 'match');

  const displayName = assetSummary?.title || formatGameName(parsedGameName || gameId);
  const detailSubtitle = assetSummary?.subtitle || gameInfo?.tagline || "Simple Rules. Deadly Game.";
  const detailDescription = assetSummary?.description || gameInfo?.description || '';
  const detailSections = assetSections.length > 0
    ? assetSections
    : (gameInfo?.sections ?? []) as unknown as PageSection[];

  const handleOpenTemplate = () => {
    EventBus.instance.publish(new ShowScreenEvent(buildCardGameTemplatePath()));
  };

  return (
    <UnifiedPageShell
      className="generic-game-page"
      header={
        <UnifiedHeader
          showPrimaryNavigation={false}
          dynamicData={{
            gameName: displayName,
            tagline: detailSubtitle
          }}
          config={{
            right: headerRightConfig,
            left: {
              onClick: handleBackToHome
            }
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <div className="generic-game-main">
        {localPilotStatus.isReady && (
          <section className="game-detail-hero">
            <div>
              <p className="game-detail-hero__eyebrow">Available now</p>
              <h2>{displayName}</h2>
              <p>
                {detailDescription || `Launch a ${displayName} table with one human seat and three deterministic opponents.`}
              </p>
              <div className="game-detail-hero__meta">
                {(assetSummary?.metrics ?? []).map((item) => (
                  <span key={item.label}>{item.label}: {item.value}</span>
                ))}
              </div>
            </div>
            <div className="game-detail-hero__actions">
              <button type="button" className="game-detail-hero__button" onClick={handlePlayLocalGame}>
                Play {displayName}
              </button>
              <button type="button" className="game-detail-hero__button game-detail-hero__button--secondary" onClick={handleOpenTemplate}>
                View Table Preview
              </button>
            </div>
          </section>
        )}
        {localPilotStatus.isKnown && !localPilotStatus.isReady && (
          <section className="game-detail-hero game-detail-hero--disabled">
            <div>
              <p className="game-detail-hero__eyebrow">In development</p>
              <h2>{displayName}</h2>
              <p>{formatAvailabilityMessage(localPilotStatus.message)}</p>
            </div>
          </section>
        )}

        <GameModeSelector
          onPlaySinglePlayer={handlePlaySinglePlayer}
          onPlayMultiplayer={handlePlayMultiplayer}
        />

        <GameInfoTabs
          sections={detailSections}
          sectionExtras={{
            'Deck & Ranking': <GameCardDeckPreview gameIdentifier={parsedGameName || gameId} />,
          }}
        />
      </div>
    </UnifiedPageShell>
  );
}

