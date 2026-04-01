# Rule Documents and Checkpoints

Use this as the checklist when running the Rules vs Cloudflare compliance check. Rule files live in `.cursor/rules/`. For each checkpoint, mark **Pass**, **Fail** (with file:line or excerpt), or **Gap** (not applicable or not verifiable in scope).

---

## 1. ocentra-security-rules.mdc

**File:** `.cursor/rules/ocentra-security-rules.mdc`

| # | Checkpoint | How to verify (infra/cloudflare) |
|---|------------|----------------------------------|
| 1.1 | Security tests exist for money-critical endpoints (credits, payments, escrow, shop) | In `tests/`, find tests that assert rejection (401/403, invalid auth, replay, schema violations). Rule 14.16: all applicable categories must have at least one test. |
| 1.2 | Tests assert rejection behavior, not "no crash" | Sample security test files (e.g. credits-security, badges-security, security.test.ts): assertions must be exact (status, body/error), not just `not.toThrow()` or truthy. Rule 13. |
| 1.3 | Concurrency tests assert final state / economic invariants, not HTTP status counts | Search for `Promise.all` or concurrent request tests; ensure they assert e.g. single resource created, balance unchanged (Rule 14.8.5, 16.2.1). |
| 1.4 | Abort tests assert economic invariants, not timing | If any test uses AbortController: must assert final state (e.g. at most one reward), not "request did not complete" (Rule 15.4.5.6, 16.2.2). |
| 1.5 | Idempotency: client-provided idempotency keys where required | In handlers/DOs and tests for mutate endpoints: idempotency keys should be from request, not server-generated for client requests (Rule 6.1.0). |
| 1.6 | No optional validation on money paths | Money-related handlers must validate all required fields and reject invalid input at boundary (Rule 5.x, 14.3). |

---

## 2. ocentra-security-guidelines.mdc

**File:** `.cursor/rules/ocentra-security-guidelines.mdc`

| # | Checkpoint | How to verify |
|---|------------|----------------|
| 2.1 | Security tests map to threats / invariants | In security test files, look for comments or structure that reference rule numbers or invariants (e.g. Rule 0.1.1, 14.x). §7.1: test must map to threat and invariant. |
| 2.2 | No mocks for money logic in tests | In `tests/integration/` and `tests/e2e/`: no `vi.fn().mockResolvedValue` (or equivalent) for storage, credits, payments, or business logic (§2.9.3). |
| 2.3 | Test categories present for money-critical endpoints | For credits, payments, shop, escrow: at least negative, replay, concurrency, and (where applicable) rollback/compensation tests (§3, §8.3.1). |
| 2.4 | Fuzz/property tests log seeds or counterexamples | If property-based or fuzz tests exist: they must log seeds/counterexamples on failure (§2.8, §4). |

---

## 3. ocentra-test-rules.mdc

**File:** `.cursor/rules/ocentra-test-rules.mdc`

| # | Checkpoint | How to verify |
|---|------------|----------------|
| 3.1 | Flat test layout: one top-level describe, flat `it` blocks with prefixed names | In `tests/**/*.test.ts`: avoid deep `describe` nesting; prefer `it('handlerName: behavior', ...)` (§0.3). |
| 3.2 | Tests test behavior, not prerequisites (e.g. CORS/auth in handler tests) | In handler-specific tests (e.g. credits): assertions should be about balance, purchase result, etc.; CORS/auth rejection belongs in dedicated CORS/auth tests (§2.1). |
| 3.3 | No weak assertions: no toBeDefined, toBeTruthy, not.toThrow() as sole assertion | Grep for these in `tests/`; flag tests that rely on them for correctness (§7). |
| 3.4 | Correctness vs Security vs Regression: each test in one class | Spot-check: security tests should assert rejection and map to guarantees; correctness tests should assert observable behavior (§0.1). |
| 3.5 | Integration tests use emulation (e.g. unstable_dev), not mocks for storage/auth | Test setup should use real worker/storage where applicable (§10.2). |
| 3.6 | describe/it use extractName(import.meta.url), testName(...) where specified | In test files: look for `describe(extractName(import.meta.url), ...)` and `it(testName('...'), ...)` per project conventions. |

