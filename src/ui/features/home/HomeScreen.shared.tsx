import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/adapters/firebase/service';
import {
  DEFAULT_FEATURED_SHOWCASE_CONTROLS,
  type FeaturedShowcaseControls,
} from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameShowcase.types';
import type { ExploreGameSummary } from '@ocentra/core-ui/Common/types/ExploreGameSummary';
import { HomePageShowcaseContent } from '@ocentra/core-ui/Common/HomePage/HomePageShowcaseContent';
import {
  DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS,
  type HomeShowcaseFrameControls,
  type HomeShowcasePreviewLayoutMode,
} from '@ocentra/core-ui/Common/HomeShowcaseFrame/HomeShowcaseFrame.types';
import { mlogoImageUrl } from '@ocentra/app-assets/commons';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { createOcentraHeaderLogoConfig } from '@ocentra/core-ui/Header/createOcentraHeaderConfig';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { APP_VERSION } from '@/constants/version';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';
import type { GameCatalogEntry } from '@ocentra/game-asset-domain/schemas/game-catalog-entry-schema';
import type { HomePageGamesDocument } from '@ocentra/game-asset-domain/schemas/home-page-games-schema';
import { useResolveImageUrl } from '@/hooks/useResolveImageUrl';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { useHeaderRightAuthConfig } from '@/ui/header/useHeaderRightAuthConfig';
import { buildCardGamesCatalogPath } from '@/ui/navigation/appRoutes';
import '@/ui/pages/Home/HomePage.css';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  const st = getStackTrace();
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, st, undefined, dataOrEnabled);
  } else {
    log.logInfo(message, st, dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const DEBUG_LAYOUT = false;
const DEBUG_PAGE_STRUCTURE = false;

const LOG_NAVIGATION = import.meta.env.DEV;
const LOG_CACHE = import.meta.env.DEV;

const GAMES_CACHE_KEY = 'homePageGames';

function getMergedFeaturedControls(controls?: FeaturedShowcaseControls): FeaturedShowcaseControls {
  if (!controls) return DEFAULT_FEATURED_SHOWCASE_CONTROLS;
  return {
    overall: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.overall, ...controls.overall },
    arrows: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.arrows, ...controls.arrows },
    header: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.header, ...controls.header },
    body: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.body, ...controls.body },
    sideA: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideA, ...controls.sideA },
    sideB: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.sideB, ...controls.sideB },
    footer: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.footer, ...controls.footer },
    colors: { ...DEFAULT_FEATURED_SHOWCASE_CONTROLS.colors, ...controls.colors },
    variants: controls.variants,
  };
}

function getMergedHomeFrameControls(controls?: HomeShowcaseFrameControls): HomeShowcaseFrameControls {
  if (!controls) return DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS;
  return {
    overall: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.overall, ...controls.overall },
    body: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.body, ...controls.body },
    sideA: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideA, ...controls.sideA },
    sideB: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.sideB, ...controls.sideB },
    copy: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.copy, ...controls.copy },
    footer: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.footer, ...controls.footer },
    colors: { ...DEFAULT_HOME_SHOWCASE_FRAME_CONTROLS.colors, ...controls.colors },
    items: controls.items,
    variants: controls.variants,
  };
}

function toFeaturedShowcaseControls(
  controls?: HomePageGamesDocument['featuredShowcaseControls'],
): FeaturedShowcaseControls | undefined {
  return controls ? getMergedFeaturedControls(controls as FeaturedShowcaseControls) : undefined;
}

function toHomeFrameControls(
  controls?: HomePageGamesDocument['aboutShowcaseControls'],
): HomeShowcaseFrameControls | undefined {
  return controls ? getMergedHomeFrameControls(controls as HomeShowcaseFrameControls) : undefined;
}

function isFeaturedNarrowAtWidth(width: number, controls?: FeaturedShowcaseControls): boolean {
  const c = getMergedFeaturedControls(controls);
  const measuredContentWidth = width - c.overall.canvasInsetX * 2;
  const vw = c.overall.viewWidth;
  const stageW = vw - (c.overall.edgeInset + c.arrows.width + c.arrows.gap) * 2;
  const bodyW = stageW - c.body.insetX * 2;
  const renderScale = Math.min(1, Math.max(1, measuredContentWidth) / vw);
  return (
    (c.overall.narrowBreakpoint > 0 && measuredContentWidth <= c.overall.narrowBreakpoint) ||
    bodyW * c.body.splitRatio * renderScale < c.body.minAWidth ||
    bodyW * (1 - c.body.splitRatio) * renderScale < c.body.minBWidth
  );
}

