import { useCallback, useMemo, useState, useEffect } from 'react';
import type { UserProfile } from '@/adapters/firebase/service';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import type { GamePage } from '@ocentra/game-asset-domain/schemas/game-page-schema';
import type {
  SelectedGameLayoutControls,
  SelectedGamePresentation,
  SelectedGamePresentationVisualRef,
} from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';
import { buildSelectedGamePresentation } from '@ocentra/game-asset-domain/ui/selectedGame/buildSelectedGamePresentation';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { SelectedGameShowcase } from '@ocentra/core-ui/Common/SelectedGameShowcase/SelectedGameShowcase';
import { APP_VERSION } from '@/constants/version';
import { GameNotFound } from '@/ui/pages/games/NotFound/GameNotFound';
import { isAssetGUID, isImageHash, type AssetGUIDType, type ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { MultiplayerStorageKey } from '@/ui/pages/Matchmaking/types';
import { AppScreenToken, buildGameLobbyPath } from '@/ui/navigation/appRoutes';
import { getSelectedGamePageInfos } from '@/adapters/assets/GameCatalogService';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import {
  loadSelectedGameAssetBundle,
} from '@/ui/pages/games/SelectedGame/gameDetailAssetSections';
import { useResolveImageUrl } from '@/hooks/useResolveImageUrl';
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

type LooseRecord = Record<string, unknown>;
type ImageResolverInput = Parameters<typeof useResolveImageUrl>[0];

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

function asRecord(value: unknown): LooseRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as LooseRecord : {};
}

function dataOf(value: unknown): LooseRecord {
  const record = asRecord(value);
  const data = asRecord(record.data);
  return Object.keys(data).length > 0 ? data : record;
}

function selectedGameImageResolverInput(presentation: SelectedGamePresentation | null): ImageResolverInput {
  const hashes = [
    ...(presentation?.hero.media ?? []),
    ...(presentation?.sideA.media ?? []),
  ]
    .map(ref => ref.imageHash)
    .filter((hash): hash is ImageHash => typeof hash === 'string' && isImageHash(hash));
  return hashes.length > 0
    ? { featureBannerItems: hashes.map((imageHash, index) => ({ title: `Selected game image ${index + 1}`, description: '', imageHash })) }
    : {};
}

export function SelectedGamePage({ gameId, user, onLogout, onLogoutClick }: SelectedGamePageProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [gameInfo, setGameInfo] = useState<GamePage | null>(null);
  const [presentation, setPresentation] = useState<SelectedGamePresentation | null>(null);
  const [layoutControls, setLayoutControls] = useState<SelectedGameLayoutControls | undefined>(undefined);
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
      setPresentation(null);
      setLayoutControls(undefined);

      try {
        const loadedInfo =
          await withPageLoadTimeout(getSelectedGamePageInfos(parsed.name)) ??
          await withPageLoadTimeout(getSelectedGamePageInfos(parsed.guid));
        const bundle = await withPageLoadTimeout(loadSelectedGameAssetBundle(parsed.guid).catch(() => null));

        if (loadedInfo || bundle?.gameMode) {
          const nextPresentation = bundle ? buildSelectedGamePresentation(bundle) : null;
          setGameInfo(loadedInfo ?? null);
          setPresentation(nextPresentation);
          setLayoutControls(asRecord(dataOf(bundle?.layout).layoutControls) as SelectedGameLayoutControls);
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

  const imageResolverInput = useMemo(() => selectedGameImageResolverInput(presentation), [presentation]);
  const { resolveImageUrl, ImageLoaders } = useResolveImageUrl(imageResolverInput);
  const resolveSelectedGameVisualRefUrl = useCallback((ref: SelectedGamePresentationVisualRef) =>
    ref.imageHash && isImageHash(ref.imageHash) ? resolveImageUrl(ref.imageHash as ImageHash) : null,
  [resolveImageUrl]);

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

  const handleOpenLobbies = () => {
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        MultiplayerStorageKey.Config,
        JSON.stringify({
          humans: 1,
          ai: 3,
          aiModel: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
          gameId,
          gameName: parsedGameName || gameId,
        })
      );
    }
    EventBus.instance.publish(new ShowScreenEvent(buildGameLobbyPath(gameId)));
  };

  const handleBackToHome = () => {
    EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home));
  };

  const formatGameName = (name: string): string => {
    if (!name) return '';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const displayName = presentation?.hero.title || formatGameName(parsedGameName || gameId);
  const detailSubtitle = presentation?.hero.taglineLines[0] || gameInfo?.tagline || "Simple Rules. Deadly Game.";

  return (
    <UnifiedPageShell
      className="generic-game-page"
      viewportLocked
      workClassName="selected-game-shell-work"
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
      <div className="generic-game-main generic-game-main--showcase">
        {ImageLoaders}
        <SelectedGameShowcase
          layoutControls={layoutControls}
          onViewLobbies={handleOpenLobbies}
          presentation={presentation ?? undefined}
          resolveVisualRefUrl={resolveSelectedGameVisualRefUrl}
        />
      </div>
    </UnifiedPageShell>
  );
}

