import { useCallback, useRef, useState } from 'react';
import type { CategoryWithSubs, PlayerModeFilter } from './types';
import { CATEGORY_ICONS, PLAYER_MODE_LABELS } from './types';
import './ExplorerSidebar.css';

export interface PlayerModeCounts {
  all: number;
  singleplayer: number;
  multiplayer: number;
}

export interface ExplorerSidebarProps {
  playerModeFilter?: PlayerModeFilter;
  onPlayerModeChange?: (v: PlayerModeFilter) => void;
  playerModeCounts?: PlayerModeCounts;
  currentCategory: string;
  onCategoryChange?: (v: string) => void;
  currentSubcategory?: string | null;
  onSubcategoryChange?: (v: string | null) => void;
  categoryWithSubs: ReadonlyArray<CategoryWithSubs>;
  categoryExpanded?: ReadonlySet<string>;
  onCategoryExpandToggle?: (cat: string) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const MIN_WIDTH = 200;
const MAX_WIDTH = 450;
const DEFAULT_WIDTH = 280;

export function ExplorerSidebar({
  playerModeFilter = 'all',
  onPlayerModeChange,
  playerModeCounts = { all: 0, singleplayer: 0, multiplayer: 0 },
  currentCategory,
  onCategoryChange,
  currentSubcategory = null,
  onSubcategoryChange,
  categoryWithSubs,
  categoryExpanded = new Set(),
  onCategoryExpandToggle,
  isCollapsed = false,
  onToggleCollapse,
}: ExplorerSidebarProps) {
  const showPlayerMode = playerModeCounts.all > 0 && onPlayerModeChange;
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragState = useRef<{ startX: number; startW: number } | null>(null);

  const onResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startW: width };

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const delta = ev.clientX - dragState.current.startX;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, dragState.current.startW + delta)));
    };
    const onUp = () => {
      dragState.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);

  return (
    <aside
      className={`cge-sidebar ${isCollapsed ? 'is-collapsed' : ''}`}
      style={isCollapsed ? undefined : { width: `${width}px` }}
    >
      <div className="cge-sidebar__inner">
        <div className="cge-panel cge-panel--grow">
          <div className="cge-panel__header">
            <span>📂</span>
            <h3>Categories</h3>
            <button
              type="button"
              className="cge-sidebar__collapse-btn"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? '›' : '‹'}
            </button>
          </div>
          <div className="cge-panel__content">
            {showPlayerMode && (
              <div className="cge-player-mode-tabs">
                {(['all', 'singleplayer', 'multiplayer'] as const).map((mode) => {
                  const { icon } = PLAYER_MODE_LABELS[mode];
                  const count = playerModeCounts[mode];
                  const label = mode === 'all' ? 'All' : mode === 'singleplayer' ? 'Single Player' : 'Multiplayer';
                  return (
                    <button
                      key={mode}
                      type="button"
                      className={`cge-player-mode-tab ${playerModeFilter === mode ? 'is-active' : ''}`}
                      onClick={() => onPlayerModeChange(mode)}
                      title={label}
                    >
                      <span className="cge-player-mode-tab__icon">{icon}</span>
                      <span className="cge-player-mode-tab__label">{label}</span>
                      <span className="cge-player-mode-tab__count">{count.toLocaleString()}</span>
                    </button>
                  );
                })}
              </div>
            )}
            <div className="cge-categories">
              {categoryWithSubs.map(({ category: cat, total, subList }) => {
                const isExpanded = categoryExpanded.has(cat);
                const hasSubs = subList.length > 0;
                const isActive = currentCategory === cat && currentSubcategory === null;
                return (
                  <div key={cat} className="cge-category-group">
                    <div className="cge-category-row">
                      {hasSubs ? (
                        <button
                          type="button"
                          className="cge-category-expand"
                          onClick={() => onCategoryExpandToggle?.(cat)}
                          aria-label={isExpanded ? 'Collapse subcategories' : 'Expand subcategories'}
                        >
                          {isExpanded ? '▼' : '▶'}
                        </button>
                      ) : (
                        <span className="cge-category-expand-placeholder" aria-hidden />
                      )}
                      <button
                        type="button"
                        className={`cge-category-item cge-category-item--expandable ${isActive ? 'is-active' : ''}`}
                        onClick={() => {
                          onCategoryChange?.(cat);
                          onSubcategoryChange?.(null);
                        }}
                      >
                        <span className="cge-category-item__name">
                          <span>{CATEGORY_ICONS[cat] ?? '📦'}</span>
                          {cat}
                        </span>
                        <span className="cge-category-item__count">{total.toLocaleString()}</span>
                      </button>
                    </div>
                    {hasSubs && isExpanded && (
                      <div className="cge-subcategories cge-subcategories--nested">
                        {subList.map(([sub, count]) => {
                          const isSubActive = currentCategory === cat && currentSubcategory === sub;
                          return (
                            <button
                              key={sub}
                              type="button"
                              className={`cge-subcategory-item ${isSubActive ? 'is-active' : ''}`}
                              onClick={() => {
                                onCategoryChange?.(cat);
                                onSubcategoryChange?.(sub);
                              }}
                            >
                              <span className="cge-subcategory-item__name">{sub === '(none)' ? '—' : sub}</span>
                              <span className="cge-subcategory-item__count">{count.toLocaleString()}</span>
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
        </div>
      </div>

      {/* Drag-to-resize handle */}
      {!isCollapsed && (
        <div
          className="cge-sidebar__resizer"
          onMouseDown={onResizeStart}
          title="Drag to resize"
          aria-hidden="true"
        />
      )}

      {/* Collapsed state: show expand button */}
      {isCollapsed && (
        <button
          type="button"
          className="cge-sidebar__expand-btn"
          onClick={onToggleCollapse}
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          ›
        </button>
      )}
    </aside>
  );
}
