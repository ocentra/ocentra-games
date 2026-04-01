/**
 * Test Log Storage - Wrapper for cloudflare test-logs.db
 *
 * Provides access to Vitest test results and logs stored in SQLite.
 * Used by main MCP to query test failures, logs, and stats.
 */

import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'

// Path from project root (works in Vite middleware context)
const TEST_LOGS_DB_PATH = path.resolve(process.cwd(), 'infra/cloudflare/test-runner/logs/test-logs.db')

export interface TestRun {
  test_name: string
  test_file: string
  test_suite: string | null
  run_id: string
  run_type: 'single' | 'full'
  run_timestamp: number
  status: 'passed' | 'failed' | 'skipped' | 'timeout'
  duration_ms: number | null
  error_code: string | null
  error_message: string | null
  error_stack: string | null
  tags: string | null
}

export interface TestLog {
  test_name: string
  run_id: string
  log_timestamp: number
  level: 'error' | 'warn' | 'info' | 'debug'
  source: string | null
  context: string | null
  message: string
  data: string | null
  file: string | null
  file_path: string | null
  line: number | null
  column: number | null
  correlation_id: string | null
  tags: string | null
  stack: string | null
}

class TestLogStorage {
  private db: Database.Database | null = null

  private getDb(): Database.Database {
    if (!this.db) {
      if (!fs.existsSync(TEST_LOGS_DB_PATH)) {
        throw new Error(`Test logs database not found: ${TEST_LOGS_DB_PATH}`)
      }
      this.db = new Database(TEST_LOGS_DB_PATH, { readonly: true })
    }
    return this.db
  }

  isAvailable(): boolean {
    return fs.existsSync(TEST_LOGS_DB_PATH)
  }

  getFailedTests(filters?: {
    test_file?: string
    run_id?: string
    run_type?: 'single' | 'full'
    error_code?: string
    limit?: number
  }): TestRun[] {
    const db = this.getDb()
    const conditions: string[] = ["status IN ('failed', 'timeout')"]
    const params: unknown[] = []

    if (filters?.test_file) {
      conditions.push('test_file = ?')
      params.push(filters.test_file)
    }
    if (filters?.run_id) {
      conditions.push('run_id = ?')
      params.push(filters.run_id)
    }
    if (filters?.run_type) {
      conditions.push('run_type = ?')
      params.push(filters.run_type)
    }
    if (filters?.error_code) {
      conditions.push('error_code = ?')
      params.push(filters.error_code)
    }

    const limit = filters?.limit || 50
    const sql = `SELECT * FROM test_runs WHERE ${conditions.join(' AND ')} ORDER BY run_timestamp DESC LIMIT ?`
    params.push(limit)

    return db.prepare(sql).all(...params) as TestRun[]
  }

  getTestsByRunId(runId: string): TestRun[] {
    const db = this.getDb()
    return db.prepare(`
      SELECT * FROM test_runs
      WHERE run_id = ?
      ORDER BY test_file, test_suite, test_name
    `).all(runId) as TestRun[]
  }

  getTestLogs(testName: string, runId: string, filters?: {
    level?: string
    context?: string
    limit?: number
  }): TestLog[] {
    const db = this.getDb()
    const conditions: string[] = ['test_name = ?', 'run_id = ?']
    const params: unknown[] = [testName, runId]

    if (filters?.level) {
      conditions.push('level = ?')
      params.push(filters.level)
    }
    if (filters?.context) {
      conditions.push('context LIKE ?')
      params.push(`%${filters.context}%`)
    }

    const limit = filters?.limit || 100
    const sql = `SELECT * FROM test_logs WHERE ${conditions.join(' AND ')} ORDER BY log_timestamp ASC LIMIT ?`
    params.push(limit)

    return db.prepare(sql).all(...params) as TestLog[]
  }

  searchLogs(query: string, runId?: string, limit?: number): TestLog[] {
    const db = this.getDb()
    const conditions: string[] = ['message LIKE ?']
    const params: unknown[] = [`%${query}%`]

    if (runId) {
      conditions.push('run_id = ?')
      params.push(runId)
    }

    const sql = `SELECT * FROM test_logs WHERE ${conditions.join(' AND ')} ORDER BY log_timestamp DESC LIMIT ?`
    params.push(limit || 50)

    return db.prepare(sql).all(...params) as TestLog[]
  }

  getTestStats(runId?: string): {
    total: number
    passed: number
    failed: number
    skipped: number
    timeout: number
    by_error_code: Record<string, number>
  } {
    const db = this.getDb()
    const conditions: string[] = []
    const params: unknown[] = []

    if (runId) {
      conditions.push('run_id = ?')
      params.push(runId)
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
    const stats = db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END) as passed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END) as skipped,
        SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END) as timeout
      FROM test_runs
      ${whereClause}
    `).get(...params) as {
      total: number
      passed: number
      failed: number
      skipped: number
      timeout: number
    }

    const errorCodeWhereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')} AND error_code IS NOT NULL`
      : 'WHERE error_code IS NOT NULL'
    const errorCodes = db.prepare(`
      SELECT error_code, COUNT(*) as count
      FROM test_runs
      ${errorCodeWhereClause}
      GROUP BY error_code
    `).all(...params) as { error_code: string; count: number }[]

    const by_error_code: Record<string, number> = {}
    for (const row of errorCodes) {
      by_error_code[row.error_code] = row.count
    }

    return {
      total: stats.total || 0,
      passed: stats.passed || 0,
      failed: stats.failed || 0,
      skipped: stats.skipped || 0,
      timeout: stats.timeout || 0,
      by_error_code,
    }
  }

  getLatestRunId(): string | null {
    const db = this.getDb()
    const result = db.prepare(`
      SELECT run_id FROM test_runs
      ORDER BY run_timestamp DESC
      LIMIT 1
    `).get() as { run_id: string } | undefined
    return result?.run_id ?? null
  }

  close(): void {
    if (this.db) {
      this.db.close()
      this.db = null
    }
  }
}

let instance: TestLogStorage | null = null

export function getTestLogStorage(): TestLogStorage {
  if (!instance) {
    instance = new TestLogStorage()
  }
  return instance
}
