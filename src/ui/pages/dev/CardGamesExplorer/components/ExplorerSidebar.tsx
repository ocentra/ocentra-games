import { CATEGORY_ICONS, PLAYER_MODE_LABELS } from '../types';
import type { PlayerModeFilter } from '../types';
import './ExplorerSidebar.css';

export interface CategoryWithSubs {
  category: string;
  total: number;
  subList: ReadonlyArray<readonly [string, number]>;
}

interface PlayerModeCounts {
  all: number;
  singleplayer: number;
  multiplayer: number;
}

interface Props {
  playerModeFilter: PlayerModeFilter;
  onPlayerModeChange: (v: PlayerModeFilter) => void;
  playerModeCounts: PlayerModeCounts;
  currentCategory: string;
  onCategoryChange: (v: string) => void;
  currentSubcategory: string | null;
  onSubcategoryChange: (v: string | null) => void;
  categoryWithSubs: ReadonlyArray<CategoryWithSubs>;
  categoryExpanded: ReadonlySet<string>;
  onCategoryExpandToggle: (cat: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function ExplorerSidebar({
  playerModeFilter,
  onPlayerModeChange,
  playerModeCounts,
  currentCategory, onCategoryChange,
  currentSubcategory, onSubcategoryChange,
  categoryWithSubs,
  categoryExpanded,
  onCategoryExpandToggle,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  return (
    <aside className={`cge-sidebar ${isCollapsed ? 'is-collapsed' : ''}`}>
      <button
        className="cge-sidebar__toggle"
        onClick={onToggleCollapse}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <span className="cge-sidebar__toggle-icon">
          {isCollapsed ? '›' : '‹'}
        </span>
      </button>

      <div className="cge-sidebar__inner">
        <div className="cge-panel cge-panel--grow">
          <div className="cge-panel__header"><span>📂</span><h3>Categories</h3></div>
          <div className="cge-panel__content">
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
                          onClick={() => onCategoryExpandToggle(cat)}
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
                          onCategoryChange(cat);
                          onSubcategoryChange(null);
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
                                onCategoryChange(cat);
                                onSubcategoryChange(sub);
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
    </aside>
  );
}
