# Plan: Main App + Vite Logging — NDJSON + DuckDB (Consistent with Cloudflare)

---

## Part 1: Where We Are Today

### The Good (already done on this branch)

The main app logging has been **partially migrated** to use `logging-domain`:

1. **All call sites** in `src/` already import `MainAppLogger` from `@ocentra/logging-domain/core/mainAppLogger` and `getStackTrace` from `@ocentra/logging-domain/core/stackTrace`. No more local `Logger` class.

2. **Old files deleted**: `src/lib/logging/logger.ts`, `logStorage.ts`, `logQuery.ts`, `browserLogQuery.ts`, `viteLogQuery.ts`, `analyticsLogQuery.ts`, `logApi.ts`, `logRouteHandler.ts`, `LogInterfaces.ts`, `README.md`.

3. **Browser-side init done**: `src/lib/logging/init.ts` creates an `eventBusStorage` (implements `ILogStorage`) that buffers 20 log entries, then fires `SaveLogsEvent` via `EventBus`. The `NetworkRouter` picks up this event and POSTs NDJSON to the Vite dev server at `LocalApiEndpoint.Logs.Base` (from `@ocentra/endpoint-domain/constants/local`).

4. **Request context done**: `src/lib/logging/requestContext.ts` provides `setCurrentContext`/`getCurrentContext` for test-mode logging (runId, testName).

5. **NetworkRouter rewired**: `src/network/NetworkRouter.ts` handles `SaveLogsEvent`, `QueryLogsEvent`, `GetLogStatsEvent`, `ClearLogsEvent` using endpoint-domain paths. No more `ExecuteLogSQLEvent`.

6. **Vite middleware exists**: `vite/middleware/logs.ts` receives NDJSON POSTs, parses them, and stores via `getLogStorage()`.

7. **LogsPage works**: `src/ui/pages/dev/LogsPage.tsx` fetches from `/local/api/logs/query` and `/local/api/logs/stats`.

### The Problem (what's broken / incomplete)

**The Vite server stores logs in a JavaScript array that lives in memory:**

- `vite/utils/logStorageFactory.ts` → creates `inMemoryLogStorage` (line 23)
- `vite/utils/inMemoryLogStorage.ts` → literally `const entries: LogEntry[] = []`

This means:
- **Logs vanish** when you restart `npm run dev` — total data loss every restart
- **No NDJSON files** — no durable write-ahead log
- **No DuckDB** — no fast SQL queries, no MCP/CLI querying, no persistence
- **No npm scripts** for querying logs (unlike cloudflare which has `query-test-logs.ts`, `rebuild-db-from-ndjson.ts`, etc.)
- **Vite's own logs** (`ViteLogger` at `vite/utils/viteLogger.ts`, line 415: `getLogStorage()`) go to the same volatile in-memory array
- **Inconsistent** with cloudflare's NDJSON + DuckDB pattern

### How Cloudflare Does It (the reference pattern we want to match)

Cloudflare's test infrastructure already has a complete NDJSON + DuckDB pipeline in `packages/logging-domain`:

| Component | File | What it does |
|-----------|------|-------------|
| NDJSON writer | `src/test-log/ndjsonLogFileWriter.ts` | `fs.appendFileSync` to `.ndjson` files |
| Directory tree | `src/test-log/logsTree.ts` | Manages NDJSON directory structure: `db/ndjson/{consumer}/{runType}/{suiteType}/{fileKey}/` |
| DuckDB wrapper | `src/test-log/testLogDuckDb.ts` | Opens DuckDB, creates schema, inserts batches, queries |
| DuckDB helpers | Inline in `testLogDuckDb.ts` (lines 19-80) | `loadDuckDb()`, `runAsync()`, `allAsync()`, `closeConnAsync()`, `closeDbAsync()` |
| Ingest manifest | `src/test-log/ingestManifest.ts` | Tracks which NDJSON files have been ingested (SHA-256 hash-based) |
| Log bridge | `scripts/log-bridge.ts` | HTTP server that receives test logs and writes NDJSON |
| Query script | `scripts/query-test-logs.ts` | CLI to query DuckDB |
| Rebuild script | `scripts/rebuild-db-from-ndjson.ts` | Rebuild DuckDB from NDJSON files |
| Scopes | `src/test-log/types.ts` `LogRealm` | `cloudflare`, `main`, `solana`, `browser` — each gets own DuckDB |

