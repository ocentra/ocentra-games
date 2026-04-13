# test-runner/script - What's New vs Legacy

Use this to know what to run and what is deprecated.

---

## Entry points (what you run)

| Script | Type | What it does | Use when |
|--------|------|--------------|----------|
| **run-full-suite.ts** | **CURRENT** | Full orchestrator: Vitest -> coverage -> analytics -> schemathesis -> k6 -> mutation -> static -> observability -> report. Supports `[local|real|cloud]`, `--skip-tests=...`, `--open`. Logs via NDJSON/tunnel. | `npm run test:full` |
| **run-full-suite-interactive.ts** | **CURRENT** | Interactive terminal: checkbox menu to select steps (Vitest, coverage, analytics, schemathesis, k6, mutation, static-analysis, observability), then run full suite with selected steps + optional open report. Cross-platform (Node.js + @inquirer/prompts). | `npm run test:full` |
| **run-all-tests.ts** | **LEGACY** | Old monolithic runner (~2700 lines). Kept as reference. Delete when proven. | Do not use |

---

## Standalone run-* scripts (use directly or via orchestrator)

| Script | Type | npm script | Notes |
|--------|------|------------|-------|
| run-schemathesis.ts | **NEW** | `test:schemathesis` | API fuzzing; auto-starts worker if needed |
| run-k6.ts | **NEW** | `test:k6` | Load tests; auto-starts worker if needed |
| run-static-analysis.ts | **NEW** | `test:static-analysis` | Semgrep, Trivy, CodeQL (via run-codeql) |
| run-codeql.ts | **NEW** | `test:codeql` | CodeQL static analysis (standalone or via run-static-analysis) |
| run-observability.ts | **NEW** | `test:observability` | Observability checks |
| run-coverage.ts | **NEW** | `test:runner:coverage` | Coverage + dark theme |
| run-mutation-only.ts | **NEW** | `test:runner:mutation` | Collects @mutation targets + Stryker |
| run-mutation-tests.ts | **LEGACY** | `test:mutation` | Stryker only; uses plan if present. Prefer run-mutation-only. |

---

## Report and lib (supporting)

| Path | Type | Purpose |
|------|------|---------|
| report/generate-test-report.ts | **NEW** | Builds `test-report.html` from DuckDB + ReportJson |
| report/summary-reporter.ts | Support | Vitest summary reporter |
| report/test-coverage.ts | Support | Coverage runner |
| report/apply-dark-theme-coverage.ts | Support | Dark theme for coverage HTML |
| lib/suite-type-map.ts | Support | Suite type -> file mapping |
| lib/suite-type-collector.ts | Support | Collects suite types from sources |
| lib/mutation-collector.ts | Support | Finds @mutation targets |
| lib/path-utils.ts | Support | Path helpers |
| lib/extract-name.ts | Support | Name extraction for reports |
| codegen/generate-k6-constants.ts | Support | Generates k6 constants |
| servers/test-log-server.ts | Support | Test log server |

---

## Legacy / generated (do not run directly)

| Item | Notes |
|------|-------|
| semgrep-results.json, codeql-results.json | Output artifacts in script dir; some may be legacy paths. |

---

## Quick reference

- Full suite (all platforms): `npm run test:full` or `npm run test:full -- --skip-tests=k6,mutation`
- Full suite (pick steps, run, open report): `npm run test:full` - terminal prompts, cross-platform
- Individual steps: `npm run test:k6`, `npm run test:schemathesis`, etc.
- Report only: `npm run test:report` -> `test-runner/reports/test-report.html`
