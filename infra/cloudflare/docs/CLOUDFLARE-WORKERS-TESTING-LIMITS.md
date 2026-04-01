# Cloudflare Workers Testing Limits (Platform Constraint)

**Purpose:** Document the workerd runtime boundary that blocks coverage and mutation testing for Worker code. **Codex and all agents: read this before struggling with coverage/mutation on integration/E2E.** This is a platform constraint, not a gap we can close with more tests.

**Last updated:** 2026-02-14

---

## TL;DR

| Test type | Runtime | Coverage | Mutation | Config |
|-----------|---------|----------|----------|--------|
| **Unit** (+ contract consumers) | Node | Yes | Yes (for `@mutation` logic) | `vitest.coverage.config.ts`, `vitest.mutation.config.ts` |
| **Integration / E2E** | workerd | No | No | `vitest.config.ts` (Workers pool) |

**Strategy:** Units run in Node; integration/E2E run in workerd. Compensate for workerd's blindness with property/invariant tests.

---

## Why This Happens

### Node vs workerd

- **Istanbul** (coverage) instruments code as it runs in the **Node process**.
- **Stryker** (mutation) mutates source, runs tests, checks if mutants are killed. Mutants must execute in the test process.
- **Worker code** runs in **workerd** (Cloudflare's runtime), a separate process/isolate.

When tests run via `@cloudflare/vitest-pool-workers`, the Worker (and integration tests) execute inside workerd. Istanbul and Stryker run in Node and never see that execution. **No amount of config fixes this** — it's a runtime boundary.

### Miniflare v2 vs v3

- **Miniflare v2** (deprecated): Worker ran in Node (simulator). Istanbul/mutation would have worked.
- **Miniflare v3** (current): Uses workerd for production fidelity. Same limitation.

### unstable_dev

Even with `unstable_dev` (worker in separate process, tests in Node): the **worker** still runs in workerd. Istanbul still cannot see into it.

---

## What We Did (Coverage Setup)

1. **Coverage config** (`vitest.coverage.config.ts`):
   - `environment: 'node'` (not Workers pool)
   - `include`: `tests/unit/**/*.test.ts`, `tests/contracts/consumers/**/*.test.ts`
   - `exclude`: `auth.test.ts`, `worker-helper.test.ts`, `tests/contracts/providers/**`
   - Istanbul collects coverage for logic/utils/constants that run in Node
   - Run via `npm run test:runner:coverage`

2. **Mutation config** (`vitest.mutation.config.ts`):
   - `environment: 'node'`
   - Curated unit test subset that exercises `@mutation`-decorated logic
   - Run via `npm run test:runner:mutation`

3. **Main tests** (`vitest.config.ts`):
   - Workers pool for integration/E2E
   - No coverage, no mutation — rely on behavior and invariant tests

---

## What Big Orgs Do

Enterprise adopters (Discord, DoorDash, npm, etc.) use the same pattern:

- **Logic in Node** → unit tests, coverage, mutation
- **Handlers thin** → integration tests hit real runtime
- **Property/invariant tests** → compensate for no coverage of workerd code

---

## Compensating for Workerd Blindness

Since we cannot get coverage or mutation on integration/E2E:

1. **Strong property/invariant tests** — assert invariants at the boundary (balance never negative, no double spend, idempotency, etc.).
2. **Security tests** — auth, CORS, rate limits, replay, concurrency.
3. **Contract tests** — API contract stability.

See `ocentra-security-rules.mdc` Rule 15.1 (invariants), Rule 15.4 (economic), Rule 15.5 (concurrency).

---

## References

- [Cloudflare Workers Vitest known issues](https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/) — coverage, fake timers, DO alarms, etc.
- [workers-sdk #5266](https://github.com/cloudflare/workers-sdk/issues/5266) — V8 coverage not supported; Istanbul workaround (sometimes works, sometimes not with Workers pool).
- [Miniflare writing tests](https://developers.cloudflare.com/workers/testing/miniflare/writing-tests/) — "only your Worker itself is running in workerd — your test files run in Node.js".