**But**: The test-log infrastructure has a **test-centric schema** (`test_runs` + `test_logs` tables with `test_id`, `test_name`, `run_id`, `suite_type`, `suite_path`). App logs are simpler: just `LogEntry` with `id`, `level`, `source`, `context`, `message`, `origin`, `timestamp`, `file`, `line`, `args`, `stack`. Shoehorning one into the other would be fragile.

### Key Files (current state)

| File | Location | Current state |
|------|----------|--------------|
| `logStorageFactory.ts` | `vite/utils/logStorageFactory.ts` | Returns `createInMemoryLogStorage()` — volatile |
| `inMemoryLogStorage.ts` | `vite/utils/inMemoryLogStorage.ts` | `LogEntry[]` array, filters in JS, no persistence |
| `logStorageInterface.ts` | `vite/utils/logStorageInterface.ts` | `ILogStorage` interface — `storeLog`, `storeLogsBatch`, `queryLogs`, `getStats`, `clearLogs`, `flush?`, `executeSql?` |
| `logs.ts` middleware | `vite/middleware/logs.ts` | Receives POST NDJSON, calls `storage.storeLogsBatch()`. Query/stats/clear endpoints. |
| `viteLogger.ts` | `vite/utils/viteLogger.ts` | Vite's own logger, calls `getLogStorage().storeLog()` (line 415) — same volatile array |
| `dev-middleware.ts` | `vite/plugins/dev-middleware.ts` | Wires middleware into Vite server |
| `testLogDuckDb.ts` | `packages/logging-domain/src/test-log/testLogDuckDb.ts` | DuckDB helpers (lines 19-80) + `TestLogDuckDb` class with test-centric schema |
| `types.ts` | `packages/logging-domain/src/test-log/types.ts` | `LogRealm = { Cloudflare, Solana, Main, Browser }` — no `Vite` |
| `LogEntry` | `packages/logging-domain/src/types/logEntry.ts` | `{ id, level, context, message, source, origin, timestamp, args?, stack?, stackFrames?, file?, filePath?, line?, column? }` |
| `LogQuery` | `packages/logging-domain/src/types/logQuery.ts` | `{ level?, context?, source?, since?, until?, limit? }` |
| `LogStats` | `packages/logging-domain/src/types/logStats.ts` | `{ total_logs, by_level, by_source, by_context, oldest_timestamp, newest_timestamp }` |

---

## Part 2: Where We Want To Be

### One system, one pattern

```
                     WRITE PATH (hot, no locks)           INGEST                    QUERY
                     ────────────────────────────          ──────                    ─────

Browser App:         MainAppLogger
  logInfo(...)       → batch(20) → EventBus
                     → NetworkRouter
                     → POST /local/api/logs (NDJSON) ──→  Vite middleware
                                                          → fs.appendFileSync       setInterval(5s)        GET /local/api/logs/query
                                                          → NDJSON file             ──────────────→        ──────────────────────────
                                                            (scope 'main')          read new lines         → lazy ingest if pending
                                                                                    → batch INSERT         → DuckDB SQL query
                                                                                    → DuckDB               → return JSON
                                                                                      (main-log.duckdb)

Vite Dev Server:     ViteLogger
  logInfo(...)       → getViteLogStorage()
                     → fs.appendFileSync ──────────────→  NDJSON file              same timer              same endpoint (?scope=vite)
                                                           (scope 'vite')           → vite-log.duckdb       → DuckDB SQL query
```

### Scopes (consistent with cloudflare)

| Scope | NDJSON location | DuckDB file | What goes here |
|-------|----------------|-------------|----------------|
| `main` | `packages/logging-domain/db/ndjson/main/app-logs-YYYY-MM-DD.ndjson` | `db/main-log.duckdb` | Browser app logs (origin: browser) |
| `vite` | `packages/logging-domain/db/ndjson/vite/app-logs-YYYY-MM-DD.ndjson` | `db/vite-log.duckdb` | Vite dev server logs (origin: vite) |
| `cloudflare` | (existing, unchanged) | `db/cloudflare-log.duckdb` | Cloudflare worker test logs |