---

## 4. ocentra-mutation-rules.mdc

**File:** `.cursor/rules/ocentra-mutation-rules.mdc`

| # | Checkpoint | How to verify |
|---|------------|----------------|
| 4.1 | Mutation is opt-in: only `@mutation`-decorated code is in mutation scope | If mutation testing is used: no mutation of entire modules or undecorated code (§1, §2). |
| 4.2 | No mutation of regex, URL builders, constants, UI, adapters | Mutation config or docs should exclude these (§4). |
| 4.3 | Business logic under mutation has explicit invariants | Any `@mutation` usage should be in code that has clear invariants (e.g. balance ≥ 0) (§5). |

---

## 5. ocentra-endpoint-domain-rules.mdc

**File:** `.cursor/rules/ocentra-endpoint-domain-rules.mdc`

**Scope:** Applies to `packages/endpoint-domain/`. For **infra/cloudflare** compliance, check that Cloudflare code **uses** endpoint-domain correctly.

| # | Checkpoint | How to verify |
|---|------------|----------------|
| 5.1 | Handlers use path/method constants from endpoint-domain (no raw path strings) | In `infra/cloudflare/src/handlers/`: routes and paths should use constants from `@ocentra/endpoint-domain` or equivalent, not raw `'/api/v1/...'`. |
| 5.2 | Tests use same constants for URLs/paths | In `infra/cloudflare/tests/`: request URLs should use endpoint-domain constants or shared helpers that use them. |

---

## 6. ocentra-durable-objects-rules.md

**File:** `.cursor/rules/ocentra-durable-objects-rules.md`

| # | Checkpoint | How to verify |
|---|------------|----------------|
| 6.1 | DO is single writer for its state; no KV/R2 writes from callers for that domain | In handlers that call DOs: mutations to DO-owned state go through DO `stub.fetch()`, not direct KV/R2. |
| 6.2 | Idempotency keys for externally triggered mutations; stored in DO with TTL pruning | In DO code and DO tests: mutate endpoints accept idempotency key; DO stores processed keys and prunes. |
| 6.3 | No rate limiting, feature flags, or GET-then-PUT inside DO | DO code: no rate-limit logic, no feature-flag branches that change core behavior, no read-then-write patterns that assume no race. |
| 6.4 | State in ctx.storage; KV used as read-through cache only | DO implementation uses `ctx.storage` for authoritative state; KV usage (if any) is documented as cache. |
| 6.5 | DO tests exercise message boundary (fetch to DO), not internal function calls | Tests that hit DOs should use worker fetch or stub.fetch(), not call DO class methods directly. |

---

## 7. ocentra-cloudflare-logging.mdc

**File:** `.cursor/rules/ocentra-cloudflare-logging.mdc`

| # | Checkpoint | How to verify |
|---|------------|----------------|
| 7.1 | Handlers: Logger.instance, register(import.meta.url), logInfo/logWarn/logError/logDebug helpers | In `infra/cloudflare/src/handlers/*.ts`: presence of Logger registration and the four helpers (module scope). |
| 7.2 | DOs: private log, register in constructor, private logInfo/logWarn/logError/logDebug | In `infra/cloudflare/src/durable-objects/*.ts`: same pattern as class members. |
| 7.3 | Calls pass getStackTrace() as second argument | Any call to logInfo, logWarn, logError, logDebug must pass `getStackTrace()` as second arg. |
| 7.4 | Tests: same module-level Logger pattern | In `infra/cloudflare/tests/**/*.ts`: test files that are "new" or under audit should include Logger registration and helpers per rule. |
| 7.5 | Logging at entry, branch points, errors, important success | In a sample of handlers/DOs: at least one log at entry or branch or error or success with getStackTrace(). |

---

## Report order

When producing the compliance report, use this order and the checkpoint numbers above so the user can cross-reference with this file.
