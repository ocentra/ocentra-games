import type { GamesExplorerMetadata, ViewMode, SortBy, QualityFilter } from './types';
import './ExplorerContentBar.css';

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'completeness', label: 'Completeness' },
  { value: 'available', label: 'Available First' },
];

const VIEWS: { key: ViewMode; label: string }[] = [
  { key: 'grid', label: '⊞ Grid' },
  { key: 'list', label: '☰ List' },
  { key: 'alphabet', label: '🔤 A–Z' },
];

export interface ExplorerContentBarProps {
  currentView: ViewMode;
  onViewChange?: (v: ViewMode) => void;
  searchQuery: string;
  onSearchChange?: (v: string) => void;
  metadata?: GamesExplorerMetadata | null;
  categoryMapSize?: number;
  sortBy?: SortBy;
  onSortChange?: (s: SortBy) => void;
  qualityFilter?: QualityFilter;
  onQualityChange?: (q: QualityFilter) => void;
  views?: readonly ViewMode[];
  isSidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  availableCount?: number;
}

function StatPill({ value, label, cls }: { value: number; label: string; cls?: string }) {
  return (
    <div className={`cge-stat ${cls ? `cge-stat--${cls}` : ''}`}>
      <span className="cge-stat__value">{value.toLocaleString()}</span>
      <span className="cge-stat__label">{label}</span>
    </div>
  );
}

export function ExplorerContentBar({
  currentView,
  onViewChange,
  searchQuery,
  onSearchChange,
  metadata,
  categoryMapSize = 0,
  sortBy = 'name',
  onSortChange,
  qualityFilter = 'all',
  onQualityChange,
  views = VIEWS.map((v) => v.key),
  isSidebarCollapsed = false,
  onToggleSidebar,
  availableCount = 0,
}: ExplorerContentBarProps) {
  const QUALITY_OPTIONS: { value: QualityFilter; label: string }[] = [
    { value: 'all', label: 'All Quality' },
    { value: 'available', label: 'Available Now' },
    { value: 'complete', label: 'Complete' },
    { value: 'partial', label: 'Partial' },
    { value: 'placeholder', label: 'Placeholder' },
    { value: 'missing_json', label: 'Missing JSON' },
    { value: 'missing_name', label: 'Missing Name' },
  ];
  return (
    <div className="cge-content-bar">
      <div className="cge-content-bar__left">
        {onToggleSidebar && (
          <button
            type="button"
            className={`cge-sidebar-toggle-btn ${isSidebarCollapsed ? 'is-collapsed' : ''}`}
            onClick={onToggleSidebar}
            title={isSidebarCollapsed ? 'Show categories' : 'Hide categories'}
            aria-label={isSidebarCollapsed ? 'Show categories' : 'Hide categories'}
          >
            <span className="cge-sidebar-toggle-btn__icon">{isSidebarCollapsed ? '◫' : '◨'}</span>
          </button>
        )}
        <div className="cge-search-wrap">
          <span className="cge-search-icon">🔍</span>
          <input
            type="text"
            className="cge-search"
            placeholder="Search games..."
            value={searchQuery}
            onChange={(e) => onSearchChange?.(e.target.value)}
          />
        </div>

        <div className="cge-view-tabs">
          {views.map((key) => {
            const item = VIEWS.find((v) => v.key === key);
            if (!item) return null;
            return (
              <button
                key={key}
                type="button"
                className={`cge-view-tab ${currentView === key ? 'is-active' : ''}`}
                onClick={() => onViewChange?.(key)}
              >
                {item.label}
              </button>
            );
          })}

            <div className="cge-sort-container">
              <label className="cge-sort-wrap" htmlFor="cge-quality-select">
                <span className="cge-sort-icon">⚖</span>
                <select
                  id="cge-quality-select"
                  className="cge-sort-select"
                  value={qualityFilter}
                  title="Filter by quality..."
                  onChange={(e) => onQualityChange?.(e.target.value as QualityFilter)}
                >
                  {QUALITY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="cge-sort-container">
              <label className="cge-sort-wrap" htmlFor="cge-sort-select">
                <span className="cge-sort-icon">⇅</span>
                <select
                  id="cge-sort-select"
                  className="cge-sort-select"
                  value={sortBy}
                  title="Sort by..."
                  onChange={(e) => onSortChange?.(e.target.value as SortBy)}
                >
                  {SORT_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </div>
        </div>
      </div>

      <div className="cge-content-bar__right">
        {metadata && (
          <div className="cge-content-stats">
            <StatPill value={metadata.totalGames} label="Games" />
            <StatPill value={availableCount} label="Available" cls="available" />
            <StatPill value={categoryMapSize} label="Categories" />
          </div>
        )}
      </div>
    </div>
  );
}
