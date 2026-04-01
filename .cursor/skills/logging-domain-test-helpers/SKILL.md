---
name: logging-domain-test-helpers
description: Run Cloudflare tests with logging, ingest to DuckDB, and query test results. Use when running infra/cloudflare tests, debugging test failures, querying by run ID or test name, or when the user asks about test:helper, test:query, log bridge, or DuckDB test logs.
---

# Logging-Domain Test Helpers

Quick reference for test helper and query commands. All helper and query commands run from **`infra/cloudflare/`** unless noted. DuckDB ingest runs from **`packages/logging-domain/`**.

## When to Use

- User wants to run tests with logging and get queryable results.
- User is debugging a failing test and needs run ID, logs, or error-only output.
- User asks about `test:helper`, `test:query`, `test:query:failed`, log bridge, or DuckDB test logs.
- User needs to run a single test file with helper or query results by run ID.

## Test Helper Commands (infra/cloudflare)

| Command | Scope |
|---------|--------|
| `npm run test:unit:helper` | Unit, pool + threads |
| `npm run test:unit:pool:helper` | Unit, pool only |
| `npm run test:unit:threads:helper` | Unit, threads only |
| `npm run test:integration:helper` | Integration, both modes |
| `npm run test:integration:pool:helper` | Integration, pool only |
| `npm run test:integration:threads:helper` | Integration, threads only |
| `npm run test:e2e:helper` | E2E, both modes |
| `npm run test:e2e:pool:helper` | E2E, pool only |
| `npm run test:e2e:threads:helper` | E2E, threads only |
| `npm run test:e2e:unstable:helper` | E2E with helper in unstable mode |
| `npm run test:helper` | All test types (unit, integration, e2e, contract) |

### Single file

Append the test file as a positional argument. Use full path under `tests/{type}/` or bare filename:

```bash
npm run test:unit:helper -- tests/unit/admin-check.test.ts
npm run test:unit:helper -- admin-check.test.ts
npm run test:integration:helper -- property-invariants.test.ts
npm run test:unit:pool:helper -- tests/unit/admin-check.test.ts
npm run test:e2e:unstable:helper -- tests/e2e/upload-download.test.ts
```

Results are written to `infra/cloudflare/test-runner/logs/` (e.g. `unit-test-helper-results.txt`, `single-admin-check-helper-results.txt`).

## Query Commands (infra/cloudflare)

### Failed tests

| Command | Scope |
|---------|--------|
| `npm run test:query:failed` | All failures |
| `npm run test:query:failed:unit` | Unit only |
| `npm run test:query:failed:integration` | Integration only |
| `npm run test:query:failed:e2e` | E2E only |
| `npm run test:query:failed:contract` | Contract only |
| `npm run test:query:failed:pool` | Pool mode only |
| `npm run test:query:failed:threads` | Threads mode only |
| `npm run test:query:failed:unit:pool` | Unit + pool |
| `npm run test:query:failed:unit:threads` | Unit + threads |
| `npm run test:query:failed:both` | Failing in BOTH modes |

### Stats

| Command | Scope |
|---------|--------|
| `npm run test:query:stats` | All stats |
| `npm run test:query:stats:unit` | Unit |
| `npm run test:query:stats:integration` | Integration |
| `npm run test:query:stats:e2e` | E2E |
| `npm run test:query:stats:pool` | Pool mode |
| `npm run test:query:stats:threads` | Threads mode |

### By run ID or test name

```bash
npm run test:query -- by-run <run-id>
npm run test:query -- by-run <run-id>   # with SHOW_LOGS=1 for full logs
npm run test:query -- failed <run-id>
npm run test:query -- test "<test-name>" [run-id]
npm run test:query -- search "<query>"
npm run test:query -- errors "<test-name>"
```

**With full logs (Bash/Git Bash):**

```bash
SHOW_LOGS=1 npm run test:query -- by-run <run-id>
SHOW_LOGS=1 ERRORS_ONLY=1 npm run test:query -- by-run <run-id>
```

**PowerShell:**

```powershell
$env:SHOW_LOGS="1"; npm run test:query -- by-run <run-id>
$env:SHOW_LOGS="1"; $env:ERRORS_ONLY="1"; npm run test:query -- by-run <run-id>
```

## DuckDB Ingest (packages/logging-domain)

```bash
cd packages/logging-domain
npm run db:rebuild
```

Scoped ingest (used automatically by test helpers):

```bash
npx tsx scripts/rebuild-db-from-ndjson.ts --run-type=single-pool --suite-type=unit --domain=cloudflare
```

Run types: `single-pool`, `single-threads`, `single`, `full`. Suite types: `unit`, `integration`, `e2e`, `contract`.

## Common Workflows

**Run single test and query by run ID:**

```bash
cd infra/cloudflare
npm run test:unit:helper -- tests/unit/admin-check.test.ts
npm run test:query -- by-run <run-id>
# or with logs:
SHOW_LOGS=1 npm run test:query -- by-run <run-id>
```

**Run all unit tests and find failures:**

```bash
npm run test:unit:helper
npm run test:query:failed:unit
npm run test:query:failed:unit:pool
npm run test:query:failed:both
```

**Full suite:**

```bash
npm run test:helper
npm run test:query:failed
npm run test:query:stats
```

**Debug a specific test:**

```bash
npm run test:query -- test "should handle authentication" <run-id>
npm run test:query -- search "401"
npm run test:query -- errors "should handle authentication"
```

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `SHOW_LOGS=1` | Include full logs in `by-run` queries |
| `ERRORS_ONLY=1` | With `by-run` + logs: show only error-level lines |
| `LOG_DB_DOMAIN` | Database domain (default: `cloudflare`) |
| `SKIP_BRIDGE_CHECK` | Skip log bridge health check |
| `SKIP_LOGGING_DOMAIN_BUILD` | Skip preflight build |
| `CI=1` | Plain text output (no ANSI), useful when teeing to a file |

## Troubleshooting

- **"DB is stale"** → Run `cd packages/logging-domain && npm run db:rebuild` or use a scoped query (e.g. `test:query:failed:unit:pool`).
- **"Log bridge is not running"** → From `packages/logging-domain/`: `npm run bridge` (or VS Code task "Start tunnel and log bridge").
- **Query returns no results** → Confirm helper completed and ingest ran; run ID is correct (UUIDs case-sensitive).
- **Capture terminal output** → Redirect to a **different** path than the helper’s (e.g. `> output.txt 2>&1`). Do not redirect to the same path as the helper’s results file (e.g. `single-admin-check-helper-results.txt`) to avoid EBUSY on Windows. For clean logs without ANSI: `CI=1` then tee.

## Full Reference

For flow (preflight, wipe, run, ingest, results), pool vs threads setup, NDJSON layout, directory structure, and detailed troubleshooting, see [packages/logging-domain/docs/TEST-HELPER-COMMANDS.md](packages/logging-domain/docs/TEST-HELPER-COMMANDS.md). For in-skill detail, see [REFERENCE.md](REFERENCE.md).
