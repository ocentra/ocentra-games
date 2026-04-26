import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { UserProfile } from '@/adapters/firebase/service';
import { solanaImageUrl } from '@ocentra/app-assets/commons';
import { FeaturedGameCarousel } from '@ocentra/core-ui/Common/FeaturedGameCarousel/FeaturedGameCarousel';
import { ComingSoonCarousel } from '@ocentra/core-ui/Common/ComingSoonCarousel/ComingSoonCarousel';
import type { ExploreGameSummary } from '@ocentra/core-ui/Common/types/ExploreGameSummary';
import { AboutUsSection } from '@/ui/components/Common/AboutUsSection/AboutUsSection';
import { mlogoImageUrl } from '@ocentra/app-assets/commons';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
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
import { getHeaderAvatarUrl } from '@/ui/header/getHeaderAvatarUrl';
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
const DEBUG_FEATURED = false;
const DEBUG_PAGE_STRUCTURE = false;

const LOG_NAVIGATION = true;
const LOG_CACHE = true;

const GAMES_CACHE_KEY = 'homePageGames';

interface HomePageGamesData extends HomePageGamesDocument {
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
  const [gamesData, setGamesData] = useState<HomePageGamesData>({
    featured: [],
    recommended: [],
    comingSoon: [],
    availableNow: [],
    featureBannerItems: [],
    explorerGames: [],
  });
  const [isLoadingGames, setIsLoadingGames] = useState(true);

  const { resolveImageUrl, ImageLoaders } = useResolveImageUrl(gamesData);
  const explorerGamesForCarousel = useMemo(() => gamesData.explorerGames, [gamesData.explorerGames]);

  useEffect(() => {
    logInfo('HomePage mounted', { timestamp: Date.now() }, true);
    document.documentElement.classList.add('home-page-active');
    document.body.classList.add('home-page-active');

    return () => {
      document.documentElement.classList.remove('home-page-active');
      document.body.classList.remove('home-page-active');
    };
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
          availableNow: homePageGames.availableNow,
          featureBannerItems: homePageGames.featureBannerItems ?? [],
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

  const handleLearnMore = (gameIdentifier: string) => {
    logInfo('Publishing ShowScreenEvent', { gameIdentifier }, LOG_NAVIGATION);
    EventBus.instance.publish(new ShowScreenEvent(gameIdentifier));
  };

  const handlePlayGame = (gameIdentifier: string) => {
    logInfo('Publishing ShowScreenEvent', { gameIdentifier }, LOG_NAVIGATION);
    EventBus.instance.publish(new ShowScreenEvent(gameIdentifier));
  };

  const homeHeaderConfig = useMemo(() => ({
    center: {
      modeA: {
        logo: {
          size: 44,
          renderer: ({
            cx,
            cy,
            size,
            aspectCorrection,
            strokeWidth,
            innerOpacity,
            color,
          }: {
            cx: number;
            cy: number;
            size: number;
            aspectCorrection: number;
            strokeWidth: number;
            innerOpacity: number;
            color: string;
          }) => {
            const logoH = size;
            const logoW = logoH * aspectCorrection;
            const outerRadius = size / 2;
            const innerRadius = Math.max(1, outerRadius - Math.max(0.35, size * 0.018) - strokeWidth * 0.5);
            return (
              <g transform={`translate(${cx} ${cy}) scale(${aspectCorrection} 1) translate(${-cx} ${-cy})`}>
                <circle
                  cx={cx}
                  cy={cy}
                  r={outerRadius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeWidth}
                  opacity={0.95}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={cx}
                  cy={cy}
                  r={innerRadius}
                  fill={color}
                  opacity={innerOpacity}
                />
                <image
                  href={mlogoImageUrl}
                  x={cx - logoW / 2}
                  y={cy - logoH / 2}
                  width={logoW}
                  height={logoH}
                  preserveAspectRatio="xMidYMid meet"
                />
              </g>
            );
          }
        }
      }
    },
    right: {
      isProfile: Boolean(user),
      user: user ? {
        name: user.displayName || 'Player',
        email: user.email,
        avatarUrl: getHeaderAvatarUrl(user.photoURL),
        isLoggedIn: true,
        isAdmin: user.isAdmin,
        eloRating: user.eloRating,
        gamesPlayed: user.gamesPlayed,
        winRate: user.winRate,
      } : undefined,
      onLogout: handleLogout,
    },
  }), [user, handleLogout]);

  return (
    <UnifiedPageShell
      className={`home-page ${DEBUG_PAGE_STRUCTURE ? 'debug-page-structure' : ''}`}
      workClassName="home-shell-work"
      header={
        <UnifiedHeader
          config={homeHeaderConfig}
          profileName="main_screen"
          includeAdminNavigation={Boolean(user?.isAdmin)}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <div className="home-work-math">
        {ImageLoaders}
        <div className={`scrollable-content-container ${DEBUG_PAGE_STRUCTURE ? 'debug-scroll-container' : ''}`}>
          <div className={`home-content ${DEBUG_PAGE_STRUCTURE ? 'debug-home-content' : ''}`}>
            {DEBUG_PAGE_STRUCTURE ? (
              <>
                <div className="page-debug-top">top</div>
                <div className="page-debug-middle">middle</div>
                <div className="page-debug-bottom">bottom</div>
              </>
            ) : DEBUG_LAYOUT ? (
              <>
                <section className="about-us-section layout-debug-box" data-layout="about-us">
                  <span>About Us (top)</span>
                </section>
                <section className="featured-section layout-debug-box" data-layout="featured">
                  <span>Featured carousel</span>
                </section>
                <section className="games-section layout-debug-box" data-layout="coming-soon">
                  <span>Coming Soon carousel</span>
                </section>
              </>
            ) : (
              <>
                <section className="about-us-section">
                  <AboutUsSection
                    featureBannerItems={gamesData.featureBannerItems}
                    resolveImageUrl={resolveImageUrl}
                  />
                </section>
                <section className="featured-section">
                  <FeaturedGameCarousel
                    featured={gamesData.featured}
                    recommended={gamesData.recommended}
                    isLoading={isLoadingGames}
                    onLearnMore={handleLearnMore}
                    resolveImageUrl={resolveImageUrl}
                    solanaImgSrc={solanaImageUrl}
                    debugLayout={DEBUG_FEATURED}
                  />
                </section>
                <section className="games-section">
                  <ComingSoonCarousel
                    comingSoon={gamesData.comingSoon}
                    availableNow={gamesData.availableNow}
                    explorerGames={explorerGamesForCarousel}
                    isLoading={isLoadingGames}
                    onGameClick={handlePlayGame}
                    onExploreClick={() => navigate('/CardGamesExplorer')}
                    resolveImageUrl={resolveImageUrl}
                  />
                </section>
              </>
            )}
            {!DEBUG_PAGE_STRUCTURE && <div className="content-spacer" />}
          </div>
        </div>
      </div>
    </UnifiedPageShell>
  );
}

