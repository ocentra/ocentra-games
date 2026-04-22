import {
  loadDuckDb,
  runAsync,
  allAsync,
  closeConnAsync,
  closeDbAsync,
  type DuckDbConnection,
  type DuckDbDatabase,
} from './duckDbHelpers';
import type { LogEntry } from '../types/logEntry';
import type { LogQuery } from '../types/logQuery';
import type { LogStats } from '../types/logStats';
import { LogLevel } from '../types/logLevel';
import { DEFAULT_DB_DIR } from '../core/constants';

// Helper to get Node modules safely in Vite/Browser environments
function getNodeModule<T>(name: string): T | null {
  if (typeof process === 'undefined' || !process.versions?.node) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(name);
  } catch {
    return null;
  }
}

const fs = getNodeModule<typeof import('fs')>('fs');
const path = getNodeModule<typeof import('path')>('path');

const APP_LOG_LEVELS = ['error', 'warn', 'info', 'debug', 'log'] as const;

function logTimestampToIso(ms: number): string {
  return new Date(ms).toISOString();
}

function parseSinceToMs(since: string | undefined): number | null {
  if (!since) return null;
  const n = parseInt(since, 10);
  if (!Number.isNaN(n) && since === String(n)) return n;
  if (since.endsWith('h')) return (parseInt(since, 10) || 1) * 3600000;
  if (since.endsWith('m')) return (parseInt(since, 10) || 1) * 60000;
  if (since.endsWith('s')) return (parseInt(since, 10) || 1) * 1000;
  if (since.endsWith('d')) return (parseInt(since, 10) || 1) * 86400000;
  return null;
}

function schemaSql(): string {
  const levels = APP_LOG_LEVELS.map((x) => `'${x}'`).join(', ');
  return `
    CREATE TABLE IF NOT EXISTS app_logs (
      id            VARCHAR NOT NULL,
      level         VARCHAR NOT NULL CHECK(level IN (${levels})),
      context       VARCHAR NOT NULL DEFAULT '',
      message       VARCHAR NOT NULL,
      source        VARCHAR NOT NULL DEFAULT '',
      origin        VARCHAR NOT NULL DEFAULT 'browser',
      timestamp     BIGINT  NOT NULL,
      timestamp_iso VARCHAR NOT NULL,
      args          VARCHAR,
      stack         VARCHAR,
      file          VARCHAR,
      file_path     VARCHAR,
      line          BIGINT,
      "column"      BIGINT,
      PRIMARY KEY (id)
    );

    CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);
    CREATE INDEX IF NOT EXISTS idx_app_logs_source ON app_logs(source);
    CREATE INDEX IF NOT EXISTS idx_app_logs_context ON app_logs(context);
    CREATE INDEX IF NOT EXISTS idx_app_logs_origin ON app_logs(origin);
    CREATE INDEX IF NOT EXISTS idx_app_logs_level_timestamp ON app_logs(level, timestamp);
    CREATE INDEX IF NOT EXISTS idx_app_logs_source_timestamp ON app_logs(source, timestamp);
  `;
}

function rowToLogEntry(r: Record<string, unknown>): LogEntry {
  const col = r.column ?? r['column'];
  const argsRaw = r.args;
  let args: unknown[] | undefined;
  if (argsRaw != null && typeof argsRaw === 'string') {
    try {
      const parsed = JSON.parse(argsRaw);
      args = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      args = undefined;
    }
  }
  return {
    id: String(r.id ?? ''),
    level: String(r.level ?? 'info') as LogEntry['level'],
    context: String(r.context ?? ''),
    message: String(r.message ?? ''),
    source: String(r.source ?? ''),
    origin: String(r.origin ?? 'browser') as LogEntry['origin'],
    timestamp: Number(r.timestamp ?? 0),
    args,
    stack: r.stack != null ? String(r.stack) : undefined,
    file: r.file != null ? String(r.file) : undefined,
    filePath: r.file_path != null ? String(r.file_path) : undefined,
    line: r.line != null ? Number(r.line) : undefined,
    column: col != null ? Number(col) : undefined,
  };
}