### DuckDB schema for app logs (new `app_logs` table)

Different from `test_logs` because app logs have no concept of test runs/suites:

```sql
CREATE TABLE IF NOT EXISTS app_logs (
  id            VARCHAR NOT NULL,
  level         VARCHAR NOT NULL CHECK(level IN ('error','warn','info','debug','log')),
  context       VARCHAR NOT NULL DEFAULT '',
  message       VARCHAR NOT NULL,
  source        VARCHAR NOT NULL DEFAULT '',
  origin        VARCHAR NOT NULL DEFAULT 'browser',
  timestamp     BIGINT  NOT NULL,
  timestamp_iso VARCHAR NOT NULL,
  args          VARCHAR,                    -- JSON stringified
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
```

### Write path: append-only NDJSON (no locks, no DuckDB on write)

- `storeLog(entry)` / `storeLogsBatch(entries)` calls `fs.appendFileSync` to the scope's daily NDJSON file
- One JSON line per entry, same shape as `LogEntry`
- Daily rotation: `app-logs-2026-02-09.ndjson`, `app-logs-2026-02-10.ndjson`, etc.
- Never touches DuckDB on the write path — zero lock contention

### Ingest path: periodic + lazy

- **Periodic**: `setInterval` every 5 seconds, reads NDJSON bytes appended since last read (offset tracking), batch-INSERTs into DuckDB
- **Lazy on query**: if a query/stats request arrives and there are pending NDJSON lines since last ingest, ingest first, then query
- **Offset-based tracking** (not SHA-256 hashing like `ingestManifest.ts`): for append-only files, we just track `{ file: bytesAlreadyIngested }`. Read from that offset to current file size = new lines. Much faster than hashing.
- DuckDB opened once per scope, held open for the Vite process lifetime. Single writer — no lock issues.
- `ON CONFLICT (id) DO NOTHING` for idempotent re-ingest

### Query path: same endpoints, DuckDB backend

- `GET /local/api/logs/query?level=error&source=GameEngine&since=5m&scope=main` → Vite middleware → lazy ingest → DuckDB SQL → return JSON
- `GET /local/api/logs/stats?scope=vite` → DuckDB aggregate → return JSON
- `DELETE /local/api/logs/clear?scope=main` → delete NDJSON files + TRUNCATE DuckDB table
- Same endpoint contract as now — LogsPage and NetworkRouter don't need to change their fetch calls (just add optional `scope` param)

### CLI querying (like cloudflare's scripts)

```bash
npm run logs:main              # recent browser logs
npm run logs:main:errors       # errors only
npm run logs:main:stats        # stats breakdown
npm run logs:vite              # recent Vite server logs
npm run logs:query -- search "GameEngine" --scope main --since 1h
npm run logs:db:rebuild        # rebuild DuckDB from NDJSON
```

---

## Part 3: How To Get There

### Phase 1: logging-domain — Extract DuckDB helpers + Create app-log module

#### Step 1.1: Extract shared DuckDB helpers

The DuckDB utility functions are currently inline in `testLogDuckDb.ts` (lines 19-80). Extract them into a shared module.

**Create**: `packages/logging-domain/src/app-log/duckDbHelpers.ts`

Move these from `testLogDuckDb.ts`:
- `DuckDbConnection` type (line 19-23)
- `DuckDbDatabase` type (line 25-29)
- `loadDuckDb()` function (line 31-39)
- `runAsync()` function (line 42-48)
- `closeConnAsync()` function (line 51-57)
- `closeDbAsync()` function (line 60-66)
- `allAsync()` function (line 69-80)

**Modify**: `packages/logging-domain/src/test-log/testLogDuckDb.ts`
- Replace the inline definitions with: `import { loadDuckDb, runAsync, allAsync, closeConnAsync, closeDbAsync, type DuckDbConnection, type DuckDbDatabase } from '../app-log/duckDbHelpers';`
- Remove lines 19-80
- Everything else in `testLogDuckDb.ts` stays exactly the same

**Verify**: `cd packages/logging-domain && npm run build` — should pass with no behavior change.

