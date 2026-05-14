import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { GamesCatalogSvgShowcase } from '@ocentra/core-ui/GamesExplorer/GamesCatalogSvgShowcase';
import type { GamesExplorerDetailSection, GamesExplorerGame } from '@ocentra/core-ui/GamesExplorer/types';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { APP_VERSION } from '@/constants/version';
import { BrandedLoadingSpinner } from '@/ui/components/Loading/BrandedLoadingSpinner';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { buildCardGamesCatalogPath, buildGamePath, buildRulesPath } from '@/ui/navigation/appRoutes';
import { useGameDetail } from './hooks/useGameDetail';
import { useGamesData } from './hooks/useGamesData';
import { useGamesFilter } from './hooks/useGamesFilter';
import type { Game } from './types';

import '@/ui/pages/Home/HomePage.css';
import './CardGamesExplorerPage.css';

interface CardGamesExplorerPageProps {
  catalogScope?: 'all' | 'card-games';
  initialCategorySlug?: string;
  initialGameSlug?: string;
  initialDetailSection?: GamesExplorerDetailSection;
}

function slugifyCatalogLabel(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'card-games';
}

function categoryMatchesSlug(category: string, slug: string): boolean {
  const normalizedSlug = slugifyCatalogLabel(slug);
  const baseSlug = normalizedSlug.replace(/-card-games$/, '');
  const categoryOnlySlug = slugifyCatalogLabel(category);
  return categoryOnlySlug === baseSlug || `${categoryOnlySlug}-card-games` === normalizedSlug;
}

function getGamePageRouteId(game: GamesExplorerGame): string {
  return game.source === 'asset' && game.guid ? `${game.slug}:${game.guid}` : game.slug;
}

