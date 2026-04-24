import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { EditorPageHeader } from '@ocentra/core-ui/Header/EditorPageHeader';
import { GameFooter } from '@ocentra/core-ui/Footer/GameFooter';
import { useCoreUIHeaderProps } from '@/hooks/useCoreUIHeaderProps';
import { APP_VERSION } from '@/constants/version';
import LoginDialog from '@/ui/components/Auth/LoginDialog';
import { useAuth } from '@/providers/AuthProvider';
import { useAuthHandlers } from '@/hooks/useAuthHandlers';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';
import './LogsPage.css';

interface LogEntryRow {
  id: string;
  level: string;
  context: string;
  message: string;
  source: string;
  origin: string;
  timestamp: number;
  args?: unknown[];
  stack?: string;
  file?: string;
  filePath?: string;
  line?: number;
  column?: number;
}

interface LogStatsData {
  total_logs: number;
  by_level: Record<string, number>;
  by_source: Record<string, number>;
  by_context?: Record<string, number>;
  oldest_timestamp: number | null;
  newest_timestamp: number | null;
}

const LEVELS = ['info', 'warn', 'error', 'debug', 'log'] as const;
const DEFAULT_LIMIT = 100;

export const LogsPage: React.FC = () => {
  const navigate = useNavigate();
  const headerProps = useCoreUIHeaderProps();
  const { login, signUp, loginWithFacebook, loginWithGoogle, loginAsGuest } = useAuth();
  const handleWalletLogin = async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Please connect your wallet in the login dialog' };
  };
  const authHandlers = useAuthHandlers(login, signUp, loginWithFacebook, loginWithGoogle, loginAsGuest, handleWalletLogin);
  const sendPasswordReset = async (_email: string): Promise<{ success: boolean; error?: string }> => ({
    success: false,
    error: 'Not configured',
  });

  const [logs, setLogs] = useState<LogEntryRow[]>([]);
  const [stats, setStats] = useState<LogStatsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<'main' | 'vite'>('main');
  const [level, setLevel] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [since, setSince] = useState<string>('');

  const fetchStats = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('scope', scope);
      if (source) params.set('source', source);
      const url = `${LocalApiEndpoint.Logs.Stats}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = (await res.json()) as LogStatsData;
      setStats(data);
    } catch {
      setStats(null);
    }
  }, [scope, source]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('scope', scope);
      if (level) params.set('level', level);
      if (source) params.set('source', source);
      params.set('limit', String(limit));
      if (since) params.set('since', since);
      const url = `${LocalApiEndpoint.Logs.Query}?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Query failed: ${res.status}`);
      const data = (await res.json()) as { logs: LogEntryRow[] };
      setLogs(data.logs ?? []);
      await fetchStats();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch logs');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [scope, level, source, limit, since, fetchStats]);

  const clearLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${LocalApiEndpoint.Logs.Clear}?scope=${scope}`;
      const res = await fetch(url, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Clear failed: ${res.status}`);
      setLogs([]);
      setStats(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to clear logs');
    } finally {
      setLoading(false);
    }
  }, [scope]);

  useEffect(() => {
    fetchLogs();
    
    // Dismiss loading screen if direct navigations land here
    const hide = (globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined;
    hide?.();
  }, [fetchLogs]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
  };

  return (
    <>
      {createPortal(
        <LoginDialog
          onLogin={authHandlers.login}
          onSignUp={authHandlers.signUp}
          onFacebookLogin={authHandlers.facebookLogin}
          onGoogleLogin={authHandlers.googleLogin}
          onGuestLogin={authHandlers.guestLogin}
          onWalletLogin={handleWalletLogin}
          onSendPasswordReset={sendPasswordReset}
        />,
        document.body
      )}
      <EditorPageHeader {...headerProps} title="Logs" user={null} onHomeClick={() => navigate('/admin')}
        onAdminDashboardClick={() => navigate('/admin')} />
      <main className="logs-page-main">
        <div className="logs-page">
          <div className="logs-page__filters">
            <div className="logs-page__filter-group">
              <span className="logs-page__filter-label">Scope</span>
              <div className="logs-page__scope-tabs" role="group" aria-label="Log scope">
                <button
                  type="button"
                  className={`logs-page__scope-tab ${scope === 'main' ? 'logs-page__scope-tab--active' : ''}`}
                  onClick={() => setScope('main')}
                >
                  Browser Logs
                </button>
                <button
                  type="button"
                  className={`logs-page__scope-tab ${scope === 'vite' ? 'logs-page__scope-tab--active' : ''}`}
                  onClick={() => setScope('vite')}
                >
                  Vite Logs
                </button>
              </div>
            </div>
            <div className="logs-page__filter-group">
              <label className="logs-page__filter-label" htmlFor="logs-filter-level">Level</label>
              <select
                id="logs-filter-level"
                className="logs-page__select"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                aria-label="Filter logs by level"
              >
                <option value="">All</option>
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div className="logs-page__filter-group">
              <label className="logs-page__filter-label" htmlFor="logs-filter-source">Source</label>
              <input
                id="logs-filter-source"
                type="text"
                className="logs-page__select"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Filter by source"
                aria-label="Filter logs by source"
              />
            </div>
            <div className="logs-page__filter-group">
              <label className="logs-page__filter-label" htmlFor="logs-filter-limit">Limit</label>
              <input
                id="logs-filter-limit"
                type="number"
                min={1}
                max={1000}
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10) || DEFAULT_LIMIT)}
                aria-label="Maximum number of log entries"
              />
            </div>
            <div className="logs-page__filter-group">
              <label className="logs-page__filter-label" htmlFor="logs-filter-since">Since</label>
              <input
                id="logs-filter-since"
                type="text"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                placeholder="e.g. 1h, 30m, 60s"
                aria-label="Filter logs since (e.g. 1h, 30m, 60s)"
              />
            </div>
            <div className="logs-page__actions">
              <button type="button" onClick={fetchLogs} disabled={loading}>
                Refresh
              </button>
              <button type="button" className="logs-page__button-danger" onClick={clearLogs} disabled={loading}>
                Clear all
              </button>
            </div>
          </div>

          {error && <div className="logs-page__error">{error}</div>}

          {stats && (
            <div className="logs-page__stats">
              <h3>Stats</h3>
              <div className="logs-page__stats-content">
                <div className="logs-page__stat-section">
                  <h4>Total</h4>
                  <div className="logs-page__stat-item">
                    <span className="logs-page__stat-label">Logs</span>
                    <span className="logs-page__stat-value">{stats.total_logs}</span>
                  </div>
                </div>
                <div className="logs-page__stat-section">
                  <h4>By level</h4>
                  {Object.entries(stats.by_level).map(([k, v]) => (
                    <div key={k} className="logs-page__stat-item">
                      <span className="logs-page__stat-label">{k}</span>
                      <span className="logs-page__stat-value">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && <div className="logs-page__loading">Loading…</div>}
          {!loading && logs.length === 0 && !error && <div className="logs-page__empty">No logs.</div>}

          {!loading && logs.length > 0 && (
            <div className="logs-page__table-container">
              <table className="logs-page__table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Level</th>
                    <th>Source</th>
                    <th>Context</th>
                    <th>Message</th>
                    <th>Stack</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((row) => (
                    <tr key={row.id} className={`logs-page__row logs-page__row--${row.level}`}>
                      <td className="logs-page__cell-time">{formatTime(row.timestamp)}</td>
                      <td className="logs-page__cell-level">{row.level}</td>
                      <td className="logs-page__cell-location">{row.source}</td>
                      <td className="logs-page__cell-context">{row.context}</td>
                      <td className="logs-page__cell-message">
                        <span className="logs-page__message">{row.message}</span>
                        {row.args && row.args.length > 0 && (
                          <details className="logs-page__args">
                            <summary>args</summary>
                            <pre>{JSON.stringify(row.args, null, 2)}</pre>
                          </details>
                        )}
                      </td>
                      <td className="logs-page__cell-stack">
                        {row.stack ? (
                          <details className="logs-page__stack">
                            <summary>stack</summary>
                            <pre className="logs-page__stack-content">{row.stack}</pre>
                          </details>
                        ) : (
                          <span className="logs-page__no-stack">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <GameFooter appVersion={APP_VERSION} />
    </>
  );
};
