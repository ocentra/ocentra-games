import type { GameMetadata, ViewMode, SortBy } from '../types';
import './ExplorerContentBar.css';

interface Props {
  currentView: ViewMode;
  onViewChange: (v: ViewMode) => void;
  searchQuery: string;
  onSearchChange: (v: string) => void;
  metadata: GameMetadata | null;
  categoryMapSize: number;
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'completeness', label: 'Completeness' },
];

const VIEWS: { key: ViewMode; label: string }[] = [
  { key: 'grid', label: '⊞ Grid' },
  { key: 'list', label: '☰ List' },
  { key: 'alphabet', label: '🔤 A–Z' },
];

export function ExplorerContentBar({
  currentView, onViewChange,
  searchQuery, onSearchChange,
  metadata,
  categoryMapSize,
  sortBy, onSortChange,
}: Props) {
  return (
    <div className="cge-content-bar">
      {/* Left: Search + view tabs */}
      <div className="cge-content-bar__left">
        <div className="cge-search-wrap">
          <span className="cge-search-icon">🔍</span>
          <input
            type="text"
            className="cge-search"
            placeholder="Search games..."
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
          />
        </div>

        <div className="cge-view-tabs">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`cge-view-tab ${currentView === key ? 'is-active' : ''}`}
              onClick={() => onViewChange(key)}
            >
              {label}
            </button>
          ))}

          <div className="cge-sort-container">
            <label className="cge-sort-wrap" htmlFor="cge-sort-select">
              <span className="cge-sort-icon">⇅</span>
              <select
                id="cge-sort-select"
                className="cge-sort-select"
                value={sortBy}
                title="Sort by..."
                onChange={e => onSortChange(e.target.value as SortBy)}
              >
                {SORT_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* Right: stats + filtered count */}
      <div className="cge-content-bar__right">
        {metadata && (
          <div className="cge-content-stats">
            <StatPill value={metadata.totalGames} label="Games" />
            <StatPill value={metadata.stats.complete} label="Complete" cls="complete" />
            <StatPill value={metadata.stats.partial} label="Partial" cls="partial" />
            <StatPill value={categoryMapSize} label="Categories" />
          </div>
        )}
      </div>
    </div>
  );
}

function StatPill({ value, label, cls }: { value: number; label: string; cls?: string }) {
  return (
    <div className={`cge-stat ${cls ? `cge-stat--${cls}` : ''}`}>
      <span className="cge-stat__value">{value.toLocaleString()}</span>
      <span className="cge-stat__label">{label}</span>
    </div>
  );
}
