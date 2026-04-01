# Test Helper & Query Commands Reference

This document covers all test helper commands, query commands, and how the DuckDB logging system works.

---

## Overview

The test system has three main components:

1. **Test Helpers** (`run-suite-helper.ts`) - Run tests with logging, wipe old logs, ingest to DuckDB
2. **DuckDB Ingest** (`rebuild-db-from-ndjson.ts`) - Import NDJSON logs into DuckDB for querying
3. **Query Tool** (`query-test-logs.ts`) - Query test results and logs from DuckDB

---

## Test Helper Commands

All commands run from `infra/cloudflare/`.

### Unit Tests

| Command | Mode | Description |
|---------|------|-------------|
| `npm run test:unit:helper` | pool + threads | Run all unit tests in both modes |
| `npm run test:unit:pool:helper` | pool only | Run all unit tests in pool mode |
| `npm run test:unit:threads:helper` | threads only | Run all unit tests in threads mode |

### Integration Tests

| Command | Mode | Description |
|---------|------|-------------|
| `npm run test:integration:helper` | pool + threads | Run all integration tests in both modes |
| `npm run test:integration:pool:helper` | pool only | Run all integration tests in pool mode |
| `npm run test:integration:threads:helper` | threads only | Run all integration tests in threads mode |

### E2E Tests

| Command | Mode | Description |
|---------|------|-------------|
| `npm run test:e2e:helper` | pool + threads | Run all e2e tests in both modes |
| `npm run test:e2e:pool:helper` | pool only | Run all e2e tests in pool mode |
| `npm run test:e2e:threads:helper` | threads only | Run all e2e tests in threads mode |
| `npm run test:e2e:unstable:helper` | same as threads | Alias for `test:e2e:threads:helper` (e2e with helper in unstable mode) |

### All Tests

| Command | Mode | Description |
|---------|------|-------------|
| `npm run test:helper` | pool + threads | Run ALL test types (unit, integration, e2e, contract) |

### Single File Tests

Add the test file as a positional argument. You can use either a full path under `tests/{type}/` or a bare filename (resolved under that type’s directory):

```bash
# Run single file in both modes (full path)
npm run test:unit:helper -- tests/unit/admin-check.test.ts

# Run single file by bare name (same as above for unit)
npm run test:unit:helper -- admin-check.test.ts

# Integration: run only that file (not the full A→B→C suite)
npm run test:integration:helper -- property-invariants.test.ts

# Run single file in pool mode only
npm run test:unit:pool:helper -- tests/unit/admin-check.test.ts

# Run single file in threads mode only
npm run test:unit:threads:helper -- tests/unit/admin-check.test.ts

# E2E single file with helper (unstable/threads mode; output + logs)
npm run test:e2e:unstable:helper -- tests/e2e/upload-download.test.ts
```

---

## Output Files

Results are written to `infra/cloudflare/test-runner/logs/`:

### Full Suite Output Files

| Mode | Output File |
|------|-------------|
| Both | `{type}-test-helper-results.txt` |
| Pool only | `{type}-test-helper-pool-results.txt` |
| Threads only | `{type}-test-helper-threads-results.txt` |

Examples:

- `unit-test-helper-results.txt`
- `integration-test-helper-pool-results.txt`
- `e2e-test-helper-threads-results.txt`
- `all-test-helper-results.txt`

### Single File Output Files

| Mode | Output File |
|------|-------------|
| Both | `single-{name}-helper-results.txt` |
| Pool only | `single-{name}-helper-pool-results.txt` |
| Threads only | `single-{name}-helper-threads-results.txt` |

Example: `npm run test:unit:helper -- tests/unit/admin-check.test.ts`
→ `single-admin-check-helper-results.txt`

---

## Query Commands

All commands run from `infra/cloudflare/`.

### Failed Tests