#### Step 1.2: Create `AppLogDuckDb` class

**Create**: `packages/logging-domain/src/app-log/appLogDuckDb.ts`

This is the DuckDB wrapper for app logs, analogous to `TestLogDuckDb` but with the `app_logs` schema shown above.

```typescript
import { loadDuckDb, runAsync, allAsync, closeConnAsync, closeDbAsync, type DuckDbConnection, type DuckDbDatabase } from './duckDbHelpers';
import type { LogEntry } from '../types/logEntry';
import type { LogQuery } from '../types/logQuery';
import type { LogStats } from '../types/logStats';
import type { LogLevel } from '../types/logLevel';

export class AppLogDuckDb {
  private db: DuckDbDatabase;
  private conn: DuckDbConnection;
  private readonly dbPath: string;

  static async create(dbPath: string): Promise<AppLogDuckDb>
  // Opens DB, creates schema + indexes if not exist

  async insertBatch(entries: LogEntry[]): Promise<number>
  // Batch INSERT with ON CONFLICT (id) DO NOTHING
  // Batch size: ~50 rows per INSERT (DuckDB param limit)
  // Converts args to JSON string, adds timestamp_iso

  async queryLogs(query?: LogQuery): Promise<LogEntry[]>
  // Translates LogQuery → SQL WHERE clause:
  //   level → WHERE level = ?
  //   source → WHERE source LIKE ? (contains match, same as inMemoryLogStorage)
  //   context → WHERE context LIKE ?
  //   since → WHERE timestamp >= ? (parse relative: '5m' → now - 5*60000, '1h' → now - 3600000)
  //   until → WHERE timestamp <= ?
  //   limit → LIMIT ? (default 100, max 1000)
  // ORDER BY timestamp DESC

  async getStats(sourcePrefix?: string): Promise<LogStats>
  // SQL aggregate: COUNT, GROUP BY level, GROUP BY source, GROUP BY context, MIN/MAX timestamp
  // If sourcePrefix: WHERE source LIKE '{prefix}%'

  async clearLogs(): Promise<number>
  // DELETE FROM app_logs; return count

  async getRowCount(): Promise<number>
  // SELECT COUNT(*) FROM app_logs

  async close(): Promise<void>
  // Close connection + database
}
```

Key behaviors:
- `insertBatch` uses `ON CONFLICT (id) DO NOTHING` — safe to re-ingest same entries
- `queryLogs` parses `since` string same way `inMemoryLogStorage.ts` does (line 10-18: `parseSinceToMs`)
- `getStats` returns same shape as `LogStats` type
- `args` stored as JSON string, parsed back on read

#### Step 1.3: Create app NDJSON writer

**Create**: `packages/logging-domain/src/app-log/appNdjsonWriter.ts`

```typescript
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_DB_DIR } from '../test-log/testLogDuckDb';  // reuse db dir constant
import type { LogEntry } from '../types/logEntry';

export function getAppNdjsonDir(scope: string, dbDir?: string): string
// Returns: {dbDir}/ndjson/{scope}/
// Creates dir if not exists

export function getCurrentNdjsonPath(scope: string, dbDir?: string): string
// Returns: {dbDir}/ndjson/{scope}/app-logs-{YYYY-MM-DD}.ndjson

export function appendLogEntries(scope: string, entries: LogEntry[], dbDir?: string): void
// For each entry: JSON.stringify + '\n'
// fs.appendFileSync to getCurrentNdjsonPath(scope)
// Creates file if not exists

export function listAppNdjsonFiles(scope: string, dbDir?: string): string[]
// Walk {dbDir}/ndjson/{scope}/, return all .ndjson file paths sorted by name

export function readAppNdjsonFile(filePath: string): LogEntry[]
// Read file, split by newline, JSON.parse each line
// Skip malformed lines
```

Simple, flat file structure (not the nested consumer/runType/suiteType tree from `logsTree.ts`). App logs don't have run types or suite types.

#### Step 1.4: Create app log ingest manager

**Create**: `packages/logging-domain/src/app-log/appLogIngest.ts`

This tracks how much of each NDJSON file has been ingested (byte offset) and reads only new content:

