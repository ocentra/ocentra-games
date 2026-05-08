import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicBackground, type RotationControlAPI } from '@ocentra/core-ui/Background/DynamicBackground';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { GamesCatalogSvgShowcase } from '@ocentra/core-ui/GamesExplorer/GamesCatalogSvgShowcase';
import type { GamesExplorerGame } from '@ocentra/core-ui/GamesExplorer/types';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { ThreeBaseProvider } from '@ocentra/core-ui/Background/ThreeBaseContext';
import { APP_VERSION } from '@/constants/version';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { buildGamePath } from '@/ui/navigation/appRoutes';
import { useGameDetail } from './hooks/useGameDetail';
import { useGamesData } from './hooks/useGamesData';
import { useGamesFilter } from './hooks/useGamesFilter';
import type { Game } from './types';

import '@/ui/pages/Home/HomePage.css';
import './CardGamesExplorerPage.css';

export function CardGamesExplorerPage() {
  const navigate = useNavigate();
  const headerProps = useCoreUIHeaderProps();
  const rotationRef = useRef<RotationControlAPI | null>(null);
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
  const { gameDetail, detailLoading, openDetail, closeDetail } = useGameDetail();

  const availableCount = useMemo(
    () => games.filter(game => game.source === 'asset').length,
    [games],
  );

  const handleOpenGame = (game: GamesExplorerGame) => {
    if (!game.guid) {
      return;
    }
    navigate(buildGamePath(`${game.slug}:${game.guid}`));
  };
  const handleSelectGame = (game: GamesExplorerGame) => {
    void openDetail(game as Game);
  };

  const content =
    loading && games.length === 0 ? (
      <div className="cge-page__state">
        <div className="cge-spinner" />
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
        onGameSelect={handleSelectGame}
        onDetailClose={closeDetail}
        onGameClick={handleOpenGame}
      />
    );

  return (
    <ThreeBaseProvider>
      <UnifiedPageShell
        viewportLocked
        className="home-page cge-page"
        workClassName="home-shell-work cge-page__work"
        background={<DynamicBackground controlRef={rotationRef} />}
        header={
          <UnifiedHeader
            showPrimaryNavigation={false}
            includeAdminNavigation={Boolean(headerProps.user?.isAdmin)}
            dynamicData={{
              gameName: 'Card Games Explorer',
              tagline: loading ? 'Loading...' : `${games.length.toLocaleString()} finished card games in the catalog`,
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
        <div className="cge-page__svg-stage">
          {content}
        </div>
      </UnifiedPageShell>
    </ThreeBaseProvider>
  );
}
