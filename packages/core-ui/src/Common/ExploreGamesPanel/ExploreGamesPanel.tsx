import { useState, useMemo, useRef, useEffect } from 'react';
import { getPlaceholderImageUrl, placeholderImageCount } from '@ocentra/app-assets/placeholders';
import type { ExploreGameSummary } from '../types/ExploreGameSummary';
import { CATEGORY_ICONS, PLAYER_MODE_LABELS } from '../types/exploreTypes';
import type { PlayerModeFilter } from '../types/exploreTypes';
import './ExploreGamesPanel.css';

const AUTOPLAY_INTERVAL_MS = 4500;

function getStablePlaceholder(slugOrName: string): string {
  let hash = 0;
  for (let i = 0; i < slugOrName.length; i++) {
    hash = (hash * 31 + slugOrName.charCodeAt(i)) >>> 0;
  }
  return getPlaceholderImageUrl(hash % placeholderImageCount);
}

export interface ExploreGamesPanelProps {
  games: ExploreGameSummary[];
  onExploreClick?: () => void;
}

export function ExploreGamesPanel({ games, onExploreClick }: ExploreGamesPanelProps) {
  const [playerModeFilter, setPlayerModeFilter] = useState<PlayerModeFilter>('all');
  const [category, setCategory] = useState('all');
  const [subcategory, setSubcategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sequenceIndex, setSequenceIndex] = useState(0);
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const slideRef = useRef<HTMLDivElement>(null);

  const gamesByPlayerMode = useMemo(() => {
    if (playerModeFilter === 'all') return games;
    return games.filter(g => (g.player_mode ?? '').toLowerCase() === playerModeFilter);
  }, [games, playerModeFilter]);

  const playerModeCounts = useMemo(() => {
    let single = 0;
    let multi = 0;
    for (const g of games) {
      const m = (g.player_mode ?? '').toLowerCase();
      if (m === 'singleplayer') single++;
      else if (m === 'multiplayer') multi++;
    }
    return { all: games.length, singleplayer: single, multiplayer: multi };
  }, [games]);

  const categoryWithSubs = useMemo(() => {
    const byCategory = new Map<string, { total: number; subs: Map<string, number> }>();
    for (const g of gamesByPlayerMode) {
      const cat = g.category ?? 'Other';
      const sub = g.subcategory?.trim() || '(none)';
      let entry = byCategory.get(cat);
      if (!entry) {
        entry = { total: 0, subs: new Map() };
        byCategory.set(cat, entry);
      }
      entry.total += 1;
      entry.subs.set(sub, (entry.subs.get(sub) ?? 0) + 1);
    }
    return [...byCategory.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([cat, { total, subs }]) => ({
        category: cat,
        total,
        subList: [...subs.entries()].sort((a, b) => b[1] - a[1]) as ReadonlyArray<readonly [string, number]>,
      }));
  }, [gamesByPlayerMode]);

  const filteredGames = useMemo(() => {
    let result = gamesByPlayerMode;
    if (category !== 'all') {
      result = result.filter(g => (g.category ?? 'Other').toLowerCase() === category.toLowerCase());
    }
    if (subcategory != null && subcategory !== '(none)') {
      result = result.filter(g => (g.subcategory?.trim() || '(none)') === subcategory);
    } else if (subcategory === '(none)') {
      result = result.filter(g => !g.subcategory?.trim());
    }
    return result;
  }, [gamesByPlayerMode, category, subcategory]);

  const displayGames = useMemo(() => {
    if (filteredGames.length === 0) return [];
    const tilesVisible = 4;
    const needsScrolling = filteredGames.length > tilesVisible;
    if (!needsScrolling) return filteredGames;
    const copies = Math.max(3, Math.ceil(12 / filteredGames.length));
    return Array(copies).fill(filteredGames).flat();
  }, [filteredGames]);

  const pingPongSequence = useMemo(() => {
    const len = filteredGames.length;
    if (len <= 1) return [0];
    const fwd = Array.from({ length: len }, (_, i) => i);
    const bwd = Array.from({ length: len - 2 }, (_, i) => len - 2 - i);
    return [...fwd, ...bwd];
  }, [filteredGames.length]);

  useEffect(() => {
    if (slideRef.current && filteredGames.length > 4) {
      const tileWidthPercent = 25;
      const idx = pingPongSequence[sequenceIndex % pingPongSequence.length] ?? 0;
      slideRef.current.style.setProperty('--translate-x', `${idx * tileWidthPercent}%`);
    }
  }, [sequenceIndex, filteredGames.length, pingPongSequence]);

  useEffect(() => {
    if (filteredGames.length <= 4) return;
    autoPlayRef.current = setInterval(() => {
      setSequenceIndex(s => (s + 1) % pingPongSequence.length);
    }, AUTOPLAY_INTERVAL_MS);
    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    };
  }, [filteredGames.length, pingPongSequence.length]);

  const handleCategoryChange = (cat: string) => {
    setCategory(cat);
    setSubcategory(null);
    setSequenceIndex(0);
  };

  const handleSubcategoryChange = (sub: string | null) => {
    setSubcategory(sub);
    setSequenceIndex(0);
  };

  const toggleExpand = (cat: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const needsScrolling = filteredGames.length > 4;

  const handlePrev = () => {
    if (!needsScrolling) return;
    setSequenceIndex(s => (s <= 0 ? pingPongSequence.length - 1 : s - 1));
  };

  const handleNext = () => {
    if (!needsScrolling) return;
    setSequenceIndex(s => (s + 1) % pingPongSequence.length);
  };

  const renderTile = (game: ExploreGameSummary) => {
    const icon = (game.category != null && CATEGORY_ICONS[game.category]) || '🃏';
    const imgSrc = getStablePlaceholder(game.slug || game.name);
    return (
      <button
        key={game.slug || game.name}
        className="game-card-tile"
        type="button"
        onClick={onExploreClick}
      >
        <div className="card-image-container">
          <img src={imgSrc} alt="" className="card-image" loading="lazy" />
          <div className="card-image-overlay" />
          <span className="card-badge badge-explorer">
            {icon} {game.subcategory ? `${game.category} / ${game.subcategory}` : game.category ?? 'Other'}
          </span>
          {game.quality === 'complete' && <span className="quality-dot-complete" title="Complete Content" />}
        </div>
        <div className="card-content">
          <h3 className="card-title" title={game.name}>{game.name}</h3>
          <div className="card-meta-row">
            <span className="card-meta-pill">⚡ {game.difficulty}</span>
            <span className="card-meta-pill">👥 {game.players}</span>
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="explore-games-panel">
      <div className="explore-filter-panel">
        <div className="explore-player-mode-tabs">
          {(['all', 'singleplayer', 'multiplayer'] as const).map((mode) => {
            const { icon } = PLAYER_MODE_LABELS[mode];
            const count = playerModeCounts[mode];
            const label = mode === 'all' ? 'All' : mode === 'singleplayer' ? 'Single Player' : 'Multiplayer';
            return (
              <button
                key={mode}
                type="button"
                className={`explore-player-mode-tab ${playerModeFilter === mode ? 'active' : ''}`}
                onClick={() => {
                  setPlayerModeFilter(mode);
                  setCategory('all');
                  setSubcategory(null);
                  setSequenceIndex(0);
                }}
                title={PLAYER_MODE_LABELS[mode].label}
              >
                <span className="explore-player-mode-tab__icon">{icon}</span>
                <span className="explore-player-mode-tab__label">{label}</span>
                <span className="explore-player-mode-tab__count">{count.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
        <div className="explore-category-list">
          {categoryWithSubs.map(({ category: cat, total, subList }) => {
            const isExpanded = expanded.has(cat);
            const hasSubs = subList.length > 0;
            const isActive = category === cat && !subcategory;
            return (
              <div key={cat} className="explore-category-group">
                <div
                  role="button"
                  tabIndex={0}
                  className={`explore-category-item explore-category-item-main ${isActive ? 'active' : ''}`}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('.explore-category-expand')) return;
                    handleCategoryChange(cat);
                  }}
                  onKeyDown={(e) => {
                    if ((e.target as HTMLElement).closest('.explore-category-expand')) return;
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCategoryChange(cat); }
                  }}
                >
                  {hasSubs ? (
                    <button
                      type="button"
                      className="explore-category-expand"
                      onClick={(e) => { e.stopPropagation(); toggleExpand(cat); }}
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? '▼' : '▶'}
                    </button>
                  ) : (
                    <span className="explore-category-expand-placeholder" aria-hidden />
                  )}
                  <span className="explore-category-name">
                    <span className="explore-category-icon">{CATEGORY_ICONS[cat] ?? '📦'}</span>
                    {cat}
                  </span>
                  <span className="explore-category-count">{total.toLocaleString()}</span>
                </div>
                {hasSubs && isExpanded && (
                  <div className="explore-category-subs">
                    {subList.map(([sub, cnt]) => {
                      const isSubActive = category === cat && subcategory === sub;
                      return (
                        <button
                          key={sub}
                          type="button"
                          className={`explore-category-sub-item ${isSubActive ? 'active' : ''}`}
                          onClick={() => {
                            handleCategoryChange(cat);
                            handleSubcategoryChange(sub);
                            setExpanded(prev => new Set(prev).add(cat));
                          }}
                        >
                          <span className="explore-category-sub-name">{sub === '(none)' ? '—' : sub}</span>
                          <span className="explore-category-count">{cnt.toLocaleString()}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="explore-carousel-area">
        <button
          className={`explore-nav-button explore-nav-prev ${!needsScrolling ? 'hidden' : ''}`}
          onClick={handlePrev}
          aria-label="Previous games"
          disabled={!needsScrolling}
        >
          ◀
        </button>
        <button
          className={`explore-nav-button explore-nav-next ${!needsScrolling ? 'hidden' : ''}`}
          onClick={handleNext}
          aria-label="Next games"
          disabled={!needsScrolling}
        >
          ▶
        </button>

        <div className="explore-track-container">
          <div className="explore-track">
            {filteredGames.length > 0 ? (
              <div ref={slideRef} className="explore-slide">
                {displayGames.map((game, idx) => (
                  <div key={`${game.slug}-${idx}`} className="explore-tile-wrapper">
                    {renderTile(game)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="explore-empty">
                <p>{games.length === 0 ? 'No games to explore' : 'No games match this filter'}</p>
              </div>
            )}
          </div>
          <div className="explore-pinned">
            <button
              className="game-card-tile explore-all-card"
              type="button"
              onClick={onExploreClick}
            >
              <div className="explore-collage-grid">
                {Array.from({ length: 6 }, (_, i) => (
                  <img key={i} src={getStablePlaceholder(`collage-${i}`)} alt="" className="collage-image" loading="lazy" />
                ))}
              </div>
              <div className="explore-all-content">
                <span className="explore-all-icon">🧐</span>
                <span className="explore-all-text">DISCOVER<br />1000+ GAMES</span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
