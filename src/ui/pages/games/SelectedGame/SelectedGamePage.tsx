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
import { withSelectedGameReleaseStatus } from '@ocentra/game-asset-domain/ui/selectedGame/SelectedGamePresentation';
import { buildSelectedGamePresentation } from '@ocentra/game-asset-domain/ui/selectedGame/buildSelectedGamePresentation';
import { GameModeStatus } from '@ocentra/game-asset-domain/constants/game-mode-status';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { SelectedGameShowcase } from '@ocentra/core-ui/Common/SelectedGameShowcase/SelectedGameShowcase';
import { APP_VERSION } from '@/constants/version';
import { GameNotFound } from '@/ui/pages/games/NotFound/GameNotFound';
import { ScreenLoadingFallback } from '@/ui/components/Loading/ScreenLoadingFallback';
import { isAssetGUID, isImageHash, type AssetGUIDType, type ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { MultiplayerStorageKey } from '@/ui/pages/Matchmaking/types';
import { AppScreenToken, buildCardGamesCatalogPath, buildGameLobbyPath, buildGamePlayPath } from '@/ui/navigation/appRoutes';
import { getGameCatalogEntries, getSelectedGamePageInfos } from '@/adapters/assets/GameCatalogService';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import {
  loadSelectedGameAssetBundle,
  loadSelectedGameLayoutControls,
  type SelectedGameAssetBundle,
} from '@/ui/pages/games/SelectedGame/gameDetailAssetSections';
import { SelectedGameVisualContent } from '@/ui/pages/games/SelectedGame/SelectedGameVisualContent';
import { findAuthoredSlugForCatalogSlug } from '@/seo/generated/catalogSeoReplacements';
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
  guid: AssetGUIDType | null;
}

interface AuthoredGameResolution {
  slug: string;
  guid: AssetGUIDType;
  routeId: string;
}

const GAME_DETAIL_PAGE_LOAD_TIMEOUT_MS = 10000;
const GAME_DETAIL_AUTHORED_BUNDLE_LOAD_TIMEOUT_MS = 30000;

type LooseRecord = Record<string, unknown>;
type ImageResolverInput = Parameters<typeof useResolveImageUrl>[0];

function decodeGameIdentifier(identifier: string): string {
  try {
    return decodeURIComponent(identifier);
  } catch {
    return identifier;
  }
}