| Command | Scope |
|---------|-------|
| `npm run test:query:failed` | All failures (all types, all modes) |
| `npm run test:query:failed:unit` | Unit failures only |
| `npm run test:query:failed:integration` | Integration failures only |
| `npm run test:query:failed:e2e` | E2E failures only |
| `npm run test:query:failed:contract` | Contract failures only |
| `npm run test:query:failed:pool` | Pool mode failures only |
| `npm run test:query:failed:threads` | Threads mode failures only |
| `npm run test:query:failed:unit:pool` | Unit + pool mode |
| `npm run test:query:failed:unit:threads` | Unit + threads mode |
| `npm run test:query:failed:integration:pool` | Integration + pool mode |
| `npm run test:query:failed:integration:threads` | Integration + threads mode |
| `npm run test:query:failed:both` | Tests failing in BOTH modes |

### Stats

| Command | Scope |
|---------|-------|
| `npm run test:query:stats` | All stats |
| `npm run test:query:stats:unit` | Unit stats only |
| `npm run test:query:stats:integration` | Integration stats only |
| `npm run test:query:stats:e2e` | E2E stats only |
| `npm run test:query:stats:pool` | Pool mode stats |
| `npm run test:query:stats:threads` | Threads mode stats |
| `npm run test:query:stats:unit:pool` | Unit + pool mode |
| `npm run test:query:stats:unit:threads` | Unit + threads mode |

### By Run ID

Query a specific test run by its UUID:

```bash
# Basic query
npm run test:query -- by-run <run-id>

# With full logs (Bash/Git Bash)
SHOW_LOGS=1 npm run test:query -- by-run <run-id>
SHOW_LOGS=1 ERRORS_ONLY=1 npm run test:query -- by-run <run-id>

# With full logs (PowerShell)
$env:SHOW_LOGS="1"; npm run test:query -- by-run <run-id>
$env:SHOW_LOGS="1"; $env:ERRORS_ONLY="1"; npm run test:query -- by-run <run-id>

# Query failed tests for a run
npm run test:query -- failed <run-id>
```

### By Test Name

```bash
# Get test details and logs
npm run test:query -- test "<test-name>" [run-id]

# Search logs
npm run test:query -- search "<query>"

# Get error logs only
npm run test:query -- errors "<test-name>"
```

---

## DuckDB Ingest Commands

Run from `packages/logging-domain/`:

### Full Rebuild

```bash
# Rebuild entire database (deletes old, ingests all)
npm run db:rebuild
```

### Scoped Ingest

```bash
# Ingest specific scope (used automatically by test helpers)
npx tsx scripts/rebuild-db-from-ndjson.ts --run-type=single-pool --suite-type=unit --domain=cloudflare

# Available run types:
#   single-pool, single-threads, single, full

# Available suite types:
#   unit, integration, e2e, contract
```

---

## How It Works

**Full flow and test setups:** For the complete **helper → log bridge → reporter** flow (A→B→C), what **pool**, **pool with isolation**, and **threads** setups do, and how runId/runType and NDJSON paths work, see **[TEST-RUN-SETUPS-AND-BRIDGE-FLOW.md](../../../infra/cloudflare/docs/TEST-RUN-SETUPS-AND-BRIDGE-FLOW.md)** in `infra/cloudflare/docs/`. The following is a short summary.

### Test Helper Flow

When you run a test helper (e.g., `npm run test:unit:helper -- tests/unit/foo.test.ts`):

1. **Preflight**
   - Builds `@ocentra/logging-domain`
   - Checks log bridge is running

2. **Wipe NDJSON** (scoped)
   - Deletes NDJSON files in `single-pool/unit/` and `single-threads/unit/`
   - Only wipes the specific scope, not other test types

3. **Run Tests**
   - Runs tests in pool mode (`single-pool`)
   - Runs tests in threads mode (`single-threads`)
   - Logs are written to NDJSON files during execution

4. **Ingest to DuckDB** (scoped)
   - Deletes old data for scope from DuckDB
   - Inserts new data for scope into DuckDB
   - Updates manifest for ingested files only

5. **Write Results**
   - Outputs summary to console
   - Writes full log to results file

### Pool vs Threads Setup

Tests run in one of two modes, each with its own setup file:

| Mode | Setup File | Run Type | Where Tests Run |
|------|------------|----------|-----------------|
| **Pool** | `infra/cloudflare/tests/test-setup-pool.ts` | `single-pool` | Inside Miniflare worker (in-process `SELF.fetch`) |
| **Threads** | `infra/cloudflare/tests/test-setup-threads.ts` | `single-threads` | Node Vitest worker threads; worker via HTTP (`unstable_dev`) |