```typescript
export type FileProgress = { size: number; offset: number };
export type IngestState = { files: Record<string, FileProgress> };

export function createIngestState(): IngestState
// { files: {} }

export function getNewEntries(scope: string, state: IngestState, dbDir?: string): { entries: LogEntry[]; updatedState: IngestState }
// 1. listAppNdjsonFiles(scope)
// 2. For each file:
//    - stat to get current size
//    - if file not in state: read entire file, set offset = size
//    - if file in state and size > offset: read from offset to size (new bytes)
//    - parse new bytes as NDJSON lines
// 3. Return new entries + updated state (with new offsets)

export function hasPendingEntries(scope: string, state: IngestState, dbDir?: string): boolean
// Quick check: any file size > stored offset?
```

Key design: **offset-based, not hash-based**. For append-only files, we just track bytes read. This is O(1) per file check vs O(n) for SHA-256 hashing. The state lives in memory (per Vite process), not persisted to disk — because ingest state is session-local.

#### Step 1.5: Add `Vite` to `LogRealm`

**Modify**: `packages/logging-domain/src/test-log/types.ts` (line 62-68)

```typescript
export const LogRealm = {
  Cloudflare: 'cloudflare',
  Solana: 'solana',
  Main: 'main',
  Browser: 'browser',
  Vite: 'vite',        // ← ADD THIS
} as const;
```

#### Step 1.6: Update package.json exports

**Modify**: `packages/logging-domain/package.json`

Add to the `exports` map:
```json
"./app-log/duckDbHelpers": {
  "import": "./dist/app-log/duckDbHelpers.js",
  "types": "./dist/app-log/duckDbHelpers.d.ts"
},
"./app-log/appLogDuckDb": {
  "import": "./dist/app-log/appLogDuckDb.js",
  "types": "./dist/app-log/appLogDuckDb.d.ts"
},
"./app-log/appNdjsonWriter": {
  "import": "./dist/app-log/appNdjsonWriter.js",
  "types": "./dist/app-log/appNdjsonWriter.d.ts"
},
"./app-log/appLogIngest": {
  "import": "./dist/app-log/appLogIngest.js",
  "types": "./dist/app-log/appLogIngest.d.ts"
}
```

#### Step 1.7: Build and verify

```bash
cd packages/logging-domain && npm run build
```
- Confirm no build errors
- Confirm `testLogDuckDb.ts` still works (just uses imported helpers now)

---

### Phase 2: Vite side — Replace in-memory with NDJSON + DuckDB

#### Step 2.1: Create `NdjsonDuckDbLogStorage`

**Create**: `vite/utils/ndjsonDuckDbLogStorage.ts`

Implements `ILogStorage` (from `vite/utils/logStorageInterface.ts`):

```typescript
import type { ILogStorage } from './logStorageInterface';
import type { LogEntry } from '@ocentra/logging-domain/types/logEntry';
import type { LogQuery } from '@ocentra/logging-domain/types/logQuery';
import type { LogStats } from '@ocentra/logging-domain/types/logStats';
import { AppLogDuckDb } from '@ocentra/logging-domain/app-log/appLogDuckDb';
import { appendLogEntries } from '@ocentra/logging-domain/app-log/appNdjsonWriter';
import { createIngestState, getNewEntries, hasPendingEntries } from '@ocentra/logging-domain/app-log/appLogIngest';
// + DuckDB path utilities

export interface NdjsonDuckDbStorageOptions {
  scope: 'main' | 'vite';
  ingestIntervalMs?: number;  // default 5000
}

export function createNdjsonDuckDbLogStorage(options: NdjsonDuckDbStorageOptions): ILogStorage & { dispose(): Promise<void> }
```

**Internal state per instance:**
- `scope`: 'main' or 'vite'
- `ingestState`: from `createIngestState()`
- `duckDb`: `AppLogDuckDb | null` — lazily opened on first query or ingest
- `ingestTimer`: `NodeJS.Timeout` — periodic ingest every 5s
- `ingestLock`: `Promise<void>` — serializes ingest operations (prevent overlapping ingests)

**Method implementations:**

`storeLog(entry)` / `storeLogsBatch(entries)`:
```
1. Normalize entry (add id if missing, add origin if missing) — same as inMemoryLogStorage normalizeEntry()
2. appendLogEntries(scope, [normalizedEntry])  // sync fs.appendFileSync → NDJSON
3. Return immediately (no DuckDB touch)
```

