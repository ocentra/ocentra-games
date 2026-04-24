import { useState, useEffect } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import type { GamePage } from '@ocentra/game-asset-domain/schemas/game-page-schema';
import type { PageSection } from '@/ui/components/GameInfo/types';
import { GameHeader } from '@ocentra/core-ui/Header/GameHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
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

export function SelectedGamePage({ gameId, user, onLogout, onLogoutClick }: SelectedGamePageProps) {
  const headerProps = useCoreUIHeaderProps();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [gameInfo, setGameInfo] = useState<GamePage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [parsedGameName, setParsedGameName] = useState<string>('');

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

      try {
        const loadedInfo =
          await getSelectedGamePageInfos(parsed.name) ??
          await getSelectedGamePageInfos(parsed.guid);

        if (loadedInfo) {
          setGameInfo(loadedInfo);
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
  const handleLogout = () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  };

  const handlePlaySinglePlayer = (config: { aiCount: number; aiModel: string }) => {
    void config;
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

  const displayName = formatGameName(parsedGameName || gameId);
  const localPilotStatus = getLocalPilotStatus(parsedGameName || gameId);

  const handlePlayLocalPilot = () => {
    EventBus.instance.publish(new ShowScreenEvent(buildGamePlayPath(parsedGameName)));
  };

  const handleOpenTemplate = () => {
    EventBus.instance.publish(new ShowScreenEvent(buildCardGameTemplatePath()));
  };

  return (
    <div className="generic-game-page">
      <GameHeader
        {...headerProps}
        user={user}
        onLogout={handleLogout}
        showProfile
        variant="game"
        gameName={displayName}
        onHomeClick={handleBackToHome}
        tagline="Simple Rules. Deadly Game."
      />

      <div className="generic-game-main">
        {localPilotStatus.isReady && (
          <section className="local-pilot-card">
            <div>
              <p className="local-pilot-card__eyebrow">Playable Pilot</p>
              <h2>Start a local mechanics session</h2>
              <p>
                Launch the minimum viable playable table for {displayName}. This runs locally with visible hands so you can validate the engine flow end to end.
              </p>
            </div>
            <div className="local-pilot-card__actions">
              <button type="button" className="local-pilot-card__button" onClick={handlePlayLocalPilot}>
                Play Local Pilot
              </button>
              <button type="button" className="local-pilot-card__button local-pilot-card__button--secondary" onClick={handleOpenTemplate}>
                Open Card Game Template
              </button>
            </div>
          </section>
        )}
        {localPilotStatus.isKnown && !localPilotStatus.isReady && (
          <section className="local-pilot-card local-pilot-card--disabled">
            <div>
              <p className="local-pilot-card__eyebrow">Local Pilot</p>
              <h2>Playable pilot not ready</h2>
              <p>{localPilotStatus.message}</p>
            </div>
          </section>
        )}

        <GameModeSelector
          onPlaySinglePlayer={handlePlaySinglePlayer}
          onPlayMultiplayer={handlePlayMultiplayer}
        />

        <GameCardDeckPreview gameIdentifier={parsedGameName || gameId} />

        <GameInfoTabs sections={(gameInfo?.sections ?? []) as unknown as PageSection[]} />
      </div>

      <GameFooter appVersion={APP_VERSION} />
    </div>
  );
}
