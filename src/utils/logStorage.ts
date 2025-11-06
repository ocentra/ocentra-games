/**
 * Log Storage System
 * 
 * Provides persistent IndexedDB storage for application logs, similar to the Rust MCP pattern.
 * Allows querying logs by level, source, context, and time range.
 */

// Log entry structure matching Rust MCP pattern
export interface LogEntry {
  id: string;              // Unique ID (timestamp + random)
  level: LogLevel;         // Log level (log, error, warn, info, debug)
  context: string;         // Context/module name (e.g., "AuthProvider", "FirebaseService")
  message: string;         // Log message
  source: LogSource;        // Source type (Auth, Network, Assets, etc.)
  timestamp: number;        // Timestamp in milliseconds
  args?: unknown[];         // Additional arguments passed to log
  stack?: string;          // Stack trace for errors
  tags?: string[];         // Tags for filtering (e.g., ["auth", "critical"])
}

export type LogLevel = 'log' | 'error' | 'warn' | 'info' | 'debug';
export type LogSource = 'Auth' | 'Network' | 'Assets' | 'GameEngine' | 'UI' | 'Store' | 'System' | 'Other';

// Query parameters for filtering logs
export interface LogQuery {
  level?: LogLevel;        // Filter by log level
  context?: string;        // Filter by context (partial match)
  source?: LogSource;       // Filter by source
  since?: string;          // RFC3339 timestamp (e.g., "2025-10-31T10:00:00Z")
  limit?: number;           // Maximum number of results (1-10000, default 1000)
}

// Log statistics
export interface LogStats {
  total_logs: number;
  by_level: Record<LogLevel, number>;
  by_source: Record<LogSource, number>;
  by_context: Record<string, number>;
  oldest_timestamp: number | null;
  newest_timestamp: number | null;
}

/**
 * IndexedDB-based log storage
 */