`queryLogs(query)`:
```
1. await ensureDuckDb()                          // lazy open
2. if hasPendingEntries(scope, ingestState):
     await ingestPendingLines()                  // read new NDJSON → INSERT into DuckDB
3. return await duckDb.queryLogs(query)          // SQL query
```

`getStats(sourcePrefix)`:
```
1. await ensureDuckDb()
2. if hasPendingEntries(...): await ingestPendingLines()
3. return await duckDb.getStats(sourcePrefix)
```

`clearLogs()`:
```
1. Delete all NDJSON files for this scope
2. Reset ingestState
3. await duckDb.clearLogs() if duckDb is open
```

`flush()`:
```
1. await ensureDuckDb()
2. await ingestPendingLines()  // force ingest all pending
```

`dispose()`:
```
1. clearInterval(ingestTimer)
2. await ingestPendingLines()  // final flush
3. await duckDb.close()
```

**Periodic ingest** (runs every 5s):
```
1. if !hasPendingEntries(...): return (no work)
2. await ensureDuckDb()
3. const { entries, updatedState } = getNewEntries(scope, ingestState)
4. if entries.length > 0: await duckDb.insertBatch(entries)
5. ingestState = updatedState
```

**`ensureDuckDb()`**: Opens `AppLogDuckDb.create(dbPath)` on first call. DB path: `packages/logging-domain/db/{scope}-log.duckdb` (same pattern as `getDefaultDbPath` in `testLogDuckDb.ts`).

#### Step 2.2: Update log storage factory

**Modify**: `vite/utils/logStorageFactory.ts`

Replace:
```typescript
import { createInMemoryLogStorage } from './inMemoryLogStorage';
let storage: ILogStorage = createInMemoryLogStorage();
```

With:
```typescript
import { createNdjsonDuckDbLogStorage } from './ndjsonDuckDbLogStorage';

let mainStorage: (ILogStorage & { dispose?(): Promise<void> }) | null = null;
let viteStorage: (ILogStorage & { dispose?(): Promise<void> }) | null = null;

export function getLogStorage(): ILogStorage {
  if (!mainStorage) mainStorage = createNdjsonDuckDbLogStorage({ scope: 'main' });
  return mainStorage;
}

export function getViteLogStorage(): ILogStorage {
  if (!viteStorage) viteStorage = createNdjsonDuckDbLogStorage({ scope: 'vite' });
  return viteStorage;
}

export async function disposeAllStorage(): Promise<void> {
  if (mainStorage?.dispose) await mainStorage.dispose();
  if (viteStorage?.dispose) await viteStorage.dispose();
  mainStorage = null;
  viteStorage = null;
}

// Keep noopStorage and setTestStorage for test overrides
```

#### Step 2.3: Update ViteLogger to use Vite-scope storage

**Modify**: `vite/utils/viteLogger.ts`

Line 1 — change:
```typescript
import { getLogStorage } from './logStorageFactory'
```
To:
```typescript
import { getViteLogStorage } from './logStorageFactory'
```

Line 415 (inside `storeLogEntry`) — change:
```typescript
const storage = getLogStorage()
```
To:
```typescript
const storage = getViteLogStorage()
```

This makes Vite's own logs go to scope `vite` (separate NDJSON files, separate DuckDB).

#### Step 2.4: Add scope parameter to logs middleware

**Modify**: `vite/middleware/logs.ts`

Changes:
1. Import `getViteLogStorage` alongside `getLogStorage` from factory
2. Add a helper:
```typescript
function getStorageForScope(scope: string | null): ILogStorage {
  if (scope === 'vite') return getViteLogStorage();
  return getLogStorage(); // default: 'main'
}
```
3. In query/stats/clear handlers, read `scope` from query params:
```typescript
const scope = params.get('scope');
const storage = getStorageForScope(scope);
```
4. POST handler always uses `getLogStorage()` (main scope — browser logs)

#### Step 2.5: Add server shutdown cleanup

**Modify**: `vite/plugins/dev-middleware.ts`