function isHomeFrameNarrowAtWidth(width: number, controls?: HomeShowcaseFrameControls): boolean {
  const c = getMergedHomeFrameControls(controls);
  const measuredContentWidth = width - c.overall.canvasInsetX * 2;
  const vw = c.overall.viewWidth;
  const stageW = vw - c.overall.stageInsetX * 2;
  const bodyW = stageW - c.body.insetX * 2;
  const renderScale = Math.min(1, Math.max(1, measuredContentWidth) / vw);
  return (
    (c.overall.narrowBreakpoint > 0 && measuredContentWidth <= c.overall.narrowBreakpoint) ||
    bodyW * c.body.splitRatio * renderScale < c.body.minAWidth ||
    bodyW * (1 - c.body.splitRatio) * renderScale < c.body.minBWidth
  );
}

interface HomePageGamesData extends Omit<
  HomePageGamesDocument,
  'featuredShowcaseControls' | 'aboutShowcaseControls' | 'comingSoonShowcaseControls'
> {
  featuredShowcaseControls?: FeaturedShowcaseControls;
  aboutShowcaseControls?: HomeShowcaseFrameControls;
  comingSoonShowcaseControls?: FeaturedShowcaseControls;
  explorerGames: ExploreGameSummary[];
}

const gamesCache = new Map<string, HomePageGamesData>();

interface HomeScreenSharedProps {
  user: UserProfile | null;
  onLogout: () => void;
  onLogoutClick?: () => void;
}

function toExploreGameSummary(g: GameCatalogEntry): ExploreGameSummary {
  return {
    slug: g.gameId,
    name: g.displayName,
    category: g.category ?? undefined,
    subcategory: g.subcategory ?? undefined,
    player_mode: g.playerMode ?? undefined,
    difficulty: g.difficulty ?? 'Unknown',
    players: g.playersDisplay ?? 'TBD',
    quality: g.quality ?? 'draft',
  };
}

