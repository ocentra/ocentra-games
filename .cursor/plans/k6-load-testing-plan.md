# k6 Load Testing Plan

## Overview
This plan defines the load-testing strategy for `infra/cloudflare/tests/k6/`.
The goal is to keep the current pressure tests useful, centralized, and aligned with the actual worker contracts and real runtime chains in the codebase.

The load suite should answer one question very clearly:
can the worker survive concurrency and pressure without breaking correctness, idempotency, or contract centralization?

## Current State

### What Exists Today
- `concurrency.test.js`
- `same-user-contention.test.js`
- `idempotency-concurrent.test.js`
- `burst-ddos.test.js`
- `soak.test.js`
- `memory-pressure.test.js`
- `cross-endpoint-concurrency.test.js`
- `badge-concurrent-unlock.test.js`
- `fd-exhaustion.test.js`

### What Those Tests Actually Cover
- Credits balance, purchase, contention, idempotency, soak, and memory pressure
- Badge unlock contention and cross-endpoint state interaction with credits
- WebSocket / signaling connection pressure

### What They Do Not Yet Cover
- Match finalization under load
- Payment flow pressure
- Progression/reward flow pressure beyond badge unlock and credits
- Other real multi-DO chains that are not already proven by the current k6 inventory

### Current Issues
- Some scripts still use local assumptions that need to stay synchronized with the current worker contract
- The harness can fail on startup or logging behavior before the application logic is exercised
- The load suite is still too narrow to claim it covers every major orchestration chain

## Principles

1. Use centralized contracts.
   - Route constants, headers, methods, query keys, path builders, idempotency helpers, and payload examples must come from domain packages.
   - No load script should invent its own route string or payload shape if a shared export already exists.

2. Test the real system, not a guessed system.
   - A load scenario must be tied to an actual route, flow, or DO chain that exists in the repo.
   - If the chain does not exist, do not add a load test for it yet.

3. Keep the harness boring.
   - Worker startup, health checks, and log flushing must not create false failures.
   - A k6 failure should mean the app failed, not the test wrapper.

4. Treat idempotency as part of the contract.
   - Money-critical and stateful write paths must use deterministic idempotency keys.
   - Concurrent tests must verify that retry or replay does not create extra value.

5. Separate pressure types.
   - Contention tests
   - Soak tests
   - Memory-pressure tests
   - WebSocket / FD pressure tests
   - Cross-endpoint correctness tests

## Centralized Sources Of Truth

### Shared Contract Inputs
- `@ocentra/endpoint-domain`
- `@ocentra/boundary-domain`
- `@ocentra/logging-domain`

### Required k6 Helper Ownership
- `tests/k6/constants.js` must remain generated or derived from centralized sources
- Auth and idempotency helpers should be shared across scripts
- Test-name and run-type metadata should be standardized so the harness can recognize load runs

### Required Contract Discipline
- No local route strings if a domain export exists
- No local header literals if a shared constant exists
- No local idempotency key semantics if a shared validator exists
- No local payload shapes for money-critical routes if a shared schema exists

## Inventory

### 1. Credits Contention
Files:
- `infra/cloudflare/tests/k6/concurrency.test.js`
- `infra/cloudflare/tests/k6/same-user-contention.test.js`
- `infra/cloudflare/tests/k6/idempotency-concurrent.test.js`
- `infra/cloudflare/tests/k6/burst-ddos.test.js`

Coverage:
- balance
- purchase
- concurrent purchase replay
- same-user contention
- burst rejection behavior

Status:
- Keep
- Fix to remain aligned with the current purchase contract

### 2. Badge / Reward Contention
Files:
- `infra/cloudflare/tests/k6/badge-concurrent-unlock.test.js`
- `infra/cloudflare/tests/k6/cross-endpoint-concurrency.test.js`

Coverage:
- badge unlock contention
- badge and credits concurrent state interaction

Status:
- Keep
- Fix if the badge reward contract changes

### 3. Soak And Memory Pressure
Files:
- `infra/cloudflare/tests/k6/soak.test.js`
- `infra/cloudflare/tests/k6/memory-pressure.test.js`

Coverage:
- longer runtime stability
- resource pressure

Status:
- Keep
- Treat as infrastructure pressure, not business-logic correctness

### 4. WebSocket / FD Pressure
Files:
- `infra/cloudflare/tests/k6/fd-exhaustion.test.js`

Coverage:
- signaling / websocket connection pressure

Status:
- Keep
- Must be validated against the real signaling path and worker availability

## Gaps

### Confirmed Gaps
- No current k6 test for match finalization
- No current k6 test for payment checkout / payment webhook flow
- No current k6 test for progression update pressure outside the badge-reward path
- No current k6 test for multi-DO orchestration chains beyond credits plus badges

### Unverified Ideas
- A “joint pressure” scenario spanning match, credits, progression, and leaderboard
- A single hot-shard test for a queue-like singleton DO
- A distributed lock contention test for user-key or profile update paths

These ideas should not be implemented until the corresponding routes and DO chains are confirmed in the codebase and the expected invariants are written down first.

## Phases

### Phase 1: Centralize The k6 Contract Layer
- Generate and consume shared constants for:
  - API routes
  - headers
  - auth schemes
  - idempotency keys
  - request payload builders
- Move any repeated test payload construction into shared helpers.
- Keep the generated `tests/k6/constants.js` in sync with `endpoint-domain`.

### Phase 2: Stabilize The Harness
- Make worker startup and health checks deterministic.
- Separate application failures from harness failures.
- Avoid log-flush behavior that makes load tests measure logging I/O instead of application behavior.

### Phase 3: Reconcile Existing Scripts
- Confirm each script uses the current worker contract.
- Fix payloads, headers, and route usage where needed.
- Preserve deterministic success and failure expectations.

### Phase 4: Classify Scripts
- `keep` for scripts that still represent real pressure on a current route
- `fix` for scripts that still represent a real route but have stale payloads or assumptions
- `delete` for scripts that no longer correspond to a real route or useful invariant
- `defer` for scenarios that require a new real route or a larger orchestration refactor first

### Phase 5: Add Real Cross-DO Scenarios Only
- Add a new scenario only when:
  - the route exists
  - the chain is real
  - the invariant is written
  - the test data can be seeded deterministically

## Test Plan

### Baseline Runs
- `npm run test:k6`
- `npm run test:schemathesis`
- `npm run test:helper`

### Expected Verification Order
1. Centralized helper and constants updates
2. Harness stability fixes
3. Existing k6 script reconciliation
4. New scenario additions only after the above are green

### Success Criteria
- k6 runs pass without harness-induced false failures
- Credits and badge pressure tests remain deterministic
- Load scripts do not duplicate contract definitions locally
- Any new cross-DO pressure test maps to a real, existing chain

## Non-Goals
- Do not invent a load test for a route or DO chain that does not exist
- Do not expand the suite by guesswork
- Do not use k6 to validate application logic that belongs in unit, integration, contract, or Schemathesis tests
- Do not let logging backpressure become the thing the load suite measures unless the goal is specifically logger resilience

## Notes
- The current `k6` suite is valuable, but it is not a full system load model yet.
- The right next step is to standardize the shared helpers and stabilize the harness before adding any new scenarios.
- Once the inventory and contract layer are fully centralized, the suite can be expanded with confidence instead of speculation.
