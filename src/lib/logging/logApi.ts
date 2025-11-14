import { getLogStorage, type LogQuery } from './logStorage';
import { parseQueryParams, queryLogsFromParams, getLogStatsFromParams } from './logRouteHandler';

const LOG_API = false;

export function setupLogApiInterceptor(): void {
  if (typeof window === 'undefined') {
    return;
  }

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit) {
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;

    if (url.includes('/api/logs/')) {
      try {
        if (url.includes('/api/logs/query')) {
          const params = parseQueryParams(url);
          const logs = await queryLogsFromParams(params);
          return new Response(
            JSON.stringify({
              success: true,
              count: logs.length,
              logs,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }

        if (url.includes('/api/logs/stats')) {
          const stats = await getLogStatsFromParams();
          return new Response(
            JSON.stringify({
              success: true,
              stats,
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        }
      } catch (error) {
        return new Response(
          JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : 'Internal error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    }

    return originalFetch.call(this, input, init);
  };

  if (LOG_API) {
    console.log(
      '[Log API] Browser-side API interceptor active. /api/logs/* requests handled in browser.'
    );
  }
}

if (typeof window !== 'undefined') {
  const storage = getLogStorage();

  // Cast through unknown first to satisfy TypeScript strict type checking
  (window as unknown as Record<string, unknown>).__QUERY_LOGS__ = async (query: LogQuery = {}) => {
    return storage.queryLogs(query);
  };

  (window as unknown as Record<string, unknown>).__GET_LOG_STATS__ = async () => {
    return storage.getLogStats();
  };

  (window as unknown as Record<string, unknown>).__CLEAR_LOGS__ = async (query?: LogQuery) => {
    return storage.clearLogs(query);
  };

  if (LOG_API) {
    console.log(
      '[Log API] Log query functions available at window.__QUERY_LOGS__, window.__GET_LOG_STATS__, window.__CLEAR_LOGS__'
    );
  }
}


