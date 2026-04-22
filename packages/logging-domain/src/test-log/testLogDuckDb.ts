import type { TestRun, TestLog, RunType, TestSuiteType, NdjsonLogEntry } from './types';
import { asTestSuiteTypeOrNull, asLogOriginOrNull, NdjsonLineType, LogRealm } from './types';
import { ndjsonEntryToTestLog } from './bridgeConvert';
import { DEFAULT_DB_DIR } from '../core/constants';
import {
  loadDuckDb,
  runAsync,
  allAsync,
  closeConnAsync,
  closeDbAsync,
  type DuckDbConnection,
  type DuckDbDatabase,
} from '../app-log/duckDbHelpers';

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

function readNdjsonFile(filePath: string): NdjsonLogEntry[] {
  if (!fs || !fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.trim().split('\n').filter((line: string) => line.trim());
  return lines.map((line: string) => JSON.parse(line) as NdjsonLogEntry);
}

export const DEFAULT_DB_FILENAME = 'log.duckdb';

export const LOG_DB_DOMAIN_ENV = 'LOG_DB_DOMAIN';
export const DEFAULT_DOMAIN: LogRealm = LogRealm.Cloudflare;

export function getDefaultDbPath(domain?: string): string {
  if (!fs || !path) return '';
  if (!fs.existsSync(DEFAULT_DB_DIR)) {
    fs.mkdirSync(DEFAULT_DB_DIR, { recursive: true });
  }
  const effective = domain ?? (typeof process !== 'undefined' ? process.env[LOG_DB_DOMAIN_ENV] : null) ?? DEFAULT_DOMAIN;
  const filename = `${effective}-log.duckdb`;
  return path.join(DEFAULT_DB_DIR, filename);
}

export interface TestLogDuckDbOptions {
  dbPath: string;
}

const RUN_TYPES: readonly string[] = ['single', 'full', 'single-pool', 'single-threads'];
const RUN_STATUSES: readonly string[] = ['passed', 'failed', 'unstable', 'timeout', 'unknown'];
const INGEST_SOURCES: readonly string[] = ['ndjson', 'live'];
const LOG_LEVELS: readonly string[] = ['error', 'warn', 'info', 'debug'];
const SUITE_TYPES: readonly string[] = ['unit', 'integration', 'e2e', 'websocket', 'contract'];
const ORIGINS: readonly string[] = ['test', 'worker'];

export const LOG_INSERT_BATCH_SIZE = 500;

function logTimestampToIso(ms: number): string {
  return new Date(ms).toISOString();
}

async function migrateAddRealmEnvironment(conn: DuckDbConnection): Promise<void> {
  const alters = [
    'ALTER TABLE test_runs ADD COLUMN realm VARCHAR',
    'ALTER TABLE test_runs ADD COLUMN environment VARCHAR',
    'ALTER TABLE test_logs ADD COLUMN realm VARCHAR',
    'ALTER TABLE test_logs ADD COLUMN environment VARCHAR',
  ];
  for (const sql of alters) {
    try {
      await runAsync(conn, sql);
    } catch {
      // Column may already exist from fresh schema
    }
  }
}

async function migrateAddIngestSource(conn: DuckDbConnection): Promise<void> {
  try {
    await runAsync(conn, 'ALTER TABLE test_runs ADD COLUMN ingest_source VARCHAR');
  } catch {
    // Column may already exist
  }
}

function schemaSql(): string {
  return `
    CREATE TABLE IF NOT EXISTS test_runs (
      test_id VARCHAR NOT NULL,
      test_full_name VARCHAR NOT NULL,
      test_name VARCHAR NOT NULL,
      test_file VARCHAR NOT NULL,
      test_suite VARCHAR,
      run_id VARCHAR NOT NULL,
      run_type VARCHAR NOT NULL CHECK(run_type IN (${RUN_TYPES.map((x) => `'${x}'`).join(', ')})),
      run_timestamp BIGINT NOT NULL,
      status VARCHAR NOT NULL CHECK(status IN (${RUN_STATUSES.map((x) => `'${x}'`).join(', ')})),
      duration_ms BIGINT,
      error_code VARCHAR,
      error_message VARCHAR,
      error_stack VARCHAR,
      tags VARCHAR,
      realm VARCHAR,
      environment VARCHAR,
      ingest_source VARCHAR CHECK(ingest_source IS NULL OR ingest_source IN (${INGEST_SOURCES.map((x) => `'${x}'`).join(', ')})),
      created_at BIGINT DEFAULT (CAST(epoch(now()) AS BIGINT)),
      PRIMARY KEY (test_id, run_id)
    );

    CREATE TABLE IF NOT EXISTS test_logs (
      test_id VARCHAR NOT NULL,
      test_full_name VARCHAR NOT NULL,
      test_name VARCHAR NOT NULL,
      run_id VARCHAR NOT NULL,
      log_timestamp BIGINT NOT NULL,
      log_time_iso VARCHAR NOT NULL,
      level VARCHAR NOT NULL CHECK(level IN (${LOG_LEVELS.map((x) => `'${x}'`).join(', ')})),
      source VARCHAR,
      context VARCHAR,
      message VARCHAR NOT NULL,
      data VARCHAR,
      file VARCHAR,
      file_path VARCHAR,
      line BIGINT,
      "column" BIGINT,
      correlation_id VARCHAR,
      tags VARCHAR,
      stack VARCHAR,
      suite_path VARCHAR,
      suite_type VARCHAR CHECK(suite_type IN (${SUITE_TYPES.map((x) => `'${x}'`).join(', ')})),
      origin VARCHAR CHECK(origin IN (${ORIGINS.map((x) => `'${x}'`).join(', ')})),
      realm VARCHAR,
      environment VARCHAR,
      created_at BIGINT DEFAULT (CAST(epoch(now()) AS BIGINT))
    );

    CREATE TABLE IF NOT EXISTS test_terminal_dumps (
      run_id VARCHAR NOT NULL,
      test_id VARCHAR NOT NULL,
      terminal_dump VARCHAR NOT NULL,
      created_at BIGINT DEFAULT (CAST(epoch(now()) AS BIGINT)),
      PRIMARY KEY (run_id, test_id)
    );

    CREATE INDEX IF NOT EXISTS idx_test_runs_test_id ON test_runs(test_id);
    CREATE INDEX IF NOT EXISTS idx_test_runs_run_id ON test_runs(run_id);
    CREATE INDEX IF NOT EXISTS idx_test_runs_run_type ON test_runs(run_type);
    CREATE INDEX IF NOT EXISTS idx_test_runs_status ON test_runs(status);
    CREATE INDEX IF NOT EXISTS idx_test_runs_test_id_run_id ON test_runs(test_id, run_id);
    CREATE INDEX IF NOT EXISTS idx_test_runs_realm ON test_runs(realm);
    CREATE INDEX IF NOT EXISTS idx_test_runs_environment ON test_runs(environment);
    CREATE INDEX IF NOT EXISTS idx_test_runs_test_file ON test_runs(test_file);
    CREATE INDEX IF NOT EXISTS idx_test_runs_test_suite ON test_runs(test_suite);
    CREATE INDEX IF NOT EXISTS idx_test_runs_test_full_name ON test_runs(test_full_name);
    CREATE INDEX IF NOT EXISTS idx_test_runs_run_timestamp ON test_runs(run_timestamp);

    CREATE INDEX IF NOT EXISTS idx_test_logs_test_id ON test_logs(test_id);
    CREATE INDEX IF NOT EXISTS idx_test_logs_run_id ON test_logs(run_id);
    CREATE INDEX IF NOT EXISTS idx_test_logs_level ON test_logs(level);
    CREATE INDEX IF NOT EXISTS idx_test_logs_log_timestamp ON test_logs(log_timestamp);
    CREATE INDEX IF NOT EXISTS idx_test_logs_log_time_iso ON test_logs(log_time_iso);
    CREATE INDEX IF NOT EXISTS idx_test_logs_test_id_run_id ON test_logs(test_id, run_id);
    CREATE INDEX IF NOT EXISTS idx_test_logs_source ON test_logs(source);
    CREATE INDEX IF NOT EXISTS idx_test_logs_context ON test_logs(context);
    CREATE INDEX IF NOT EXISTS idx_test_logs_suite_path ON test_logs(suite_path);
    CREATE INDEX IF NOT EXISTS idx_test_logs_suite_type ON test_logs(suite_type);
    CREATE INDEX IF NOT EXISTS idx_test_logs_origin ON test_logs(origin);
    CREATE INDEX IF NOT EXISTS idx_test_logs_correlation_id ON test_logs(correlation_id);
    CREATE INDEX IF NOT EXISTS idx_test_logs_file ON test_logs(file);
    CREATE INDEX IF NOT EXISTS idx_test_logs_file_path ON test_logs(file_path);
    CREATE INDEX IF NOT EXISTS idx_test_logs_realm ON test_logs(realm);
    CREATE INDEX IF NOT EXISTS idx_test_logs_environment ON test_logs(environment);
    CREATE INDEX IF NOT EXISTS idx_test_logs_level_run_id ON test_logs(level, run_id);
    CREATE INDEX IF NOT EXISTS idx_test_logs_level_suite_type ON test_logs(level, suite_type);
    CREATE INDEX IF NOT EXISTS idx_test_logs_level_realm ON test_logs(level, realm);
    CREATE INDEX IF NOT EXISTS idx_test_logs_realm_log_timestamp ON test_logs(realm, log_timestamp);
    CREATE INDEX IF NOT EXISTS idx_test_logs_run_id_level ON test_logs(run_id, level);
    CREATE INDEX IF NOT EXISTS idx_test_logs_suite_type_level ON test_logs(suite_type, level);
    CREATE INDEX IF NOT EXISTS idx_test_logs_test_name_level ON test_logs(test_name, level);

    CREATE INDEX IF NOT EXISTS idx_terminal_dumps_run_id ON test_terminal_dumps(run_id);
  `;
}

export class TestLogDuckDb {
  private db: DuckDbDatabase;
  private conn: DuckDbConnection;
  private readonly dbPath: string;

  private constructor(db: DuckDbDatabase, conn: DuckDbConnection, dbPath: string) {
    this.db = db;
    this.conn = conn;
    this.dbPath = dbPath;
  }

  static async create(options: TestLogDuckDbOptions | string): Promise<TestLogDuckDb> {
    const dbPath = typeof options === 'string' ? options : options.dbPath;
    if (fs && path) {
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
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
    await migrateAddRealmEnvironment(conn);
    await migrateAddIngestSource(conn);
    return new TestLogDuckDb(db, conn, dbPath);
  }

  async close(): Promise<void> {
    await closeConnAsync(this.conn);
    await closeDbAsync(this.db);
  }

  async deleteByScope(runType: RunType, suiteType?: string | null): Promise<void> {
    if (suiteType != null && String(suiteType).trim() !== '') {
      await runAsync(
        this.conn,
        'DELETE FROM test_logs WHERE run_id IN (SELECT run_id FROM test_runs WHERE run_type = ? AND test_suite = ?)',
        runType,
        suiteType
      );
      await runAsync(this.conn, 'DELETE FROM test_runs WHERE run_type = ? AND test_suite = ?', runType, suiteType);
    } else {
      await runAsync(
        this.conn,
        'DELETE FROM test_logs WHERE run_id IN (SELECT run_id FROM test_runs WHERE run_type = ?)',
        runType
      );
      await runAsync(this.conn, 'DELETE FROM test_runs WHERE run_type = ?', runType);
    }
  }

  async insertTestRun(run: TestRun): Promise<void> {
    await runAsync(
      this.conn,
      `INSERT INTO test_runs 
        (test_id, test_full_name, test_name, test_file, test_suite, run_id, run_type, run_timestamp, status, duration_ms, error_code, error_message, error_stack, tags, realm, environment, ingest_source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (test_id, run_id) DO UPDATE SET
        test_full_name = excluded.test_full_name,
        test_name = excluded.test_name,
        test_file = excluded.test_file,
        test_suite = excluded.test_suite,
        run_type = excluded.run_type,
        run_timestamp = excluded.run_timestamp,
        status = excluded.status,
        duration_ms = excluded.duration_ms,
        error_code = excluded.error_code,
        error_message = excluded.error_message,
        error_stack = excluded.error_stack,
        tags = excluded.tags,
        realm = excluded.realm,
        environment = excluded.environment,
        ingest_source = excluded.ingest_source`,
      run.test_id,
      run.test_full_name,
      run.test_name,
      run.test_file,
      run.test_suite,
      run.run_id,
      run.run_type,
      run.run_timestamp,
      run.status,
      run.duration_ms,
      run.error_code,
      run.error_message,
      run.error_stack,
      run.tags,
      run.realm ?? null,
      run.environment ?? null,
      run.ingest_source ?? null
    );
  }

  async insertTestRunsBatch(runs: TestRun[]): Promise<void> {
    if (runs.length === 0) return;
    const BATCH_SIZE = 49;
    const cols =
      'test_id, test_full_name, test_name, test_file, test_suite, run_id, run_type, run_timestamp, status, duration_ms, error_code, error_message, error_stack, tags, realm, environment, ingest_source';
    const row = '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    const conflictSql = ` ON CONFLICT (test_id, run_id) DO UPDATE SET
        test_full_name = excluded.test_full_name,
        test_name = excluded.test_name,
        test_file = excluded.test_file,
        test_suite = excluded.test_suite,
        run_type = excluded.run_type,
        run_timestamp = excluded.run_timestamp,
        status = excluded.status,
        duration_ms = excluded.duration_ms,
        error_code = excluded.error_code,
        error_message = excluded.error_message,
        error_stack = excluded.error_stack,
        tags = excluded.tags,
        realm = excluded.realm,
        environment = excluded.environment,
        ingest_source = excluded.ingest_source`;
    for (let i = 0; i < runs.length; i += BATCH_SIZE) {
      const chunk = runs.slice(i, i + BATCH_SIZE);
      const placeholders = chunk.map(() => row).join(', ');
      const params: unknown[] = [];
      for (const run of chunk) {
        params.push(
          run.test_id,
          run.test_full_name,
          run.test_name,
          run.test_file,
          run.test_suite,
          run.run_id,
          run.run_type,
          run.run_timestamp,
          run.status,
          run.duration_ms,
          run.error_code,
          run.error_message,
          run.error_stack,
          run.tags,
          run.realm ?? null,
          run.environment ?? null,
          run.ingest_source ?? null
        );
      }
      const sql = `INSERT INTO test_runs (${cols}) VALUES ${placeholders}${conflictSql}`;
      await runAsync(this.conn, sql, ...params);
    }
  }

  async insertTestLog(log: TestLog): Promise<void> {
    const logTimeIso = logTimestampToIso(log.log_timestamp);
    await runAsync(
      this.conn,
      `INSERT INTO test_logs 
        (test_id, test_full_name, test_name, run_id, log_timestamp, log_time_iso, level, source, context, message, data, file, file_path, line, "column", correlation_id, tags, stack, suite_path, suite_type, origin, realm, environment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      log.test_id,
      log.test_full_name,
      log.test_name,
      log.run_id,
      log.log_timestamp,
      logTimeIso,
      log.level,
      log.source,
      log.context,
      log.message,
      log.data,
      log.file,
      log.file_path,
      log.line,
      log.column,
      log.correlation_id,
      log.tags,
      log.stack,
      log.suite_path,
      log.suite_type,
      log.origin,
      log.realm ?? null,
      log.environment ?? null
    );
  }

  async insertTestLogsBatch(logs: TestLog[]): Promise<void> {
    if (logs.length === 0) return;
    const BATCH_SIZE = 34;
    const cols =
      'test_id, test_full_name, test_name, run_id, log_timestamp, log_time_iso, level, source, context, message, data, file, file_path, line, "column", correlation_id, tags, stack, suite_path, suite_type, origin, realm, environment';
    const row = '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    for (let i = 0; i < logs.length; i += BATCH_SIZE) {
      const chunk = logs.slice(i, i + BATCH_SIZE);
      const placeholders = chunk.map(() => row).join(', ');
      const params: unknown[] = [];
      for (const log of chunk) {
        params.push(
          log.test_id,
          log.test_full_name,
          log.test_name,
          log.run_id,
          log.log_timestamp,
          logTimestampToIso(log.log_timestamp),
          log.level,
          log.source,
          log.context,
          log.message,
          log.data,
          log.file,
          log.file_path,
          log.line,
          log.column,
          log.correlation_id,
          log.tags,
          log.stack,
          log.suite_path,
          log.suite_type,
          log.origin,
          log.realm ?? null,
          log.environment ?? null
        );
      }
      await runAsync(
        this.conn,
        `INSERT INTO test_logs (${cols}) VALUES ${placeholders}`,
        ...params
      );
    }
  }

  async insertTestTerminalDump(runId: string, testId: string, terminalDump: string): Promise<void> {
    await runAsync(
      this.conn,
      `INSERT INTO test_terminal_dumps (run_id, test_id, terminal_dump)
       VALUES (?, ?, ?)
       ON CONFLICT (run_id, test_id) DO UPDATE SET terminal_dump = excluded.terminal_dump`,
      runId,
      testId,
      terminalDump
    );
  }

  private rowToTestRun(r: Record<string, unknown>): TestRun {
    const rawStatus = String(r.status ?? 'unknown');
    const status = RUN_STATUSES.includes(rawStatus) ? (rawStatus as TestRun['status']) : 'unknown';
    return {
      test_id: String(r.test_id ?? ''),
      test_full_name: String(r.test_full_name ?? ''),
      test_name: String(r.test_name ?? ''),
      test_file: String(r.test_file ?? ''),
      test_suite: r.test_suite != null ? String(r.test_suite) : null,
      run_id: String(r.run_id ?? ''),
      run_type: String(r.run_type) as RunType,
      run_timestamp: Number(r.run_timestamp ?? 0),
      status,
      duration_ms: r.duration_ms != null ? Number(r.duration_ms) : null,
      error_code: r.error_code != null ? String(r.error_code) : null,
      error_message: r.error_message != null ? String(r.error_message) : null,
      error_stack: r.error_stack != null ? String(r.error_stack) : null,
      tags: r.tags != null ? String(r.tags) : null,
      realm: r.realm != null ? String(r.realm) : null,
      environment: r.environment != null ? String(r.environment) : null,
      ingest_source: r.ingest_source != null && INGEST_SOURCES.includes(String(r.ingest_source)) ? (String(r.ingest_source) as TestRun['ingest_source']) : null,
    };
  }

  private rowToTestLog(r: Record<string, unknown>): TestLog {
    const col = r.column ?? r['column'];
    return {
      test_id: String(r.test_id ?? ''),
      test_full_name: String(r.test_full_name ?? ''),
      test_name: String(r.test_name ?? ''),
      run_id: String(r.run_id ?? ''),
      log_timestamp: Number(r.log_timestamp ?? 0),
      level: String(r.level) as TestLog['level'],
      source: r.source != null ? String(r.source) : null,
      context: r.context != null ? String(r.context) : null,
      message: String(r.message ?? ''),
      data: r.data != null ? String(r.data) : null,
      file: r.file != null ? String(r.file) : null,
      file_path: r.file_path != null ? String(r.file_path) : null,
      line: r.line != null ? Number(r.line) : null,
      column: col != null ? Number(col) : null,
      correlation_id: r.correlation_id != null ? String(r.correlation_id) : null,
      tags: r.tags != null ? String(r.tags) : null,
      stack: r.stack != null ? String(r.stack) : null,
      suite_path: r.suite_path != null ? String(r.suite_path) : null,
      suite_type: asTestSuiteTypeOrNull(r.suite_type == null ? null : String(r.suite_type)),
      origin: asLogOriginOrNull(r.origin == null ? null : String(r.origin)),
      realm: r.realm != null ? String(r.realm) : null,
      environment: r.environment != null ? String(r.environment) : null,
    };
  }

  private rankedRunsCte(whereClause: string): string {
    const where = whereClause.trim();
    const whereSql = where.length > 0 ? ` ${where}` : '';
    return `WITH ranked_runs AS (
      SELECT
        *,
        ROW_NUMBER() OVER (
          PARTITION BY run_id, test_file, test_name
          ORDER BY
            CASE
              WHEN ingest_source = 'ndjson' THEN 0
              WHEN ingest_source = 'live' THEN 1
              ELSE 2
            END,
            run_timestamp DESC,
            created_at DESC,
            test_id DESC
        ) AS row_rank
      FROM test_runs${whereSql}
    )`;
  }

  async getTestsByRunId(runId: string, testFile?: string): Promise<TestRun[]> {
    const conditions = ['run_id = ?'];
    const params: unknown[] = [runId];
    if (testFile != null && String(testFile).trim() !== '') {
      if (!path) return [];
      const raw = String(testFile).trim();
      const normalized = raw.replace(/\\/g, '/');
      const candidates = Array.from(
        new Set(
          [
            raw,
            normalized,
            path.basename(raw),
            path.basename(normalized),
            path.posix.basename(normalized),
            path.win32.basename(raw),
            path.win32.basename(normalized),
          ].filter((v) => v.length > 0)
        )
      );
      if (candidates.length === 1) {
        conditions.push('test_file = ?');
      } else {
        conditions.push(`test_file IN (${candidates.map(() => '?').join(', ')})`);
      }
      params.push(...candidates);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const sql = `${this.rankedRunsCte(whereClause)} SELECT * FROM ranked_runs WHERE row_rank = 1 ORDER BY test_file, test_suite, test_name`;
    const rows = await allAsync(this.db, sql, ...params);
    return rows.map((r) => this.rowToTestRun(r));
  }

  async getTestLogs(
    testName: string,
    runId: string,
    filters?: { level?: string; context?: string; source?: string; file?: string; tags?: string }
  ): Promise<TestLog[]> {
    const conditions = ['test_name = ?', 'run_id = ?'];
    const params: unknown[] = [testName, runId];
    if (filters?.level) {
      conditions.push('level = ?');
      params.push(filters.level);
    }
    if (filters?.context) {
      conditions.push('context = ?');
      params.push(filters.context);
    }
    if (filters?.source) {
      conditions.push('source = ?');
      params.push(filters.source);
    }
    if (filters?.file) {
      conditions.push('file = ?');
      params.push(filters.file);
    }
    if (filters?.tags) {
      conditions.push('tags LIKE ?');
      params.push(`%${filters.tags}%`);
    }
    const sql = `SELECT * FROM test_logs WHERE ${conditions.join(' AND ')} ORDER BY log_timestamp ASC`;
    const rows = await allAsync(this.db, sql, ...params);
    return rows.map((r) => this.rowToTestLog(r));
  }

  async getFailedOrTimeoutTests(filters?: {
    test_file?: string;
    suite_type?: TestSuiteType;
    run_id?: string;
    run_type?: RunType;
    error_code?: string;
    limit?: number;
  }): Promise<TestRun[]> {
    const baseConditions: string[] = [];
    const baseParams: unknown[] = [];
    const conditions = ["status IN ('failed', 'timeout')"];
    const params: unknown[] = [];
    if (filters?.test_file) {
      baseConditions.push('test_file = ?');
      baseParams.push(filters.test_file);
    }
    if (filters?.suite_type) {
      baseConditions.push('test_suite = ?');
      baseParams.push(filters.suite_type);
    }
    if (filters?.run_id) {
      baseConditions.push('run_id = ?');
      baseParams.push(filters.run_id);
    }
    if (filters?.run_type) {
      baseConditions.push('run_type = ?');
      baseParams.push(filters.run_type);
    }
    if (filters?.error_code) {
      conditions.push('error_code = ?');
      params.push(filters.error_code);
    }
    const limit = filters?.limit ?? 100;
    const whereClause = baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : '';
    const sql = `${this.rankedRunsCte(whereClause)} SELECT * FROM ranked_runs WHERE row_rank = 1 AND ${conditions.join(' AND ')} ORDER BY run_timestamp DESC LIMIT ?`;
    const rows = await allAsync(this.db, sql, ...baseParams, ...params, limit);
    return rows.map((r) => this.rowToTestRun(r));
  }

  async getTestStats(
    runId?: string,
    runType?: RunType,
    suiteType?: string
  ): Promise<{ total: number; passed: number; failed: number; unstable: number; timeout: number; unknown: number; by_error_code: Record<string, number> }> {
    const conditions: string[] = [];
    const params: unknown[] = [];
    if (runId) {
      conditions.push('run_id = ?');
      params.push(runId);
    }
    if (runType) {
      conditions.push('run_type = ?');
      params.push(runType);
    }
    if (suiteType) {
      conditions.push('test_suite = ?');
      params.push(suiteType);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rankedCte = this.rankedRunsCte(whereClause);
    const dedupFrom = 'FROM ranked_runs WHERE row_rank = 1';
    const statsSql = `${rankedCte} SELECT
      COUNT(*)::BIGINT as total,
      SUM(CASE WHEN status = 'passed' THEN 1 ELSE 0 END)::BIGINT as passed,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END)::BIGINT as failed,
      SUM(CASE WHEN status = 'unstable' THEN 1 ELSE 0 END)::BIGINT as unstable,
      SUM(CASE WHEN status = 'timeout' THEN 1 ELSE 0 END)::BIGINT as timeout,
      SUM(CASE WHEN status = 'unknown' THEN 1 ELSE 0 END)::BIGINT as unknown
    ${dedupFrom}`;
    const statsRows = await allAsync(this.db, statsSql, ...params);
    const s = statsRows[0] ?? {};
    const errorSql = `${rankedCte} SELECT error_code, COUNT(*)::BIGINT as count FROM ranked_runs WHERE row_rank = 1 AND error_code IS NOT NULL GROUP BY error_code`;
    const errorRows = await allAsync(this.db, errorSql, ...params);
    const by_error_code: Record<string, number> = {};
    for (const row of errorRows) {
      by_error_code[String(row.error_code)] = Number(row.count);
    }
    return {
      total: Number(s.total ?? 0),
      passed: Number(s.passed ?? 0),
      failed: Number(s.failed ?? 0),
      unstable: Number(s.unstable ?? 0),
      timeout: Number(s.timeout ?? 0),
      unknown: Number(s.unknown ?? 0),
      by_error_code,
    };
  }

  async getTestByName(testName: string, runId?: string, runType?: RunType): Promise<TestRun | null> {
    const conditions = ['test_name = ?'];
    const params: unknown[] = [testName];
    if (runId) {
      conditions.push('run_id = ?');
      params.push(runId);
    }
    if (runType) {
      conditions.push('run_type = ?');
      params.push(runType);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const sql = `${this.rankedRunsCte(whereClause)} SELECT * FROM ranked_runs WHERE row_rank = 1 ORDER BY run_timestamp DESC LIMIT 1`;
    const rows = await allAsync(this.db, sql, ...params);
    return rows.length > 0 ? this.rowToTestRun(rows[0]) : null;
  }

  async getLatestRunId(testName: string, runType?: RunType): Promise<string | null> {
    const conditions = ['test_name = ?'];
    const params: unknown[] = [testName];
    if (runType) {
      conditions.push('run_type = ?');
      params.push(runType);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const sql = `${this.rankedRunsCte(whereClause)} SELECT run_id FROM ranked_runs WHERE row_rank = 1 ORDER BY run_timestamp DESC LIMIT 1`;
    const rows = await allAsync(this.db, sql, ...params);
    return rows.length > 0 ? String(rows[0].run_id ?? '') : null;
  }

  async getAllTestsForFile(testFile: string, runType?: RunType): Promise<TestRun[]> {
    const conditions = ['test_file = ?'];
    const params: unknown[] = [testFile];
    if (runType) {
      conditions.push('run_type = ?');
      params.push(runType);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const sql = `${this.rankedRunsCte(whereClause)} SELECT * FROM ranked_runs WHERE row_rank = 1 ORDER BY test_suite, test_name, run_timestamp DESC`;
    const rows = await allAsync(this.db, sql, ...params);
    return rows.map((r) => this.rowToTestRun(r));
  }

  async getTestsByErrorCode(errorCode: string, runId?: string, limit?: number): Promise<TestRun[]> {
    const baseConditions: string[] = [];
    const baseParams: unknown[] = [];
    if (runId) {
      baseConditions.push('run_id = ?');
      baseParams.push(runId);
    }
    const limitVal = limit ?? 100;
    const whereClause = baseConditions.length > 0 ? `WHERE ${baseConditions.join(' AND ')}` : '';
    const sql = `${this.rankedRunsCte(whereClause)} SELECT * FROM ranked_runs WHERE row_rank = 1 AND error_code = ? ORDER BY run_timestamp DESC LIMIT ?`;
    const rows = await allAsync(this.db, sql, ...baseParams, errorCode, limitVal);
    return rows.map((r) => this.rowToTestRun(r));
  }

  async getTerminalDumpsByRunId(runId: string): Promise<Array<{ test_id: string; terminal_dump: string }>> {
    const rows = await allAsync(
      this.db,
      `SELECT test_id, terminal_dump FROM test_terminal_dumps WHERE run_id = ? ORDER BY test_id`,
      runId
    );
    return rows.map((r) => ({ test_id: String(r.test_id ?? ''), terminal_dump: String(r.terminal_dump ?? '') }));
  }

  async searchLogs(query: string, testName?: string, runId?: string): Promise<TestLog[]> {
    const conditions = ['message LIKE ?'];
    const params: unknown[] = [`%${query}%`];
    if (testName) {
      conditions.push('test_name = ?');
      params.push(testName);
    }
    if (runId) {
      conditions.push('run_id = ?');
      params.push(runId);
    }
    const sql = `SELECT * FROM test_logs WHERE ${conditions.join(' AND ')} ORDER BY log_timestamp DESC LIMIT 100`;
    const rows = await allAsync(this.db, sql, ...params);
    return rows.map((r) => this.rowToTestLog(r));
  }

  async searchLogsByContext(query: string, testName?: string, runId?: string): Promise<TestLog[]> {
    const conditions = ['context LIKE ?'];
    const params: unknown[] = [`%${query}%`];
    if (testName) {
      conditions.push('test_name = ?');
      params.push(testName);
    }
    if (runId) {
      conditions.push('run_id = ?');
      params.push(runId);
    }
    const sql = `SELECT * FROM test_logs WHERE ${conditions.join(' AND ')} ORDER BY log_timestamp DESC LIMIT 100`;
    const rows = await allAsync(this.db, sql, ...params);
    return rows.map((r) => this.rowToTestLog(r));
  }

  async ingestFromNdjson(
    ndjsonBaseDir: string,
    runType: RunType,
    runId?: string,
    filePaths?: string[],
    scopeSuiteType?: string | null
  ): Promise<{ runsInserted: number; logsInserted: number }> {
    const files: string[] =
      filePaths ??
      (() => {
        if (!path || !fs) return [];
        const baseDirResolved = path.resolve(ndjsonBaseDir);
        const runTypeDir = path.join(baseDirResolved, runType);
        if (!fs.existsSync(runTypeDir)) return [];
        const out: string[] = [];
        function walkDir(dir: string): void {
          const entries = fs!.readdirSync(dir, { withFileTypes: true });
          for (const entry of entries) {
            const fullPath = path!.join(dir, entry.name);
            if (entry.isDirectory()) walkDir(fullPath);
            else if (entry.name.endsWith('.ndjson')) out.push(fullPath);
          }
        }
        walkDir(runTypeDir);
        return out;
      })();

    const allLogs: TestLog[] = [];
    const runKeyToFirstTs = new Map<string, number>();
    const testResults = new Map<
      string,
      {
        status: string;
        duration_ms: number | null;
        ts: string;
        suite_type: string | null;
        suite_path: string | null;
        test_file: string | null;
      }
    >();

    for (const filePath of files) {
      if (!path) continue;
      const ndjsonFileKey = path.basename(path.dirname(filePath));
      const ndjsonSuiteType = path.basename(path.dirname(path.dirname(filePath)));
      const entries = readNdjsonFile(filePath) as (NdjsonLogEntry & { type?: string; status?: string; duration_ms?: number; test_name?: string })[];
      for (const entry of entries) {
        const t = (entry as { type?: string }).type;
        if (t === NdjsonLineType.RunSummary) continue;
        if (t === NdjsonLineType.TestResult) {
          const tr = entry as {
            run_id?: string;
            runId?: string;
            test_name?: string;
            testName?: string;
            test_id?: string;
            testId?: string;
            status?: string;
            duration_ms?: number;
            ts?: string;
            suite_type?: string;
            suiteType?: string;
            suite_path?: string;
            suitePath?: string;
            test_file?: string;
            testFile?: string;
          };
          const rid = tr.run_id ?? tr.runId;
          const tname = tr.test_name ?? tr.testName;
          const tid = tr.test_id ?? tr.testId ?? tname;
          if (rid && (tname || tid) && tr.status) {
            const suiteFromLine = tr.suite_type ?? tr.suiteType ?? ndjsonSuiteType ?? null;
            const suitePathFromLine = tr.suite_path ?? tr.suitePath ?? null;
            const testFileFromLine = tr.test_file ?? tr.testFile ?? null;
            const suitePath =
              suitePathFromLine != null && String(suitePathFromLine).trim() !== ''
                ? String(suitePathFromLine).trim()
                : null;
            const resolvedTestFile =
              testFileFromLine != null && String(testFileFromLine).trim() !== ''
                ? String(testFileFromLine).trim()
                : suitePath
                  ? path.basename(suitePath)
                  : ndjsonFileKey;
            const rec = {
              status: tr.status,
              duration_ms: tr.duration_ms ?? null,
              ts: tr.ts ?? '',
              suite_type: suiteFromLine != null && String(suiteFromLine).trim() !== '' ? String(suiteFromLine).trim() : null,
              suite_path: suitePath,
              test_file: resolvedTestFile,
            };
            if (tname) testResults.set(`${rid}\0${tname}`, rec);
            if (tid && tid !== tname) testResults.set(`${rid}\0${tid}`, rec);
          }
          continue;
        }
        if (runId != null && entry.runId !== runId) continue;
        const log = ndjsonEntryToTestLog(entry as NdjsonLogEntry);
        allLogs.push(log);
        const key = `${log.run_id}\0${log.test_id}`;
        if (!runKeyToFirstTs.has(key)) {
          runKeyToFirstTs.set(key, log.log_timestamp);
        }
      }
    }

    const runsByKey = new Map<
      string,
      {
        test_id: string;
        test_full_name: string;
        test_name: string;
        test_file: string;
        test_suite: string | null;
        run_id: string;
        run_type: RunType;
        run_timestamp: number;
        realm: string | null;
        environment: string | null;
      }
    >();
    for (const log of allLogs) {
      const key = `${log.run_id}\0${log.test_id}`;
      if (runsByKey.has(key)) continue;
      const testFile = log.suite_path && path ? path.basename(log.suite_path) : 'unknown.test.ts';
      runsByKey.set(key, {
        test_id: log.test_id,
        test_full_name: log.test_full_name,
        test_name: log.test_name,
        test_file: testFile,
        test_suite: log.suite_type,
        run_id: log.run_id,
        run_type: runType,
        run_timestamp: runKeyToFirstTs.get(key) ?? log.log_timestamp,
        realm: log.realm ?? null,
        environment: log.environment ?? null,
      });
    }

    const defaultSuite = scopeSuiteType != null && String(scopeSuiteType).trim() !== '' ? String(scopeSuiteType).trim() : null;
    const existingRunNameKeys = new Set<string>();
    for (const run of runsByKey.values()) {
      existingRunNameKeys.add(`${run.run_id}\0${run.test_name}`);
    }
    for (const [key, tr] of testResults) {
      const [rid, tname] = key.split('\0');
      const runNameKey = `${rid}\0${tname}`;
      if (!existingRunNameKeys.has(runNameKey)) {
        const runKey = `${rid}\0${tname}`;
        const testSuite = tr.suite_type ?? defaultSuite;
        const testFile =
          tr.test_file && String(tr.test_file).trim() !== ''
            ? String(tr.test_file).trim()
            : tr.suite_path && path
              ? path.basename(String(tr.suite_path))
              : 'unknown.test.ts';
        runsByKey.set(runKey, {
          test_id: tname,
          test_full_name: tname,
          test_name: tname,
          test_file: testFile,
          test_suite: testSuite,
          run_id: rid,
          run_type: runType,
          run_timestamp: tr.ts ? new Date(tr.ts).getTime() : Date.now(),
          realm: null,
          environment: null,
        });
        existingRunNameKeys.add(runNameKey);
      }
    }

    const runRows: TestRun[] = [];
    for (const run of runsByKey.values()) {
      const tr =
        testResults.get(`${run.run_id}\0${run.test_name}`) ??
        testResults.get(`${run.run_id}\0${run.test_id}`);
      const status = tr?.status as TestRun['status'] | undefined;
      runRows.push({
        ...run,
        status: status && RUN_STATUSES.includes(status) ? (status as TestRun['status']) : 'unknown',
        duration_ms: tr?.duration_ms ?? null,
        error_code: null,
        error_message: null,
        error_stack: null,
        tags: null,
        ingest_source: 'ndjson',
      });
    }
    if (runRows.length > 0) await this.insertTestRunsBatch(runRows);

    const batch: TestLog[] = [];
    for (const log of allLogs) {
      batch.push(log);
      if (batch.length >= LOG_INSERT_BATCH_SIZE) {
        await this.insertTestLogsBatch(batch);
        batch.length = 0;
      }
    }
    if (batch.length > 0) {
      await this.insertTestLogsBatch(batch);
    }

    return { runsInserted: runsByKey.size, logsInserted: allLogs.length };
  }

  async ingestFromMemory(runType: RunType, logs: TestLog[]): Promise<{ runsInserted: number; logsInserted: number }> {
    if (logs.length === 0) return { runsInserted: 0, logsInserted: 0 };
    const runKeyToFirstTs = new Map<string, number>();
    for (const log of logs) {
      const key = `${log.run_id}\0${log.test_id}`;
      if (!runKeyToFirstTs.has(key)) runKeyToFirstTs.set(key, log.log_timestamp);
    }
    const runsByKey = new Map<
      string,
      {
        test_id: string;
        test_full_name: string;
        test_name: string;
        test_file: string;
        test_suite: string | null;
        run_id: string;
        run_type: RunType;
        run_timestamp: number;
        realm: string | null;
        environment: string | null;
      }
    >();
    for (const log of logs) {
      const key = `${log.run_id}\0${log.test_id}`;
      if (runsByKey.has(key)) continue;
      const testFile = log.suite_path && path ? path.basename(log.suite_path) : 'unknown.test.ts';
      runsByKey.set(key, {
        test_id: log.test_id,
        test_full_name: log.test_full_name,
        test_name: log.test_name,
        test_file: testFile,
        test_suite: log.suite_type,
        run_id: log.run_id,
        run_type: runType,
        run_timestamp: runKeyToFirstTs.get(key) ?? log.log_timestamp,
        realm: log.realm ?? null,
        environment: log.environment ?? null,
      });
    }
    const runRows: TestRun[] = [];
    for (const run of runsByKey.values()) {
      runRows.push({
        ...run,
        status: 'unknown',
        duration_ms: null,
        error_code: null,
        error_message: null,
        error_stack: null,
        tags: null,
        ingest_source: 'live',
      });
    }
    if (runRows.length > 0) await this.insertTestRunsBatch(runRows);
    const batch: TestLog[] = [];
    for (const log of logs) {
      batch.push(log);
      if (batch.length >= LOG_INSERT_BATCH_SIZE) {
        await this.insertTestLogsBatch(batch);
        batch.length = 0;
      }
    }
    if (batch.length > 0) await this.insertTestLogsBatch(batch);
    return { runsInserted: runsByKey.size, logsInserted: logs.length };
  }

  async ingestFromFilePaths(filePaths: string[], runType: RunType): Promise<{ runsInserted: number; logsInserted: number }> {
    const allLogs: TestLog[] = [];
    for (const filePath of filePaths) {
      const entries = readNdjsonFile(filePath) as NdjsonLogEntry[];
      for (const entry of entries) {
        allLogs.push(ndjsonEntryToTestLog(entry));
      }
    }
    return this.ingestFromMemory(runType, allLogs);
  }
}

export async function ingestFromMemory(
  dbPath: string,
  runType: RunType,
  logs: TestLog[]
): Promise<{ runsInserted: number; logsInserted: number }> {
  const db = await TestLogDuckDb.create({ dbPath });
  try {
    return await db.ingestFromMemory(runType, logs);
  } finally {
    await db.close();
  }
}

export async function ingestFromNdjson(
  dbPath: string,
  ndjsonBaseDir: string,
  runType: RunType,
  runId?: string
): Promise<{ runsInserted: number; logsInserted: number }> {
  const db = await TestLogDuckDb.create({ dbPath });
  try {
    return await db.ingestFromNdjson(ndjsonBaseDir, runType, runId);
  } finally {
    await db.close();
  }
}

export async function ingestFilesOnly(
  dbPath: string,
  files: string[],
  runType: RunType
): Promise<{ runsInserted: number; logsInserted: number }> {
  if (files.length === 0) return { runsInserted: 0, logsInserted: 0 };

  const allLogs: TestLog[] = [];
  const runKeyToFirstTs = new Map<string, number>();

  for (const filePath of files) {
    const entries = readNdjsonFile(filePath) as (NdjsonLogEntry & { type?: string })[];
    for (const entry of entries) {
      const t = (entry as { type?: string }).type;
      if (t === NdjsonLineType.RunSummary || t === NdjsonLineType.TestResult) continue;
      const log = ndjsonEntryToTestLog(entry as NdjsonLogEntry);
      allLogs.push(log);
      const key = `${log.run_id}\0${log.test_id}`;
      if (!runKeyToFirstTs.has(key)) {
        runKeyToFirstTs.set(key, log.log_timestamp);
      }
    }
  }

  if (allLogs.length === 0) return { runsInserted: 0, logsInserted: 0 };

  const db = await TestLogDuckDb.create({ dbPath });
  try {
    return await db.ingestFromMemory(runType, allLogs);
  } finally {
    await db.close();
  }
}