export function CardGamesExplorerPage({
  catalogScope = 'card-games',
  initialCategorySlug,
  initialGameSlug,
  initialDetailSection = 'overview',
}: CardGamesExplorerPageProps) {
  const navigate = useNavigate();
  const headerProps = useCoreUIHeaderProps();
  const dismissedRouteGameSlugRef = useRef<string | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    document.documentElement.classList.add('home-page-active');
    document.body.classList.add('home-page-active');

    const hide = (globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined;
    if (hide) {
      hide();
    }

    return () => {
      document.documentElement.classList.remove('home-page-active');
      document.body.classList.remove('home-page-active');
    };
  }, []);

  const { games, metadata, loading, loadError, refresh } = useGamesData();
  const {
    searchQuery,
    setSearchQuery,
    playerModeFilter,
    setPlayerModeFilter,
    playerModeCounts,
    currentCategory,
    setCurrentCategory,
    currentSubcategory,
    setCurrentSubcategory,
    categoryWithSubs,
    categoryExpanded,
    toggleCategoryExpanded,
    sortBy,
    setSortBy,
    currentView,
    setCurrentView,
    qualityFilter,
    setQualityFilter,
    filteredGames,
  } = useGamesFilter(games, metadata);
  const { selectedGame, gameDetail, detailLoading, openDetail, closeDetail } = useGameDetail();

  const availableCount = useMemo(
    () => games.filter(game => game.source === 'asset').length,
    [games],
  );
  const routeCategory = useMemo(() => {
    if (!initialCategorySlug) {
      return null;
    }
    return categoryWithSubs.find(item => categoryMatchesSlug(item.category, initialCategorySlug))?.category ?? null;
  }, [categoryWithSubs, initialCategorySlug]);
  const routeGame = useMemo(() => {
    if (!initialGameSlug) {
      return null;
    }
    const routeSlug = initialGameSlug.split(':')[0] ?? initialGameSlug;
    return games.find(game => game.slug === routeSlug || game.guid === initialGameSlug) ?? null;
  }, [games, initialGameSlug]);

  useEffect(() => {
    if (routeCategory && currentCategory !== routeCategory) {
      setCurrentCategory(routeCategory);
    }
  }, [currentCategory, routeCategory, setCurrentCategory]);

  useEffect(() => {
    dismissedRouteGameSlugRef.current = null;
  }, [initialGameSlug]);

  useEffect(() => {
    if (!routeGame || selectedGame?.slug === routeGame.slug) {
      return;
    }
    if (dismissedRouteGameSlugRef.current === routeGame.slug) {
      return;
    }
    setSearchQuery('');
    setQualityFilter('all');
    if (!initialCategorySlug) {
      setCurrentCategory('all');
      setCurrentSubcategory(null);
    }
    void openDetail(routeGame);
  }, [
    initialCategorySlug,
    openDetail,
    routeGame,
    selectedGame?.slug,
    setCurrentCategory,
    setCurrentSubcategory,
    setQualityFilter,
    setSearchQuery,
  ]);

  const handleOpenGame = (game: GamesExplorerGame) => {
    if (!game.slug) {
      return;
    }
    navigate(buildGamePath(getGamePageRouteId(game)));
  };
  const handleOpenRules = (game: GamesExplorerGame) => {
    if (!game.slug) {
      return;
    }
    navigate(buildRulesPath(game.slug));
  };
  const handleSelectGame = (game: GamesExplorerGame) => {
    void openDetail(game as Game);
  };
  const handleCloseDetail = () => {
    if (initialGameSlug && selectedGame?.slug) {
      dismissedRouteGameSlugRef.current = selectedGame.slug;
    }
    closeDetail();
    if (initialGameSlug) {
      navigate(buildCardGamesCatalogPath());
    }
  };

  const catalogTitle = catalogScope === 'all' ? 'Games Catalog' : 'Card Games Explorer';
  const pageTitle = routeGame?.name ?? (routeCategory ? `${routeCategory} Card Games` : catalogTitle);
  const catalogTagline = loading
    ? 'Loading...'
    : routeCategory
      ? `${filteredGames.length.toLocaleString()} ${routeCategory.toLowerCase()} records in the catalog`
    : catalogScope === 'all'
      ? `${games.length.toLocaleString()} games ready for catalog browsing`
      : `${games.length.toLocaleString()} finished card games in the catalog`;
  const seoDescription = routeCategory
    ? `Browse ${routeCategory.toLowerCase()} card games from the Ocentra catalog. These records expose researched rules, deck notes, history, player counts, and authoring status while playable pilots move into full game assets.`
    : 'Browse the Ocentra card games catalog as real HTML and as the SVG explorer. The catalog combines playable authored pilots with researched guide records for rules, history, decks, categories, and future gameplay migration.';

  const content =
    loading && games.length === 0 ? (
      <div className="cge-page__state">
        <BrandedLoadingSpinner size="large" />
        <p>Loading games...</p>
      </div>
    ) : loadError && games.length === 0 ? (
      <div className="cge-page__state cge-page__state--error">
        <p className="cge-page__error-msg">Failed to load games</p>
        <pre className="cge-page__error-pre">{loadError}</pre>
        <button type="button" className="cge-page__refresh-btn" onClick={refresh}>
          Retry
        </button>
      </div>
    ) : (
      <GamesCatalogSvgShowcase
        games={filteredGames}
        metadata={metadata ?? { totalGames: games.length }}
        availableCount={availableCount}
        categoryWithSubs={categoryWithSubs}
        playerModeCounts={playerModeCounts}
        currentView={currentView}
        onViewChange={setCurrentView}
        qualityFilter={qualityFilter}
        onQualityChange={setQualityFilter}
        sortBy={sortBy}
        onSortChange={setSortBy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        currentCategory={currentCategory}
        onCategoryChange={setCurrentCategory}
        currentSubcategory={currentSubcategory}
        onSubcategoryChange={setCurrentSubcategory}
        playerModeFilter={playerModeFilter}
        onPlayerModeChange={setPlayerModeFilter}
        categoryExpanded={categoryExpanded}
        onCategoryExpandToggle={toggleCategoryExpanded}
        isSidebarCollapsed={isSidebarCollapsed}
        onToggleSidebar={() => setIsSidebarCollapsed(value => !value)}
        detail={gameDetail}
        detailLoading={detailLoading}
        selectedGame={selectedGame}
        initialDetailSection={initialDetailSection}
        onGameSelect={handleSelectGame}
        onDetailClose={handleCloseDetail}
        onGameClick={handleOpenGame}
        onRulesClick={handleOpenRules}
      />
    );

  return (
    <UnifiedPageShell
      viewportLocked
      className="home-page cge-page"
      workClassName="home-shell-work cge-page__work"
      header={
        <UnifiedHeader
          showPrimaryNavigation={false}
          includeAdminNavigation={Boolean(headerProps.user?.isAdmin)}
          dynamicData={{
            gameName: pageTitle,
            tagline: catalogTagline,
          }}
          config={{
            left: {
              onClick: () => navigate('/'),
            },
            right: headerProps.rightConfig,
          }}
        />
      }
      footer={<GameFooter appVersion={APP_VERSION} />}
    >
      <main className="cge-page__svg-stage" aria-label={seoDescription}>
        {content}
      </main>
    </UnifiedPageShell>
  );
}