After `setupLogsMiddleware(server.middlewares)`, add:
```typescript
server.httpServer?.on('close', async () => {
  const { disposeAllStorage } = await import('../utils/logStorageFactory');
  await disposeAllStorage();
});
```

This ensures DuckDB connections are closed cleanly and any pending NDJSON lines are ingested.

#### Step 2.6: Remove `executeSql` from interface

**Modify**: `vite/utils/logStorageInterface.ts`

Remove line 12: `executeSql?(sql: string): Promise<unknown[]> | unknown[];`

We don't expose raw SQL. All queries go through `queryLogs`/`getStats`.

---

### Phase 3: npm scripts for querying

#### Step 3.1: Create query script

**Create**: `scripts/logs/query-app-logs.ts`

CLI tool that opens DuckDB directly (read-only when Vite is stopped, or connect to the same file):

```
Usage:
  tsx scripts/logs/query-app-logs.ts <command> [options]

Commands:
  recent    Show recent logs (default)
  errors    Show only errors
  stats     Show log statistics
  search    Search logs by message content

Options:
  --scope <main|vite>   Which log scope (default: main)
  --limit <N>           Max entries (default: 50)
  --level <LEVEL>       Filter by level
  --source <SOURCE>     Filter by source
  --since <duration>    Time filter (5m, 1h, 1d)
  --format <table|json> Output format (default: table)
```

Implementation:
1. Parse args
2. Determine DB path: `packages/logging-domain/db/{scope}-log.duckdb`
3. If DB doesn't exist, check for NDJSON files and offer to rebuild
4. Open `AppLogDuckDb.create(dbPath)`
5. Call appropriate query method
6. Format output (table or JSON)
7. Close DB

#### Step 3.2: Create rebuild script

**Create**: `scripts/logs/rebuild-app-db.ts`

```
Usage:
  tsx scripts/logs/rebuild-app-db.ts [--scope main|vite|all]
```

1. Delete existing DuckDB file for the scope
2. Read all NDJSON files from `db/ndjson/{scope}/`
3. Create fresh `AppLogDuckDb`
4. Insert all entries in batches
5. Report: "Rebuilt {scope}-log.duckdb: {N} entries from {M} files"

#### Step 3.3: Add npm scripts to root package.json

**Modify**: `package.json` (root)

Add to `"scripts"`:
```json
"logs:main": "tsx scripts/logs/query-app-logs.ts recent --scope main",
"logs:main:errors": "tsx scripts/logs/query-app-logs.ts errors --scope main",
"logs:main:stats": "tsx scripts/logs/query-app-logs.ts stats --scope main",
"logs:vite": "tsx scripts/logs/query-app-logs.ts recent --scope vite",
"logs:vite:errors": "tsx scripts/logs/query-app-logs.ts errors --scope vite",
"logs:query": "tsx scripts/logs/query-app-logs.ts",
"logs:db:rebuild": "tsx scripts/logs/rebuild-app-db.ts"
```

---

### Phase 4: LogsPage scope selector (optional, low priority)

**Modify**: `src/ui/pages/dev/LogsPage.tsx`

Add a tab/radio selector: "Browser Logs" / "Vite Logs". Append `&scope=main` or `&scope=vite` to fetch URLs. Everything else stays the same.

---

## Part 4: File Summary

### New files (7)

| # | File | Purpose |
|---|------|---------|
| 1 | `packages/logging-domain/src/app-log/duckDbHelpers.ts` | Shared DuckDB helpers (extracted from testLogDuckDb) |
| 2 | `packages/logging-domain/src/app-log/appLogDuckDb.ts` | `AppLogDuckDb` class — DuckDB for app logs |
| 3 | `packages/logging-domain/src/app-log/appNdjsonWriter.ts` | NDJSON append writer for app logs |
| 4 | `packages/logging-domain/src/app-log/appLogIngest.ts` | Offset-based lazy ingest manager |
| 5 | `vite/utils/ndjsonDuckDbLogStorage.ts` | `ILogStorage` impl wrapping NDJSON+DuckDB |
| 6 | `scripts/logs/query-app-logs.ts` | CLI for querying app logs |
| 7 | `scripts/logs/rebuild-app-db.ts` | CLI for rebuilding DuckDB from NDJSON |

