# Logging-Domain Test Helpers — Reference

For full documentation see **packages/logging-domain/docs/TEST-HELPER-COMMANDS.md**. This file summarizes flow, layout, and pool vs threads so the agent can reason without opening the full doc.

## Test Helper Flow

When you run a test helper (e.g. `npm run test:unit:helper -- tests/unit/foo.test.ts`):

1. **Preflight** — Builds `@ocentra/logging-domain`, checks log bridge is running.
2. **Wipe NDJSON** (scoped) — Deletes NDJSON for the scope (e.g. `single-pool/unit/`, `single-threads/unit/`), not other test types.
3. **Run tests** — Pool mode then threads mode; logs written to NDJSON during execution.
4. **Ingest to DuckDB** (scoped) — Deletes old data for scope, inserts new data, updates manifest.
5. **Write results** — Summary to console, full log to results file in `test-runner/logs/`.

## Pool vs Threads

| Mode     | Setup file                          | Run type         | Where tests run                    |
|----------|-------------------------------------|------------------|------------------------------------|
| Pool     | `tests/test-setup-pool.ts`          | `single-pool`    | In-process Miniflare `SELF.fetch`  |
| Threads  | `tests/test-setup-threads.ts`       | `single-threads` | Node Vitest workers; worker via HTTP (`unstable_dev`) |

`X-Run-Type` is sent per request so the worker tags logs and the bridge writes to the right directory (`single-pool/` or `single-threads/`). Unstable mode uses threads-style run (separate wrangler process).

## Directory Structure

```
packages/logging-domain/
├── logs/cloudflare/
│   ├── single-pool/
│   │   ├── unit/   → {test-file}/{test-name}.ndjson
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

## NDJSON and Staleness

- Per-test file: line 1 = `test_result` (name, status, duration, run_id, run_type, suite_type); lines 2+ = worker debug logs.
- Suite file: `run_summary` with passed/failed/timeout/unstable counts.
- Query staleness: `by-run`, `test`, `logs` skip check; `failed`/`stats` with scope check only that scope (e.g. `*/unit/` or `single-pool/`). If stale, run `npm run db:rebuild` from `packages/logging-domain/`.
