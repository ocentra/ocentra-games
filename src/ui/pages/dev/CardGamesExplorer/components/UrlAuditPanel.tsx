import type { UrlAuditEntry, UrlStatus, UrlAuditFilter } from '../types';
import './UrlAuditPanel.css';

interface Props {
  urls: UrlAuditEntry[];
  filtered: UrlAuditEntry[];
  statusMap: Record<string, UrlStatus>;
  filter: UrlAuditFilter;
  onFilterChange: (f: UrlAuditFilter) => void;
  loading: boolean;
  error: string | null;
  validating: boolean;
  progress: { done: number; total: number };
  url404List: UrlAuditEntry[];
  urlFailedList: UrlAuditEntry[];
  onValidate: () => void;
  onExportFiltered: () => void;
  onExport404: () => void;
  onExportFailed: () => void;
}

const FILTER_OPTIONS: { value: UrlAuditFilter; label: string }[] = [
  { value: 'all',          label: 'All URLs' },
  { value: 'wrong',        label: 'Failed (non-2xx)' },
  { value: '404',          label: '404 only' },
  { value: 'no_list_name', label: 'Not in list' },
  { value: 'no_json',      label: 'Not in any JSON' },
];

export function UrlAuditPanel({
  urls, filtered, statusMap,
  filter, onFilterChange,
  loading, error,
  validating, progress,
  url404List, urlFailedList,
  onValidate,
  onExportFiltered,
  onExport404,
  onExportFailed,
}: Props) {
  return (
    <div className="cge-url-panel">
      <div className="cge-url-panel__header">
        <div>
          <h2 className="cge-url-panel__title">URL Audit</h2>
          <p className="cge-url-panel__desc">
            All URLs from lists + JSONs, deduplicated. Validate to check live status.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="cge-url-panel__toolbar">
        <select
          className="cge-url-filter-select"
          value={filter}
          onChange={e => onFilterChange(e.target.value as UrlAuditFilter)}
          aria-label="Filter URLs"
        >
          {FILTER_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <button
          type="button"
          className="cge-url-btn cge-url-btn--validate"
          onClick={onValidate}
          disabled={validating || urls.length === 0}
          title="Validates ALL URLs regardless of filter"
        >
          {validating
            ? `Validating… ${progress.done} / ${progress.total}`
            : 'Validate all'}
        </button>

        <button
          type="button"
          className="cge-url-btn cge-url-btn--export"
          onClick={onExportFiltered}
          disabled={filtered.length === 0}
          title="Save current table to Log/ via API"
        >
          Export table ({filtered.length})
        </button>

        {urlFailedList.length > 0 && (
          <>
            <button
              type="button"
              className="cge-url-btn cge-url-btn--export"
              onClick={onExport404}
              title="Save 404s to Log/"
            >
              Export 404s ({url404List.length})
            </button>
            <button
              type="button"
              className="cge-url-btn cge-url-btn--export"
              onClick={onExportFailed}
              title="Save failed URLs to Log/"
            >
              Export failed ({urlFailedList.length})
            </button>
          </>
        )}
      </div>

      {/* Progress bar */}
      {validating && progress.total > 0 && (
        <div
          className="cge-url-progress"
          role="status"
          aria-live="polite"
          aria-label={`Validation progress: ${progress.done} of ${progress.total}`}
        >
          <progress
            className="cge-url-progress__bar"
            value={progress.done}
            max={progress.total}
          />
          <span className="cge-url-progress__text">
            {progress.done} / {progress.total} URLs checked
          </span>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="cge-url-loading">
          <div className="cge-spinner" />
          <p>Loading URLs…</p>
        </div>
      ) : error ? (
        <p className="cge-url-error">{error}</p>
      ) : (
        <div className="cge-url-table-wrap">
          <p className="cge-url-count">
            {filtered.length} URL(s) · {urls.length} total (deduped)
          </p>
          <table className="cge-url-table">
            <thead>
              <tr>
                <th>URL</th>
                <th>Status</th>
                <th>In list (names)</th>
                <th>In JSON (slugs)</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const s = statusMap[u.url];
                return (
                  <tr key={u.url}>
                    <td className="cge-url-td--url">
                      <a href={u.url} target="_blank" rel="noopener noreferrer">
                        {u.url}
                      </a>
                    </td>
                    <td className="cge-url-td--status">
                      {s != null
                        ? s.ok
                          ? <span className="cge-status-ok">{s.status} OK</span>
                          : <span className="cge-status-fail">{s.status || 'ERR'} fail</span>
                        : '—'}
                    </td>
                    <td className="cge-url-td--list">
                      {u.listNames.length
                        ? u.listNames.slice(0, 3).join(', ') + (u.listNames.length > 3 ? ` +${u.listNames.length - 3}` : '')
                        : '—'}
                    </td>
                    <td className="cge-url-td--json">
                      {u.jsonSlugs.length
                        ? u.jsonSlugs.slice(0, 3).join(', ') + (u.jsonSlugs.length > 3 ? ` +${u.jsonSlugs.length - 3}` : '')
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