export function HomeScreenShared({ user, onLogout, onLogoutClick }: HomeScreenSharedProps) {
  const navigate = useNavigate();
  const homepageContentRef = useRef<HTMLDivElement | null>(null);
  const [gamesData, setGamesData] = useState<HomePageGamesData>({
    featured: [],
    recommended: [],
    comingSoon: [],
    catalogMontageImages: [],
    availableNow: [],
    featureBannerItems: [],
    homepageLayoutControls: undefined,
    explorerGames: [],
  });
  const [isLoadingGames, setIsLoadingGames] = useState(true);
  const [homepageContentWidth, setHomepageContentWidth] = useState<number | null>(null);

  const { resolveImageUrl, ImageLoaders } = useResolveImageUrl(gamesData);
  const explorerGamesForCarousel = useMemo(() => gamesData.explorerGames, [gamesData.explorerGames]);
  const sharedHomepagePreviewLayoutMode = useMemo<HomeShowcasePreviewLayoutMode>(() => {
    if (homepageContentWidth === null) return 'auto';
    return isHomeFrameNarrowAtWidth(homepageContentWidth, gamesData.aboutShowcaseControls) ||
      isFeaturedNarrowAtWidth(homepageContentWidth, gamesData.featuredShowcaseControls) ||
      isFeaturedNarrowAtWidth(homepageContentWidth, gamesData.comingSoonShowcaseControls)
      ? 'narrow'
      : 'wide';
  }, [
    gamesData.aboutShowcaseControls,
    gamesData.comingSoonShowcaseControls,
    gamesData.featuredShowcaseControls,
    homepageContentWidth,
  ]);

  useEffect(() => {
    logInfo('HomePage mounted', { timestamp: Date.now() }, LOG_NAVIGATION);
    document.documentElement.classList.add('home-page-active');
    document.body.classList.add('home-page-active');

    return () => {
      document.documentElement.classList.remove('home-page-active');
      document.body.classList.remove('home-page-active');
    };
  }, []);

  useEffect(() => {
    const node = homepageContentRef.current;
    if (!node) return;
    const updateWidth = () => setHomepageContentWidth(node.getBoundingClientRect().width || null);
    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadGames = async () => {
      try {
        if (gamesCache.has(GAMES_CACHE_KEY)) {
          const cachedData = gamesCache.get(GAMES_CACHE_KEY)!;
          logInfo('Using cached games', {
            featured: cachedData.featured.length,
            comingSoon: cachedData.comingSoon.length,
            availableNow: cachedData.availableNow.length,
            featureBannerItems: cachedData.featureBannerItems?.length ?? 0,
          }, LOG_CACHE);
          setGamesData(cachedData);
          setIsLoadingGames(false);
          return;
        }

        setIsLoadingGames(true);
        logInfo('Cache miss, fetching games...', undefined, LOG_CACHE);

        const { getHomePageGamesInfos, getGameCatalogEntries } = await import('@/adapters/assets/GameCatalogService');
        const homePageGames = await getHomePageGamesInfos();
        const catalogEntries = await getGameCatalogEntries();
        const explorerGames = catalogEntries
          .filter((entry) => entry.enabled !== false && entry.releaseStatus !== 'Deprecated')
          .sort(() => 0.5 - Math.random())
          .slice(0, 15)
          .map(toExploreGameSummary);

        const loadedData: HomePageGamesData = {
          featured: homePageGames.featured,
          recommended: homePageGames.recommended ?? [],
          comingSoon: homePageGames.comingSoon,
          catalogMontageImages: homePageGames.catalogMontageImages ?? [],
          availableNow: homePageGames.availableNow,
          featureBannerItems: homePageGames.featureBannerItems ?? [],
          featuredShowcaseControls: toFeaturedShowcaseControls(homePageGames.featuredShowcaseControls),
          aboutShowcaseControls: toHomeFrameControls(homePageGames.aboutShowcaseControls),
          comingSoonShowcaseControls: toFeaturedShowcaseControls(homePageGames.comingSoonShowcaseControls),
          homepageLayoutControls: homePageGames.homepageLayoutControls,
          explorerGames,
        };

        gamesCache.set(GAMES_CACHE_KEY, loadedData);
        logInfo('Games cached', {
          featured: loadedData.featured.length,
          comingSoon: loadedData.comingSoon.length,
          availableNow: loadedData.availableNow.length,
          featureBannerItems: loadedData.featureBannerItems?.length ?? 0,
          explorer: loadedData.explorerGames.length,
        }, LOG_CACHE);

        setGamesData(loadedData);
      } catch (error) {
        logError('Failed to load games:', error);
      } finally {
        setIsLoadingGames(false);
      }
    };

    void loadGames();
  }, []);

  const handleLogout = useMemo(() => () => {
    if (onLogoutClick) {
      onLogoutClick();
    }
    onLogout();
  }, [onLogout, onLogoutClick]);
  const headerRightConfig = useHeaderRightAuthConfig({ user, onLogout: handleLogout });

  const handleLearnMore = (gameIdentifier: string) => {
    logInfo('Publishing ShowScreenEvent', { gameIdentifier }, LOG_NAVIGATION);
    EventBus.instance.publish(new ShowScreenEvent(gameIdentifier));
  };

  const handlePlayGame = (gameIdentifier: string) => {
    logInfo('Publishing ShowScreenEvent', { gameIdentifier }, LOG_NAVIGATION);
    EventBus.instance.publish(new ShowScreenEvent(gameIdentifier));
  };

  const homeHeaderConfig = useMemo(() => ({
    ...createOcentraHeaderLogoConfig(mlogoImageUrl),
    right: {
      ...headerRightConfig,
    },
  }), [headerRightConfig]);

  return (
    <UnifiedPageShell
      className={`home-page ${DEBUG_PAGE_STRUCTURE ? 'debug-page-structure' : ''}`}
      workClassName="home-shell-work"
      workScrollMode="auto"
      header={
        <UnifiedHeader
          config={homeHeaderConfig}
          profileName="main_screen"
          includeAdminNavigation={Boolean(user?.isAdmin)}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <main className="home-work-math">
        <HomePageShowcaseContent
          contentRef={homepageContentRef}
          imageLoaders={ImageLoaders}
          scrollClassName={DEBUG_PAGE_STRUCTURE ? 'debug-scroll-container' : undefined}
          contentClassName={DEBUG_PAGE_STRUCTURE ? 'debug-home-content' : undefined}
          debugPageStructure={DEBUG_PAGE_STRUCTURE}
          debugLayout={DEBUG_LAYOUT}
          featureBannerItems={gamesData.featureBannerItems}
          featured={gamesData.featured}
          recommended={gamesData.recommended}
          comingSoon={gamesData.comingSoon}
          catalogMontageItems={gamesData.catalogMontageImages}
          availableNow={gamesData.availableNow}
          explorerGames={explorerGamesForCarousel}
          isFeaturedLoading={isLoadingGames}
          isComingSoonLoading={isLoadingGames}
          resolveImageUrl={resolveImageUrl}
          aboutControls={gamesData.aboutShowcaseControls}
          featuredControls={gamesData.featuredShowcaseControls}
          comingSoonControls={gamesData.comingSoonShowcaseControls}
          previewLayoutMode={sharedHomepagePreviewLayoutMode}
          onLearnMore={handleLearnMore}
          onGameClick={handlePlayGame}
          onExploreClick={() => navigate(buildCardGamesCatalogPath())}
        />
      </main>
    </UnifiedPageShell>
  );
}

