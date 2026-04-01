import Database from 'better-sqlite3'
import path from 'path'
import { existsSync, mkdirSync } from 'fs'
import type { LogEntry } from '@ocentra/logging-domain/types/logEntry';
import type { LogQuery } from '@ocentra/logging-domain/types/logQuery';
import type { LogStats } from '@ocentra/logging-domain/types/logStats';
import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import type { LogOrigin } from '@ocentra/logging-domain/types/logOrigin';
import type { ILogStorage } from './logStorageInterface'

export class AnalyticsLogStorage implements ILogStorage {
  private db: Database.Database | null = null
  private dbPath: string

  constructor() {
    const dbDir = path.join(process.cwd(), 'database')
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
    }
    this.dbPath = path.join(dbDir, 'analytics.db')
  }

  private getDb(): Database.Database {
    if (!this.db) {
      this.db = new Database(this.dbPath)
      this.db.pragma('journal_mode = WAL')
      this.db.pragma('synchronous = NORMAL')
      this.db.pragma('cache_size = -64000')
      this.db.pragma('temp_store = memory')
      this.initializeSchema()
    }
    return this.db
  }

  private initializeSchema(): void {
    if (!this.db) return

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS logs (
        id TEXT PRIMARY KEY,
        level TEXT NOT NULL,
        context TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT NOT NULL,
        origin TEXT NOT NULL,
        timestamp INTEGER NOT NULL,

        -- Rich metadata (stored as JSON)
        args TEXT,
        stack TEXT,
        stack_frames TEXT,

        -- File location for debugging
        file TEXT,
        file_path TEXT,
        line INTEGER,
        column INTEGER,

        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_timestamp ON logs(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_source ON logs(source);
      CREATE INDEX IF NOT EXISTS idx_context ON logs(context);
      CREATE INDEX IF NOT EXISTS idx_origin ON logs(origin);
      CREATE INDEX IF NOT EXISTS idx_level_timestamp ON logs(level, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_source_timestamp ON logs(source, timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_origin_timestamp ON logs(origin, timestamp DESC);
    `)
  }

  storeLog(entry: LogEntry): void {
    try {
      const db = this.getDb()

      const stmt = db.prepare(`
        INSERT INTO logs (
          id, level, context, message, source, origin, timestamp,
          args, stack, stack_frames,
          file, file_path, line, column
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        entry.id,
        entry.level,
        entry.context,
        entry.message,
        entry.source,
        entry.origin,
        entry.timestamp,
        entry.args ? JSON.stringify(entry.args) : null,
        entry.stack || null,
        entry.stackFrames ? JSON.stringify(entry.stackFrames) : null,
        entry.file || null,
        entry.filePath || null,
        entry.line || null,
        entry.column || null
      )
    } catch (error) {
      process.stderr.write(
        `[AnalyticsLogStorage] Failed to store log: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }

  storeLogsBatch(entries: LogEntry[]): void {
    if (entries.length === 0) return

    try {
      const db = this.getDb()
      const stmt = db.prepare(`
        INSERT INTO logs (
          id, level, context, message, source, origin, timestamp,
          args, stack, stack_frames,
          file, file_path, line, column
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      const insertMany = db.transaction((logs: LogEntry[]) => {
        for (const entry of logs) {
          stmt.run(
            entry.id,
            entry.level,
            entry.context,
            entry.message,
            entry.source,
            entry.origin,
            entry.timestamp,
            entry.args ? JSON.stringify(entry.args) : null,
            entry.stack || null,
            entry.stackFrames ? JSON.stringify(entry.stackFrames) : null,
            entry.file || null,
            entry.filePath || null,
            entry.line || null,
            entry.column || null
          )
        }
      })

      insertMany(entries)
    } catch (error) {
      process.stderr.write(
        `[AnalyticsLogStorage] Failed to store logs batch: ${error instanceof Error ? error.message : String(error)}\n`
      );
    }
  }

  queryLogs(query: LogQuery = {}): LogEntry[] {
    try {
      const db = this.getDb()
      const conditions: string[] = []
      const params: unknown[] = []

      if (query.level) {
        conditions.push('level = ?')
        params.push(query.level)
      }

      if (query.source) {
        if (query.source.includes('%') || query.source.includes('*')) {
          const pattern = query.source.replace(/\*/g, '%')
          conditions.push('source LIKE ?')
          params.push(pattern)
        } else {
          conditions.push('source LIKE ?')
          params.push(`%${query.source}%`)
        }
      }

      if (query.context) {
        conditions.push('context LIKE ?')
        params.push(`%${query.context}%`)
      }

      if (query.since) {
        const sinceDate = new Date(query.since)
        conditions.push('timestamp >= ?')
        params.push(sinceDate.getTime())
      }

      if (query.until) {
        const untilDate = new Date(query.until)
        conditions.push('timestamp <= ?')
        params.push(untilDate.getTime())
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const limit = query.limit || 1000

      const sql = `
        SELECT 
          id, level, context, message, source, origin, timestamp,
          args, stack, stack_frames,
          file, file_path, line, column
        FROM logs
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT ?
      `

      const rows = db.prepare(sql).all(...params, limit) as Array<{
        id: string
        level: string
        context: string
        message: string
        source: string
        origin: string
        timestamp: number
        args: string | null
        stack: string | null
        stack_frames: string | null
        file: string | null
        file_path: string | null
        line: number | null
        column: number | null
      }>

      return rows.map(row => ({
        id: row.id,
        level: row.level as LogLevel,
        context: row.context,
        message: row.message,
        source: row.source,
        origin: row.origin as LogOrigin,
        timestamp: row.timestamp,
        args: row.args ? JSON.parse(row.args) : undefined,
        stack: row.stack || undefined,
        stackFrames: row.stack_frames ? JSON.parse(row.stack_frames) : undefined,
        file: row.file || undefined,
        filePath: row.file_path || undefined,
        line: row.line || undefined,
        column: row.column || undefined,
      }))
    } catch (error) {
      process.stderr.write(
        `[AnalyticsLogStorage] Failed to query logs: ${error instanceof Error ? error.message : String(error)}\n`
      );
      return [];
    }
  }

  getStats(sourcePrefix?: string): LogStats {
    try {
      const db = this.getDb()
      let sql = 'SELECT level, source, context, timestamp FROM logs'
      const params: unknown[] = []

      if (sourcePrefix) {
        sql += ' WHERE source LIKE ?'
        params.push(`${sourcePrefix}%`)
      }

      const rows = db.prepare(sql).all(...params) as Array<{
        level: string
        source: string
        context: string
        timestamp: number
      }>

      const stats: LogStats = {
        total_logs: rows.length,
        by_level: {} as Record<LogLevel, number>,
        by_source: {},
        by_context: {},
        oldest_timestamp: null,
        newest_timestamp: null,
      }

      const timestamps: number[] = []

      const byContext = stats.by_context ?? {}
      for (const row of rows) {
        stats.by_level[row.level as LogLevel] = (stats.by_level[row.level as LogLevel] || 0) + 1
        stats.by_source[row.source] = (stats.by_source[row.source] || 0) + 1
        byContext[row.context] = (byContext[row.context] || 0) + 1
        timestamps.push(row.timestamp)
      }
      stats.by_context = byContext

      if (timestamps.length > 0) {
        stats.oldest_timestamp = Math.min(...timestamps)
        stats.newest_timestamp = Math.max(...timestamps)
      }

      return stats
    } catch (error) {
      process.stderr.write(
        `[AnalyticsLogStorage] Failed to get stats: ${error instanceof Error ? error.message : String(error)}\n`
      );
      return {
        total_logs: 0,
        by_level: {} as Record<LogLevel, number>,
        by_source: {},
        by_context: {},
        oldest_timestamp: null,
        newest_timestamp: null,
      }
    }
  }

  clearLogs(query?: LogQuery): number {
    try {
      const db = this.getDb()
      const conditions: string[] = []
      const params: unknown[] = []

      if (query?.level) {
        conditions.push('level = ?')
        params.push(query.level)
      }

      if (query?.source) {
        conditions.push('source LIKE ?')
        params.push(`%${query.source}%`)
      }

      if (query?.context) {
        conditions.push('context LIKE ?')
        params.push(`%${query.context}%`)
      }

      if (query?.since) {
        const sinceDate = new Date(query.since)
        conditions.push('timestamp >= ?')
        params.push(sinceDate.getTime())
      }

      if (query?.until) {
        const untilDate = new Date(query.until)
        conditions.push('timestamp <= ?')
        params.push(untilDate.getTime())
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
      const sql = `DELETE FROM logs ${whereClause}`

      const result = db.prepare(sql).run(...params)
      return result.changes
    } catch (error) {
      process.stderr.write(
        `[AnalyticsLogStorage] Failed to clear logs: ${error instanceof Error ? error.message : String(error)}\n`
      );
      return 0;
    }
  }

  executeSql(sql: string): unknown[] {
    try {
      const db = this.getDb()
      return db.prepare(sql).all() as unknown[]
    } catch (error) {
      throw new Error(`SQL execution failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

let analyticsLogStorageInstance: AnalyticsLogStorage | null = null

export function getAnalyticsLogStorage(): AnalyticsLogStorage {
  if (!analyticsLogStorageInstance) {
    analyticsLogStorageInstance = new AnalyticsLogStorage()
  }
  return analyticsLogStorageInstance
}

