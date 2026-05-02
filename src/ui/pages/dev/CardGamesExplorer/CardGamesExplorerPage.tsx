import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicBackground, type RotationControlAPI } from '@ocentra/core-ui/Background/DynamicBackground';
import { UnifiedHeader } from '@ocentra/core-ui/Header/UnifiedHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { UnifiedPageShell } from '@ocentra/core-ui/Shell/UnifiedPageShell';
import { APP_VERSION } from '@/constants/version';
import { useGamesData } from './hooks/useGamesData';
import { useGamesFilter } from './hooks/useGamesFilter';
import { useGameDetail } from './hooks/useGameDetail';
import type { Game } from './types';
import { ExplorerContentBar } from '@ocentra/core-ui/GamesExplorer/ExplorerContentBar';
import { ExplorerSidebar } from '@ocentra/core-ui/GamesExplorer/ExplorerSidebar';
import { GameCard } from '@ocentra/core-ui/GamesExplorer/GameCard';
import { GameListRow, GameListRowHeader } from '@ocentra/core-ui/GamesExplorer/GameListRow';
import { ExplorerControlBar } from './components/ExplorerControlBar';
import { GameDetailOverlay } from './components/GameDetailOverlay';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';

import '@/ui/pages/Home/HomePage.css';
import './CardGamesExplorerPage.css';

import { ThreeBaseProvider } from '@ocentra/core-ui/Background/ThreeBaseContext';

export function CardGamesExplorerPage() {
  const navigate = useNavigate();
  const headerProps = useCoreUIHeaderProps();
  const rotationRef = useRef<RotationControlAPI | null>(null);

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
    currentLetter,
    setCurrentLetter,
    sortBy,
    setSortBy,
    currentView,
    setCurrentView,
    sortedCategories,
    availableLetters,
    qualityFilter,
    setQualityFilter,
    filteredGames,
  } = useGamesFilter(games, metadata);

  const { selectedGame, gameDetail, detailLoading, openDetail, closeDetail } = useGameDetail();
  const [alphabetLayout, setAlphabetLayout] = useState<'grid' | 'list'>('grid');
  const categoryMapSize = useMemo(
    () => sortedCategories.filter(([key]) => key !== 'all').length,
    [sortedCategories],
  );
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const showList = currentView === 'list' || (currentView === 'alphabet' && alphabetLayout === 'list');
  const showGrid = currentView === 'grid' || (currentView === 'alphabet' && alphabetLayout === 'grid');
  const availableCount = useMemo(() => games.filter(g => g.source === 'asset').length, [games]);

  return (
    <ThreeBaseProvider>
      <UnifiedPageShell
        className="home-page cge-page"
        workClassName="home-shell-work"
        background={<DynamicBackground controlRef={rotationRef} />}
        header={
          <UnifiedHeader
            showPrimaryNavigation
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
        <div className="scrollable-content-container">
          <div className="home-content">
            <div className="cge-page__top-bar">
              <ExplorerContentBar
                currentView={currentView}
                onViewChange={setCurrentView}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                metadata={metadata}
                categoryMapSize={categoryMapSize}
                sortBy={sortBy}
                onSortChange={setSortBy}
                qualityFilter={qualityFilter}
                onQualityChange={setQualityFilter}
                isSidebarCollapsed={isSidebarCollapsed}
                onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                availableCount={availableCount}
              />
            </div>

          <div className={`cge-page__body ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
            <ExplorerSidebar
              playerModeFilter={playerModeFilter}
              onPlayerModeChange={setPlayerModeFilter}
              playerModeCounts={playerModeCounts}
              currentCategory={currentCategory}
              onCategoryChange={setCurrentCategory}
              currentSubcategory={currentSubcategory}
              onSubcategoryChange={setCurrentSubcategory}
              categoryWithSubs={categoryWithSubs}
              categoryExpanded={categoryExpanded}
              onCategoryExpandToggle={toggleCategoryExpanded}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            <div className="cge-page__content">
              <ExplorerControlBar
                currentView={currentView}
                availableLetters={availableLetters}
                currentLetter={currentLetter}
                onLetterChange={setCurrentLetter}
                alphabetLayout={alphabetLayout}
                onLayoutChange={setAlphabetLayout}
              />

              <div className="cge-page__games-area">
                {loading ? (
                  <div className="cge-page__state">
                    <div className="cge-spinner" />
                    <p>Loading games...</p>
                  </div>
                ) : loadError ? (
                  <div className="cge-page__state cge-page__state--error">
                    <p className="cge-page__error-msg">Failed to load games</p>
                    <pre className="cge-page__error-pre">{loadError}</pre>
                    <p className="cge-page__error-hint">
                      Make sure the asset catalog is reachable.
                    </p>
                    <button type="button" className="cge-page__refresh-btn" onClick={refresh}>
                      Retry
                    </button>
                  </div>
                ) : filteredGames.length === 0 ? (
                  <div className="cge-page__state">
                    <div className="cge-page__empty-icon">🔍</div>
                    <h3>No games found</h3>
                    <p>Try adjusting your filters or search query.</p>
                  </div>
                ) : showList ? (
                  <div className="cge-games-list">
                    <GameListRowHeader />
                    {filteredGames.map((game) => (
                      <GameListRow
                        key={`${game.file}-${game.name}`}
                        game={game}
                        onGameClick={(nextGame) => openDetail(nextGame as Game)}
                      />
                    ))}
                  </div>
                ) : showGrid ? (
                  <div className="cge-games-grid">
                    {filteredGames.map((game) => (
                      <GameCard
                        key={`${game.file}-${game.name}`}
                        game={game}
                        onGameClick={(nextGame) => openDetail(nextGame as Game)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
              </div>
            </div>
          </div>
        </div>

        {selectedGame && (
          <GameDetailOverlay
            game={selectedGame}
            detail={gameDetail}
            loading={detailLoading}
            onClose={closeDetail}
          />
        )}
      </UnifiedPageShell>
    </ThreeBaseProvider>
  );
}