export function getDefaultAppDbPath(scope: string, dbDir?: string): string {
  if (!path) return '';
  const dir = dbDir ?? DEFAULT_DB_DIR;
  if (fs && dir) {
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn(`[AppLogDuckDb] Failed to create directory ${dir}:`, err);
      }
    }
  }
  return path.join(dir, `${scope}-log.duckdb`);
}

export class AppLogDuckDb {
  private db: DuckDbDatabase;
  private conn: DuckDbConnection;
  private constructor(db: DuckDbDatabase, conn: DuckDbConnection) {
    this.db = db;
    this.conn = conn;
  }

  static async create(dbPath: string): Promise<AppLogDuckDb> {
    if (!path || !fs) {
      throw new Error('AppLogDuckDb requires Node.js environment.');
    }
    const dir = path.dirname(dbPath);
    if (dir && !fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err) {
        console.warn(`[AppLogDuckDb] Failed to create directory ${dir}:`, err);
      }
    }
    const DuckDb = loadDuckDb();
    const db = await new Promise<DuckDbDatabase>((resolve, reject) => {
      const d = new DuckDb.Database(dbPath, (err: Error | null) => {
        if (err) reject(err);
        else resolve(d);
      });
    });
    const conn = db.connect();
    const sql = schemaSql();
    const statements = sql
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      await runAsync(conn, stmt + ';');
    }
    return new AppLogDuckDb(db, conn);
  }

  async insertBatch(entries: LogEntry[]): Promise<number> {
    if (entries.length === 0) return 0;
    const BATCH_SIZE = 50;
    const cols =
      'id, level, context, message, source, origin, timestamp, timestamp_iso, args, stack, file, file_path, line, "column"';
    const row = '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    let inserted = 0;
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
      const chunk = entries.slice(i, i + BATCH_SIZE);
      const placeholders = chunk.map(() => row).join(', ');
      const params: unknown[] = [];
      for (const e of chunk) {
        params.push(
          e.id,
          e.level,
          e.context ?? '',
          e.message,
          e.source ?? '',
          e.origin ?? 'browser',
          e.timestamp,
          logTimestampToIso(e.timestamp),
          e.args != null ? JSON.stringify(e.args) : null,
          e.stack ?? null,
          e.file ?? null,
          e.filePath ?? null,
          e.line ?? null,
          e.column ?? null
        );
      }
      await runAsync(
        this.conn,
        `INSERT INTO app_logs (${cols}) VALUES ${placeholders} ON CONFLICT (id) DO NOTHING`,
        ...params
      );
      inserted += chunk.length;
    }
    return inserted;
  }

  async queryLogs(query?: LogQuery): Promise<LogEntry[]> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (query?.level) {
      conditions.push('level = ?');
      params.push(query.level);
    }
    if (query?.source) {
      conditions.push('source LIKE ?');
      params.push(`%${query.source}%`);
    }
    if (query?.context) {
      conditions.push('context LIKE ?');
      params.push(`%${query.context}%`);
    }
    const sinceMs = parseSinceToMs(query?.since);
    if (sinceMs != null) {
      const cutoff = Date.now() - sinceMs;
      conditions.push('timestamp >= ?');
      params.push(cutoff);
    }
    if (query?.until) {
      const untilMs = parseInt(query.until, 10) || Date.now();
      conditions.push('timestamp <= ?');
      params.push(untilMs);
    }
    const limit = Math.min(query?.limit ?? 100, 1000);
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const sql = `SELECT * FROM app_logs ${whereClause} ORDER BY timestamp DESC LIMIT ?`;
    params.push(limit);
    const rows = await allAsync(this.db, sql, ...params);
    return rows.map(rowToLogEntry);
  }

  async getStats(sourcePrefix?: string): Promise<LogStats> {
    const conditions = sourcePrefix ? ['source LIKE ?'] : [];
    const params: unknown[] = sourcePrefix ? [`${sourcePrefix}%`] : [];
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countSql = `SELECT COUNT(*)::BIGINT as total FROM app_logs ${whereClause}`;
    const countRows = await allAsync(this.db, countSql, ...params);
    const total_logs = Number((countRows[0] as Record<string, unknown>)?.total ?? 0);

    const byLevelSql = `SELECT level, COUNT(*)::BIGINT as cnt FROM app_logs ${whereClause} GROUP BY level`;
    const byLevelRows = await allAsync(this.db, byLevelSql, ...params);
    const by_level: Record<string, number> = {
      [LogLevel.Info]: 0,
      [LogLevel.Log]: 0,
      [LogLevel.Warn]: 0,
      [LogLevel.Error]: 0,
      [LogLevel.Debug]: 0,
    };
    for (const r of byLevelRows) {
      const level = String(r.level ?? '');
      const cnt = Number(r.cnt ?? 0);
      if (level in by_level) by_level[level] = cnt;
      else by_level[level] = cnt;
    }

    const bySourceSql = `SELECT source, COUNT(*)::BIGINT as cnt FROM app_logs ${whereClause} GROUP BY source`;
    const bySourceRows = await allAsync(this.db, bySourceSql, ...params);
    const by_source: Record<string, number> = {};
    for (const r of bySourceRows) {
      by_source[String(r.source ?? '')] = Number(r.cnt ?? 0);
    }

    const byContextSql = `SELECT context, COUNT(*)::BIGINT as cnt FROM app_logs ${whereClause} GROUP BY context`;
    const byContextRows = await allAsync(this.db, byContextSql, ...params);
    const by_context: Record<string, number> = {};
    for (const r of byContextRows) {
      by_context[String(r.context ?? '')] = Number(r.cnt ?? 0);
    }

    const rangeSql = `SELECT MIN(timestamp)::BIGINT as oldest, MAX(timestamp)::BIGINT as newest FROM app_logs ${whereClause}`;
    const rangeRows = await allAsync(this.db, rangeSql, ...params);
    const r0 = rangeRows[0] as Record<string, unknown> | undefined;
    const oldest_timestamp = r0?.oldest != null ? Number(r0.oldest) : null;
    const newest_timestamp = r0?.newest != null ? Number(r0.newest) : null;

    return {
      total_logs,
      by_level: by_level as LogStats['by_level'],
      by_source,
      by_context,
      oldest_timestamp,
      newest_timestamp,
    };
  }

  async clearLogs(): Promise<number> {
    const countRows = await allAsync(this.db, 'SELECT COUNT(*)::BIGINT as n FROM app_logs');
    const n = Number((countRows[0] as Record<string, unknown>)?.n ?? 0);
    await runAsync(this.conn, 'DELETE FROM app_logs');
    return n;
  }

  async searchLogs(
    query: string,
    options?: { limit?: number; level?: string; since?: string }
  ): Promise<LogEntry[]> {
    const conditions = ['message LIKE ?'];
    const params: unknown[] = [`%${query}%`];
    const limit = Math.min(options?.limit ?? 100, 1000);
    if (options?.level) {
      conditions.push('level = ?');
      params.push(options.level);
    }
    const sinceMs = parseSinceToMs(options?.since);
    if (sinceMs != null) {
      conditions.push('timestamp >= ?');
      params.push(Date.now() - sinceMs);
    }
    params.push(limit);
    const sql = `SELECT * FROM app_logs WHERE ${conditions.join(' AND ')} ORDER BY timestamp DESC LIMIT ?`;
    const rows = await allAsync(this.db, sql, ...params);
    return rows.map(rowToLogEntry);
  }

  async getRowCount(): Promise<number> {
    const rows = await allAsync(this.db, 'SELECT COUNT(*)::BIGINT as n FROM app_logs');
    return Number((rows[0] as Record<string, unknown>)?.n ?? 0);
  }

  async close(): Promise<void> {
    await closeConnAsync(this.conn);
    await closeDbAsync(this.db);
  }
}
