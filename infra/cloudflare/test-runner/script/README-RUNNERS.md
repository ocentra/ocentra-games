# Standalone test runners (coverage & mutation)

These scripts are the single entry points for **coverage** and **mutation** testing. They are not tied to the interactive `run-all-tests.ts` menu; use them directly for CI or local runs.

## GUI & interactive runners

| Script | npm script | Description |
|--------|------------|-------------|
| `run-full-suite.ts` | `npm run test:full` | Full suite: Vitest → coverage → schemathesis → k6 → mutation → static → observability → report. Cross-platform. |
| `run-full-suite-interactive.ts` | `npm run test:full` | Interactive terminal: checkbox menu to pick steps, optional open report. Cross-platform. |
| `run-suite-helper.ts` | `npm run test:helper` | CLI helper: runs all suite types (unit, integration, e2e, contract) in both pool and threads modes. |
| Vitest UI | `npm run test:ui` | Vitest's built-in browser UI for running and debugging tests. |

**Usage (from `infra/cloudflare/`):**

```bash
# Full suite – Vitest + optional steps (cross-platform)
npm run test:full

# Interactive GUI – pick steps, run, open report (cross-platform)
npm run test:full

# CLI helper – full suite, pool + threads
npm run test:helper

# Vitest UI – browser-based test runner
npm run test:ui
```

## Coverage

| Script | npm script | Description |
|--------|------------|-------------|
| `run-coverage.ts` | `npm run test:runner:coverage` | Runs Vitest with coverage, applies dark theme, prints summary. No browser open unless `OPEN=1` or `--open`. |

**Usage (from `infra/cloudflare/`):**

```bash
npm run test:runner:coverage
OPEN=1 npm run test:runner:coverage   # also open report in browser (Unix)
npm run test:runner:coverage -- --open
```

- **test:coverage** – Same idea but always opens the report at the end (uses `test-coverage.ts`).
- **test:coverage:check** – Runs vitest with coverage and enforces threshold (e.g. 95/90/95/95).

## Mutation

| Script | npm script | Description |
|--------|------------|-------------|
| `run-mutation-only.ts` | `npm run test:runner:mutation` | Collects `@mutation` targets (mutation-collector), then runs Stryker. Single flow for mutation-only runs. |
| `run-mutation-tests.ts` | `npm run test:mutation` | Runs Stryker only; uses existing `test-runner/ReportJson/mutation-plan.json` or collects targets if missing. |

**Usage (from `infra/cloudflare/`):**

```bash
npm run test:runner:mutation   # collect + Stryker (recommended for standalone)
npm run test:mutation          # Stryker only (uses or creates plan)
```

Mutation is opt-in: only code with `@mutation` JSDoc is mutated (see `.cursor/rules/ocentra-mutation-rules.mdc`).

## run-all-tests.ts

The legacy menu-driven runner delegates to these scripts instead of inlining logic:

- When **Coverage only** is selected (Vitest not run): runs `npm run test:runner:coverage`.
- When **Mutation** is selected: runs `npm run test:runner:mutation`.

So coverage and mutation behavior live in the scripts above; `run-all-tests.ts` only orchestrates and reports.
