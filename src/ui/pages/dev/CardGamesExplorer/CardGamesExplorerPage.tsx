import { useRef, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DynamicBackground, type RotationControlAPI } from '@/ui/components/Background/DynamicBackground';
import { GameHeader } from '@ocentra/core-ui';
import { AppFooter } from '@/ui/components/AppFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';

import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';
import { useGamesData } from './hooks/useGamesData';
import { useGamesFilter } from './hooks/useGamesFilter';
import { useGameDetail } from './hooks/useGameDetail';

import type { Game } from './types';
import {
  ExplorerSidebar,
  ExplorerContentBar,
  GameCard,
  GameListRow,
  GameListRowHeader,
} from '@ocentra/core-ui/GamesExplorer';
import { ExplorerControlBar } from './components/ExplorerControlBar';
import { GameDetailOverlay } from './components/GameDetailOverlay';

import './CardGamesExplorerPage.css';

export function CardGamesExplorerPage() {
  const headerProps = useCoreUIHeaderProps();
  const navigate = useNavigate();
  const rotationRef = useRef<RotationControlAPI | null>(null);

  /* ── Data ── */
  const { games, metadata, loading, loadError, refresh } = useGamesData();

  /* ── Filters / sorting / view ── */
  const {
    searchQuery, setSearchQuery,
    playerModeFilter, setPlayerModeFilter,
    playerModeCounts,
    currentCategory, setCurrentCategory,
    currentSubcategory, setCurrentSubcategory,
    categoryWithSubs,
    categoryExpanded,
    toggleCategoryExpanded,
    currentLetter, setCurrentLetter,
    sortBy, setSortBy,
    currentView, setCurrentView,
    sortedCategories,
    availableLetters,
    filteredGames,
  } = useGamesFilter(games, metadata);

  /* ── Detail overlay ── */
  const { selectedGame, gameDetail, detailLoading, openDetail, closeDetail } = useGameDetail();

  /* ── Alphabet sub-layout ── */
  const [alphabetLayout, setAlphabetLayout] = useState<'grid' | 'list'>('grid');

  /* ── Category map size for stats pill ── */
  const categoryMapSize = useMemo(
    () => sortedCategories.filter(([k]) => k !== 'all').length,
    [sortedCategories],
  );

  /* ── Sidebar Expand/Collapse ── */
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  /* ── Render ── */
  const showList = currentView === 'list' || (currentView === 'alphabet' && alphabetLayout === 'list');
  const showGrid = currentView === 'grid' || (currentView === 'alphabet' && alphabetLayout === 'grid');

  return (
    <div className="cge-page">
      <DynamicBackground
        controlRef={rotationRef}
      />

      <GameHeader
        {...headerProps}
        variant="game"
        gameName="Card Games Explorer"
        tagline={loading ? 'Loading…' : `${games.length.toLocaleString()}+ card games from around the world`}
        onHomeClick={() => navigate('/')}
      />

      {/* Row 1: Full-width Search + view tabs + stats */}
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
        />
      </div>

      {/* Main shell — sidebar + content */}
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
          {/* Row 2: Alphabet controls (alphabet view only) */}
          <ExplorerControlBar
            currentView={currentView}
            availableLetters={availableLetters}
            currentLetter={currentLetter}
            onLetterChange={setCurrentLetter}
            alphabetLayout={alphabetLayout}
            onLayoutChange={setAlphabetLayout}
          />

          {/* Scrollable game area */}
          <div className="cge-page__games-area">
            {loading ? (
              <div className="cge-page__state">
                <div className="cge-spinner" />
                <p>Loading games…</p>
              </div>
            ) : loadError ? (
              <div className="cge-page__state cge-page__state--error">
                <p className="cge-page__error-msg">Failed to load games</p>
                <pre className="cge-page__error-pre">{loadError}</pre>
                <p className="cge-page__error-hint">
                  Make sure <code>{LocalApiEndpoint.CardGames.Games}</code> is reachable.
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
                {filteredGames.map(game => (
                  <GameListRow
                    key={`${game.file}-${game.name}`}
                    game={game}
                    onGameClick={(g) => openDetail(g as Game)}
                  />
                ))}
              </div>
            ) : showGrid ? (
              <div className="cge-games-grid">
                {filteredGames.map(game => (
                  <GameCard
                    key={`${game.file}-${game.name}`}
                    game={game}
                    onGameClick={(g) => openDetail(g as Game)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Detail overlay */}
      {selectedGame && (
        <GameDetailOverlay
          game={selectedGame}
          detail={gameDetail}
          loading={detailLoading}
          onClose={closeDetail}
        />
      )}

      <AppFooter />
    </div>
  );
}