function parseGameIdentifier(identifier: string): ParsedGameId | null {
  const parts = decodeGameIdentifier(identifier).split(':');

  if (parts.length === 1) {
    const [name] = parts;
    return name ? { name, guid: null } : null;
  }

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

function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function formatGameName(name: string): string {
  if (!name) return '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

async function resolveAuthoredGame(parsed: ParsedGameId): Promise<AuthoredGameResolution | null> {
  if (parsed.guid) {
    return {
      slug: parsed.name,
      guid: parsed.guid,
      routeId: `${parsed.name}:${parsed.guid}`,
    };
  }

  const replacementSlug = findAuthoredSlugForCatalogSlug(slugify(parsed.name));
  const lookupName = replacementSlug ?? parsed.name;
  const normalizedName = slugify(lookupName);
  const entries = await getGameCatalogEntries();
  const entry = entries.find((candidate) => {
    const candidateGameId = candidate.gameId ? String(candidate.gameId) : '';
    const candidateDisplayName = candidate.displayName ?? '';
    return (
      candidate.guid === lookupName ||
      candidateGameId.toLowerCase() === lookupName.toLowerCase() ||
      slugify(candidateGameId) === normalizedName ||
      slugify(candidateDisplayName) === normalizedName
    );
  });

  if (!entry?.guid || !isAssetGUID(entry.guid)) {
    return null;
  }

  const slug = entry.gameId ? String(entry.gameId) : normalizedName;
  return {
    slug,
    guid: entry.guid,
    routeId: `${slug}:${entry.guid}`,
  };
}

async function withPageLoadTimeout<T>(
  promise: Promise<T>,
  timeoutMs = GAME_DETAIL_PAGE_LOAD_TIMEOUT_MS
): Promise<T | null> {
  let timer: ReturnType<typeof globalThis.setTimeout> | null = null;
  const timeout = new Promise<null>((resolve) => {
    timer = globalThis.setTimeout(() => resolve(null), timeoutMs);
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

function extractSelectedGameLayoutControls(value: unknown): SelectedGameLayoutControls | undefined {
  const controls = asRecord(dataOf(value).layoutControls);
  return Object.keys(controls).length > 0 ? controls as SelectedGameLayoutControls : undefined;
}

export function SelectedGamePage({ gameId, user, onLogout, onLogoutClick }: SelectedGamePageProps) {
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [gameInfo, setGameInfo] = useState<GamePage | null>(null);
  const [presentation, setPresentation] = useState<SelectedGamePresentation | null>(null);
  const [assetBundle, setAssetBundle] = useState<SelectedGameAssetBundle | null>(null);
  const [layoutControls, setLayoutControls] = useState<SelectedGameLayoutControls | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [parsedGameName, setParsedGameName] = useState<string>('');
  const [resolvedGameId, setResolvedGameId] = useState<string>('');
  const [resolvedReleaseStatus, setResolvedReleaseStatus] = useState<string | null>(null);
  const [showPilotSetup, setShowPilotSetup] = useState(false);
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
      setResolvedGameId(parsed.name);
      setGameInfo(null);
      setPresentation(null);
      setAssetBundle(null);
      setLayoutControls(undefined);
      setResolvedReleaseStatus(null);
      setShowPilotSetup(false);

      try {
        const layoutControlsPromise = withPageLoadTimeout(
          loadSelectedGameLayoutControls().catch(() => undefined)
        );
        const authoredGame = await withPageLoadTimeout(resolveAuthoredGame(parsed).catch(() => null));
        if (authoredGame) {
          const loadedInfoPromise = (async () =>
            await withPageLoadTimeout(getSelectedGamePageInfos(authoredGame.slug).catch(() => null)) ??
            await withPageLoadTimeout(getSelectedGamePageInfos(authoredGame.guid).catch(() => null))
          )();
          const bundlePromise = withPageLoadTimeout(
            loadSelectedGameAssetBundle(authoredGame.guid).catch(() => null),
            GAME_DETAIL_AUTHORED_BUNDLE_LOAD_TIMEOUT_MS
          );
          const [loadedInfo, bundle] = await Promise.all([loadedInfoPromise, bundlePromise]);

          if (bundle?.gameMode) {
            const releaseStatus = typeof dataOf(bundle.gameMode).releaseStatus === 'string'
              ? String(dataOf(bundle.gameMode).releaseStatus)
              : GameModeStatus.WorkInProgress;
            const nextPresentation = withSelectedGameReleaseStatus(buildSelectedGamePresentation(bundle), releaseStatus);
            const savedLayoutControls = (await layoutControlsPromise) ?? undefined;
            const bundledLayoutControls = extractSelectedGameLayoutControls(bundle?.layout);
            setGameInfo(loadedInfo ?? null);
            setPresentation(nextPresentation);
            setAssetBundle(bundle);
            setLayoutControls(bundledLayoutControls ?? savedLayoutControls);
            setParsedGameName(authoredGame.slug);
            setResolvedGameId(authoredGame.routeId);
            setResolvedReleaseStatus(releaseStatus);
            setIsValid(true);
            return;
          }

          if (loadedInfo) {
            setGameInfo(loadedInfo);
            setPresentation(null);
            setAssetBundle(null);
            setResolvedReleaseStatus(null);
            setIsValid(false);
            setErrorMessage(`Game "${authoredGame.slug}" asset bundle could not be loaded.`);
            return;
          }
        }

        setResolvedReleaseStatus(null);
        setIsValid(false);
        setErrorMessage(`Game "${parsed.name}" not found as an authored game asset.`);
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
  const selectedGameDisplayName = presentation?.hero.title || formatGameName(parsedGameName || gameId);
  const selectedGameSubtitle = presentation?.hero.taglineLines[0] || gameInfo?.tagline || '';
  const renderSelectedGameVisualContent = useCallback(({ tabId }: { tabId: Parameters<typeof SelectedGameVisualContent>[0]['tabId'] }) => {
    const hasDeckVisual = tabId === 'deck' && Boolean(assetBundle?.deck || assetBundle?.deckModel);
    const hasRankingVisual = tabId === 'ranking' && Boolean(assetBundle?.ranking);
    if (!hasDeckVisual && !hasRankingVisual) {
      return null;
    }
    return (
      <SelectedGameVisualContent
        bundle={assetBundle}
        gameLabel={selectedGameDisplayName}
        layoutControls={layoutControls}
        tabId={tabId}
      />
    );
  }, [assetBundle, layoutControls, selectedGameDisplayName]);

  if (isValidating) {
    return <ScreenLoadingFallback label="Loading game" variant="page" />;
  }

  if (!isValid) {
    return <GameNotFound user={user} onLogout={onLogout} onLogoutClick={onLogoutClick} message={errorMessage} />;
  }

  const handleOpenLobbies = () => {
    if (resolvedReleaseStatus !== GameModeStatus.Available) {
      return;
    }
    const nextGameId = resolvedGameId || gameId;
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(
        MultiplayerStorageKey.Config,
        JSON.stringify({
          humans: 1,
          ai: 3,
          aiModel: 'onnx-community/Phi-3.5-mini-instruct-onnx-web',
          gameId: nextGameId,
          gameName: parsedGameName || gameId,
        })
      );
    }
    EventBus.instance.publish(new ShowScreenEvent(buildGameLobbyPath(nextGameId)));
  };

  const handleExploreCardGames = () => {
    EventBus.instance.publish(new ShowScreenEvent(buildCardGamesCatalogPath()));
  };

  const handleStartPilot = () => {
    if (resolvedReleaseStatus !== GameModeStatus.Available) {
      return;
    }
    EventBus.instance.publish(new ShowScreenEvent(buildGamePlayPath(resolvedGameId || gameId)));
  };

  const handleBackToHome = () => {
    EventBus.instance.publish(new ShowScreenEvent(AppScreenToken.Home));
  };

  return (
    <UnifiedPageShell
      className="generic-game-page"
      viewportLocked
      workClassName="selected-game-shell-work"
      header={
        <UnifiedHeader
          showPrimaryNavigation={false}
          dynamicData={{
            gameName: selectedGameDisplayName,
            tagline: selectedGameSubtitle
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
          onActionClick={(actionId) => {
            if (actionId === 'explore-card-games') {
              handleExploreCardGames();
            }
            if (actionId === 'view-lobbies') {
              handleOpenLobbies();
            }
            if (actionId === 'play-local-pilot') {
              if (resolvedReleaseStatus === GameModeStatus.Available) {
                setShowPilotSetup(true);
              }
            }
          }}
          presentation={presentation ?? undefined}
          renderActiveVisualContent={renderSelectedGameVisualContent}
          resolveVisualRefUrl={resolveSelectedGameVisualRefUrl}
        />
        {showPilotSetup && (
          <div className="selected-game-pilot-modal" role="dialog" aria-modal="true" aria-label="Local pilot setup">
            <div className="selected-game-pilot-modal__panel">
              <div>
                <p className="selected-game-pilot-modal__eyebrow">Local Pilot</p>
                <h2>{selectedGameDisplayName}</h2>
              </div>
              <div className="selected-game-pilot-modal__grid">
                <span>Seats</span>
                <strong>4</strong>
                <span>Table</span>
                <strong>Local</strong>
                <span>Bots</span>
                <strong>Deterministic</strong>
              </div>
              <div className="selected-game-pilot-modal__actions">
                <button type="button" className="selected-game-pilot-modal__button selected-game-pilot-modal__button--secondary" onClick={() => setShowPilotSetup(false)}>
                  Cancel
                </button>
                <button type="button" className="selected-game-pilot-modal__button" onClick={handleStartPilot}>
                  Start Pilot
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </UnifiedPageShell>
  );
}

