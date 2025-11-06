/**
 * Log API - Browser-side handler
 * 
 * Intercepts fetch requests to /api/logs/* and handles them in the browser.
 * This allows querying IndexedDB directly.
 */

import { getLogStorage, type LogQuery } from './logStorage';
import { parseQueryParams, queryLogsFromParams, getLogStatsFromParams } from './logRouteHandler';

// Logging flag - set to true to enable console logging for Log API
const LOG_API = false

/**
 * Intercept fetch requests to /api/logs/* and handle them in browser
 */
export function setupLogApiInterceptor(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  const originalFetch = window.fetch;
  
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    
    // Intercept /api/logs/* requests and handle in browser
    if (url.includes('/api/logs/')) {
      try {
        // Parse the request
        if (url.includes('/api/logs/query')) {
          // Parse query parameters from URL
          const params = parseQueryParams(url);
          
          // Query IndexedDB
          const logs = await queryLogsFromParams(params);
          
          // Return response as if from server
          return new Response(JSON.stringify({
            success: true,
            count: logs.length,
            logs,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        
        if (url.includes('/api/logs/stats')) {
          // Get statistics from IndexedDB
          const stats = await getLogStatsFromParams();
          
          // Return response as if from server
          return new Response(JSON.stringify({
            success: true,
            stats,
          }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Internal error',
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // For all other requests, use original fetch
    return originalFetch.call(this, input, init);
  };
  
  if (LOG_API) console.log('[Log API] Browser-side API interceptor active. /api/logs/* requests handled in browser.');
}

/**
 * Expose functions globally for direct access
 */
if (typeof window !== 'undefined') {
  const storage = getLogStorage();
  
  (window as any).__QUERY_LOGS__ = async (query: LogQuery = {}) => {
    return await storage.queryLogs(query);
  };
  
  (window as any).__GET_LOG_STATS__ = async () => {
    return await storage.getLogStats();
  };
  
  (window as any).__CLEAR_LOGS__ = async (query?: LogQuery) => {
    return await storage.clearLogs(query);
  };
  
  if (LOG_API) console.log('[Log API] Log query functions available at window.__QUERY_LOGS__, window.__GET_LOG_STATS__, window.__CLEAR_LOGS__');
}