### Modified files (8)

| # | File | Change |
|---|------|--------|
| 1 | `packages/logging-domain/src/test-log/testLogDuckDb.ts` | Import helpers from `duckDbHelpers.ts` instead of inline (remove lines 19-80, add import) |
| 2 | `packages/logging-domain/src/test-log/types.ts` | Add `Vite: 'vite'` to `LogRealm` (line 67) |
| 3 | `packages/logging-domain/package.json` | Add 4 new exports under `./app-log/*` |
| 4 | `vite/utils/logStorageFactory.ts` | Switch default to NdjsonDuckDb, add `getViteLogStorage()`, add `disposeAllStorage()` |
| 5 | `vite/utils/viteLogger.ts` | Change `getLogStorage()` → `getViteLogStorage()` (2 lines) |
| 6 | `vite/middleware/logs.ts` | Add optional `scope` query param to query/stats/clear endpoints |
| 7 | `vite/plugins/dev-middleware.ts` | Add server close handler for cleanup |
| 8 | `package.json` (root) | Add 7 npm scripts for log querying |

### Unchanged files

| File | Why unchanged |
|------|--------------|
| `src/lib/logging/init.ts` | Browser-side already done |
| `src/lib/logging/requestContext.ts` | Already done |
| `src/lib/logging/index.ts` | Already done |
| `src/network/NetworkRouter.ts` | Already handles log events with endpoint-domain paths |
| `src/ui/pages/dev/LogsPage.tsx` | Works as-is; scope selector is optional Phase 4 |
| `vite/utils/inMemoryLogStorage.ts` | Kept as fallback for tests |
| `vite/utils/logStorageInterface.ts` | Interface already supports async + flush (only remove `executeSql`) |

---

## Part 5: Execution Order

```
Phase 1: logging-domain
  1.1  Extract duckDbHelpers.ts from testLogDuckDb.ts
  1.2  Create appLogDuckDb.ts
  1.3  Create appNdjsonWriter.ts
  1.4  Create appLogIngest.ts
  1.5  Add Vite to LogRealm
  1.6  Update package.json exports
  1.7  Build + verify

Phase 2: Vite side
  2.1  Create ndjsonDuckDbLogStorage.ts
  2.2  Update logStorageFactory.ts
  2.3  Update viteLogger.ts (2-line change)
  2.4  Update logs.ts middleware (scope param)
  2.5  Update dev-middleware.ts (cleanup)
  2.6  Remove executeSql from ILogStorage

Phase 3: CLI scripts
  3.1  Create query-app-logs.ts
  3.2  Create rebuild-app-db.ts
  3.3  Add npm scripts

Phase 4 (optional): LogsPage scope selector
```

---

## Part 6: Verification

### After Phase 1
```bash
cd packages/logging-domain && npm run build
# Should pass. No behavior change to existing cloudflare tests.
```

### After Phase 2
```bash
npm run dev
# 1. Browse the app, click around, trigger some logging
# 2. Check filesystem:
ls packages/logging-domain/db/ndjson/main/
#    → app-logs-2026-02-09.ndjson (should exist, growing)
ls packages/logging-domain/db/ndjson/vite/
#    → app-logs-2026-02-09.ndjson (Vite's own logs)
ls packages/logging-domain/db/
#    → main-log.duckdb (created after ~5s)
#    → vite-log.duckdb (created after ~5s)

# 3. Open LogsPage → should show browser logs
# 4. Restart npm run dev → NDJSON files persist → first query re-ingests → no data loss
```

### After Phase 3
```bash
npm run logs:main              # shows recent browser logs in table
npm run logs:main:errors       # shows only errors
npm run logs:main:stats        # shows by_level, by_source breakdown
npm run logs:vite              # shows Vite server logs
npm run logs:db:rebuild        # rebuilds from NDJSON
```

### Edge cases to test
- Restart dev server mid-session → NDJSON persists, DuckDB rebuilds on query
- Large volume (1000+ logs in quick succession) → NDJSON append handles it, periodic ingest catches up
- Concurrent query during ingest → ingest lock serializes, query waits then returns
- Empty state (fresh clone, no NDJSON files) → graceful handling, empty results