**Run type in headers:** The worker does not know which mode invoked it. The test runner sends `X-Run-Type` in every request so the worker can tag logs and the bridge can write to the correct directory (`single-pool/` or `single-threads/`). The header value is derived from **which setup is active**, not from env or context:

- If `test-setup-pool.ts` is loaded → `X-Run-Type: single-pool`
- If `test-setup-threads.ts` is loaded → `X-Run-Type: single-threads`

This is done in `test-setup-core.ts` (`buildTestHeadersFromContext`) using `globalThis.__TEST_POOL_CONTEXT` (set only by pool setup). Pool and threads never pass run type through env or context for the header; it is fixed by the setup file.

**How pool vs threads vs unstable is chosen (worker-helper):**

- **`getTestWorker()`** (in `infra/cloudflare/tests/helpers/worker-helper.ts`) decides the runtime:
  - If `TEST_MODE=real` or `cloud` → **real worker** (external HTTP via `WORKER_URL`).
  - Else if **unstable mode** → **`unstable_dev`** (separate wrangler process, HTTP server). Unstable is used when:
    - `TEST_RUNNER=unstable` (env), or
    - The current test file is in the **unstable list** (from `test-runner/suite-type-map.json`: `runIn: 'unstable'`), or
    - The call stack contains a path from that list.
  - Else → **pool workers** (in-process `SELF.fetch` via `test-setup-pool.ts`). No separate process; bindings come from the Vitest config (`miniflare.bindings` = `TestWorkerBindings` + overrides).

- **Bindings:** In pool mode, bindings are set once in `vitest.*.config.ts` (`poolOptions.workers.miniflare.bindings`). All new env vars (e.g. `TURNSTILE_SECRET_KEY`) must be added to `tests/constants/test-worker-bindings.ts` so they are included in every config that spreads `TestWorkerBindings`.

- **URL normalization:** For pool and unstable, requests use `TestConfig.TestApiUrlPlaceholder` (`https://api.test`) as the host. The worker receives the full URL; `pathname` is used for routing. Use endpoint-domain constants (e.g. `StripeEndpoint.CreateCheckoutSession`) when building URLs so the path matches the route manifest.

### NDJSON Content

Each per-test NDJSON file and the suite summary file have the same structure for both pool and threads:

| Line / Type | Content |
|-------------|---------|
| **Line 1** | `test_result` – test name, status (`passed`/`failed`), duration, run_id, run_type, suite_type |
| **Lines 2+** | Worker debug logs – `origin: "worker"`, `lvl: "debug"`, router/index/route messages |
| **Suite file** | `run_summary` – passed/failed/timeout/unstable counts for the run |

**Pass/fail:** The first line of each per-test file is always a `test_result` with `status`. The suite file (e.g. `admin-check.test.ts.ndjson`) has a `run_summary` with `passed`, `failed`, `timeout`, `unstable`.

**Worker logs:** Both pool and threads send worker logs to the bridge; both produce the same log message types (e.g. `[INDEX]`, `[ROUTER-MATCH]`, `[ROUTES]`). Pool and threads NDJSON are **structurally identical**; only run_id, run_type, timestamps, and runtime details (e.g. url, stack file) differ.

### Directory Structure

```text
packages/logging-domain/
├── logs/cloudflare/
│   ├── single-pool/
│   │   ├── unit/
│   │   │   └── {test-file}/
│   │   │       └── {test-name}.ndjson
│   │   ├── integration/
│   │   └── e2e/
│   └── single-threads/
│       ├── unit/
│       ├── integration/
│       └── e2e/
├── db/
│   ├── cloudflare-log.duckdb
│   └── ingest-manifest-cloudflare.json
└── scripts/
    ├── rebuild-db-from-ndjson.ts
    └── query-test-logs.ts
```

### Staleness Check

The query tool checks if the DuckDB is up-to-date with NDJSON files:

| Query Type | Staleness Behavior |
|------------|-------------------|
| `by-run`, `test`, `logs` | **Skip check** (queries specific data) |
| `failed --suite-type=unit` | Checks `*/unit/` directories only |
| `failed --run-type=single-pool` | Checks `single-pool/` only |
| `failed` (no scope) | Checks ALL directories |

If stale, run `npm run db:rebuild` from `packages/logging-domain/`.

---

## Common Workflows

### Run Single Test File and Query Results

```bash
# From infra/cloudflare/
npm run test:unit:helper -- tests/unit/admin-check.test.ts

# Query results (run-id shown in output)
npm run test:query -- by-run <run-id>

# Or query with logs
SHOW_LOGS=1 npm run test:query -- by-run <run-id>
SHOW_LOGS=1 ERRORS_ONLY=1 npm run test:query -- by-run <run-id>
```

### Run All Unit Tests and Find Failures

```bash
# From infra/cloudflare/
npm run test:unit:helper

# Query failures
npm run test:query:failed:unit

# Query failures in pool mode only
npm run test:query:failed:unit:pool

# Query tests failing in BOTH modes
npm run test:query:failed:both
```

### Run Full Test Suite

```bash
# From infra/cloudflare/
npm run test:helper

# Query all failures
npm run test:query:failed

# Get stats
npm run test:query:stats
```

### Debug a Specific Test

```bash
# Get test details
npm run test:query -- test "should handle authentication" <run-id>

# Search logs for a keyword
npm run test:query -- search "401"

# Get error logs
npm run test:query -- errors "should handle authentication"
```

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SHOW_LOGS=1` | Include full logs in `by-run` queries |
| `--errors-only` / `ERRORS_ONLY=1` | With `by-run` + logs: show only error-level log lines (keeps output short). Use env: npm strips `--errors-only`. |
| `LOG_DB_DOMAIN` | Database domain (default: `cloudflare`) |
| `SKIP_BRIDGE_CHECK` | Skip log bridge health check |
| `SKIP_LOGGING_DOMAIN_BUILD` | Skip preflight build |

---

## Troubleshooting

### "DB is stale" Error

The query tool detected NDJSON files that aren't in DuckDB.

**Fix:** Run the appropriate ingest:

```bash
# Full rebuild
cd packages/logging-domain && npm run db:rebuild

# Or use scoped query to avoid the check
npm run test:query:failed:unit:pool
```

### "Log bridge is not running" Error

The test helper requires the log bridge to be running.

**Fix:** Start the bridge:

```bash
# From packages/logging-domain/
npm run bridge
```

Or use VS Code task: "Start tunnel and log bridge"

### No Tests Found

The helper couldn't find test files in the expected directory.

**Check:**

- File path is correct
- File ends with `.test.ts`
- File is in the correct `tests/{type}/` folder

### Query Returns No Results

The data might not be in DuckDB yet.

**Check:**

- Test helper completed successfully
- DuckDB ingest ran (look for "DuckDB ingest" in output)
- Run ID is correct (UUIDs are case-sensitive)

### Capturing Terminal Output

The helper writes its own summary to `test-runner/logs/` (e.g. `single-admin-check-helper-results.txt`). To capture **terminal** output (stdout/stderr) to a file, redirect to a **different** path so the file is not locked:

```bash
# Good: redirect to a different file
npm run test:unit:helper -- tests/unit/admin-check.test.ts > output.txt 2>&1

# Or (PowerShell) tee to a file
npm run test:unit:helper -- tests/unit/admin-check.test.ts 2>&1 | Tee-Object test.log
```

**Readable test.log (no ANSI codes):** Raw tee keeps Vitest/wrangler ANSI codes, which can show as garbage in editors. For a clean log without colors/codes, run with `CI=1` so Vitest uses plain text, then tee:

```powershell
# PowerShell: clean test.log (no ANSI)
$env:CI = "1"; npm run test:e2e:unstable:helper -- tests/e2e/upload-download.test.ts 2>&1 | Tee-Object test.log
```

**Avoid:** Redirecting to the same path the helper uses (e.g. `single-admin-check-helper-results.txt`) causes EBUSY on Windows because the helper also writes there.