export class LogStorage {
  private dbName = 'ClaimLogs';
  private storeName = 'logs';
  private version = 1;
  private db: IDBDatabase | null = null;
  private initialized = false;

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    if (this.initialized && this.db) {
      return;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open IndexedDB: ${request.error}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.initialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('level', 'level', { unique: false });
          store.createIndex('source', 'source', { unique: false });
          store.createIndex('context', 'context', { unique: false });
          // Compound index for common queries
          store.createIndex('level_timestamp', ['level', 'timestamp'], { unique: false });
          store.createIndex('source_timestamp', ['source', 'timestamp'], { unique: false });
        }
      };
    });
  }

  /**
   * Store a log entry
   */
  async storeLog(entry: Omit<LogEntry, 'id'>): Promise<void> {
    try {
      await this.initialize();
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      const logEntry: LogEntry = {
        ...entry,
        id: `${entry.timestamp}-${Math.random().toString(36).substr(2, 9)}`,
      };

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.add(logEntry);

        request.onerror = () => {
          reject(new Error(`Failed to store log: ${request.error}`));
        };

        request.onsuccess = () => {
          resolve();
        };
      });
    } catch (error) {
      // Silently fail - don't break the app if log storage fails
      console.warn('[LogStorage] Failed to store log:', error);
    }
  }

  /**
   * Query logs based on criteria
   */
  async queryLogs(query: LogQuery = {}): Promise<LogEntry[]> {
    try {
      await this.initialize();
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // Validate limit
      const limit = query.limit ?? 1000;
      if (limit === 0 || limit > 10000) {
        throw new Error('limit must be between 1 and 10000');
      }

      // Parse since timestamp if provided
      let sinceTimestamp: number | null = null;
      if (query.since) {
        // Check if it's a relative time (e.g., "1h", "24h", "7d")
        const relativeMatch = query.since.match(/^(\d+)([hdms])$/);
        if (relativeMatch) {
          const value = parseInt(relativeMatch[1], 10);
          const unit = relativeMatch[2];
          let ms = 0;
          switch (unit) {
            case 's': ms = value * 1000; break;
            case 'm': ms = value * 60 * 1000; break;
            case 'h': ms = value * 60 * 60 * 1000; break;
            case 'd': ms = value * 24 * 60 * 60 * 1000; break;
          }
          sinceTimestamp = Date.now() - ms;
        } else {
          // Try to parse as RFC3339 timestamp
          const date = new Date(query.since);
          if (isNaN(date.getTime())) {
            throw new Error(`Invalid timestamp format: ${query.since}. Expected RFC3339 (e.g., "2025-01-01T00:00:00Z") or relative time (e.g., "1h", "24h", "7d")`);
          }
          sinceTimestamp = date.getTime();
        }
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readonly');
        const store = transaction.objectStore(this.storeName);
        
        // Use timestamp index for efficient sorting
        const index = store.index('timestamp');
        const request = index.openCursor(null, 'prev'); // Reverse order (newest first)
        
        const results: LogEntry[] = [];
        let scanCount = 0;
        const MAX_SCAN = 100000; // Prevent infinite loops

        request.onerror = () => {
          reject(new Error(`Failed to query logs: ${request.error}`));
        };

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (scanCount >= MAX_SCAN) {
            console.warn('[LogStorage] Query exceeded max scan limit');
            resolve(results);
            return;
          }

          if (!cursor) {
            // No more entries
            resolve(results);
            return;
          }

          scanCount++;
          const entry = cursor.value as LogEntry;

          // Apply filters
          if (this.matchesQuery(entry, query, sinceTimestamp)) {
            results.push(entry);
          }

          // Continue if we need more results
          if (results.length < limit) {
            cursor.continue();
          } else {
            resolve(results);
          }
        };
      });
    } catch (error) {
      console.error('[LogStorage] Query error:', error);
      return [];
    }
  }

  /**
   * Check if a log entry matches query criteria
   */
  private matchesQuery(
    entry: LogEntry,
    query: LogQuery,
    sinceTimestamp: number | null
  ): boolean {
    // Filter by level
    if (query.level && entry.level !== query.level) {
      return false;
    }

    // Filter by source
    if (query.source && entry.source !== query.source) {
      return false;
    }

    // Filter by context (partial match)
    if (query.context && !entry.context.toLowerCase().includes(query.context.toLowerCase())) {
      return false;
    }

    // Filter by timestamp
    if (sinceTimestamp !== null && entry.timestamp < sinceTimestamp) {
      return false;
    }

    return true;
  }

  /**
   * Get log statistics
   */
  async getLogStats(): Promise<LogStats> {
    try {
      const allLogs = await this.queryLogs({ limit: 10000 });
      
      const stats: LogStats = {
        total_logs: allLogs.length,
        by_level: {
          log: 0,
          error: 0,
          warn: 0,
          info: 0,
          debug: 0,
        },
        by_source: {
          Auth: 0,
          Network: 0,
          Assets: 0,
          GameEngine: 0,
          UI: 0,
          Store: 0,
          System: 0,
          Other: 0,
        },
        by_context: {},
        oldest_timestamp: null,
        newest_timestamp: null,
      };

      for (const log of allLogs) {
        // Count by level
        stats.by_level[log.level]++;

        // Count by source
        stats.by_source[log.source]++;

        // Count by context
        stats.by_context[log.context] = (stats.by_context[log.context] || 0) + 1;

        // Track timestamps
        if (stats.oldest_timestamp === null || log.timestamp < stats.oldest_timestamp) {
          stats.oldest_timestamp = log.timestamp;
        }
        if (stats.newest_timestamp === null || log.timestamp > stats.newest_timestamp) {
          stats.newest_timestamp = log.timestamp;
        }
      }

      return stats;
    } catch (error) {
      console.error('[LogStorage] Failed to get stats:', error);
      return {
        total_logs: 0,
        by_level: { log: 0, error: 0, warn: 0, info: 0, debug: 0 },
        by_source: { Auth: 0, Network: 0, Assets: 0, GameEngine: 0, UI: 0, Store: 0, System: 0, Other: 0 },
        by_context: {},
        oldest_timestamp: null,
        newest_timestamp: null,
      };
    }
  }

  /**
   * Clear logs (optionally filtered)
   */
  async clearLogs(query?: LogQuery): Promise<number> {
    try {
      await this.initialize();
      if (!this.db) {
        throw new Error('Database not initialized');
      }

      // If query provided, delete matching logs
      if (query) {
        const logsToDelete = await this.queryLogs({ ...query, limit: 10000 });
        let deleted = 0;

        for (const log of logsToDelete) {
          await new Promise<void>((resolve, reject) => {
            const transaction = this.db!.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(log.id);

            request.onerror = () => {
              reject(new Error(`Failed to delete log: ${request.error}`));
            };

            request.onsuccess = () => {
              deleted++;
              resolve();
            };
          });
        }

        return deleted;
      }

      // Otherwise, clear all logs
      return new Promise((resolve, reject) => {
        const transaction = this.db!.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        const request = store.clear();

        request.onerror = () => {
          reject(new Error(`Failed to clear logs: ${request.error}`));
        };

        request.onsuccess = () => {
          // Count is not available, so we'll need to query first
          this.queryLogs({ limit: 10000 }).then((logs) => {
            resolve(logs.length);
          }).catch(reject);
        };
      });
    } catch (error) {
      console.error('[LogStorage] Failed to clear logs:', error);
      return 0;
    }
  }
}

// Singleton instance
let logStorageInstance: LogStorage | null = null;

/**
 * Get the global log storage instance
 */
export function getLogStorage(): LogStorage {
  if (!logStorageInstance) {
    logStorageInstance = new LogStorage();
  }
  return logStorageInstance;
}

