# k6 Load Testing Plan

## Overview
This plan defines the load-testing strategy for `infra/cloudflare/tests/k6/`.
The goal is to keep the current pressure tests useful, centralized, and aligned with the actual worker contracts and real runtime chains in the codebase.

The load suite should answer one question very clearly:
can the worker survive concurrency and pressure without breaking correctness, idempotency, or contract centralization?

## Current State

### Granular Inventory of Current Coverage

The following k6 scripts are currently active and maintained. They primarily target the **Credits** and **Badges** domains.

#### 1. Credits & Economy Invariants
- **`concurrency.test.js`**: `GET /credits/:userId/balance`, `POST /credits/:userId/purchase`
  - **Invariant**: Validates balance arithmetic ($Initial + Added = New$) under isolated VU pressure.
- **`same-user-contention.test.js`**: 50 VUs targeting a SINGLE user ID.
  - **Invariant**: Verifies State Safety (no partial writes) and storage atomicity in a single `CreditsDO` instance.
- **`idempotency-concurrent.test.js`**: `Idempotency-Key` replay during active transit.
  - **Invariant**: Guarantees exactly one execution for duplicate keys; verifies cached response delivery for retries.
- **`burst-ddos.test.js`**: Rapid request spikes.
  - **Invariant**: Graceful degradation via `429 TooManyRequests` without triggering `500 InternalServerError`.

#### 2. Rewards & Cross-Domain Interaction
- **`badge-concurrent-unlock.test.js`**: `POST /badges/:userId/claim`
  - **Invariant**: **Economic Safety**: Exactly one GP reward issued even if 50 requests attempt to claim the same badge simultaneously.
- **`cross-endpoint-concurrency.test.js`**: Parallel calls to `/credits` and `/badges`.
  - **Invariant**: Verifies no state interference between disparate DO domains when updating shared user profile state.

#### 3. Infrastructure Pressure
- **`fd-exhaustion.test.js`**: WebSocket connection storm on `/ws/*`.
  - **Invariant**: Validates Worker FD limits and `SignalingDO` connection capacity.
- **`memory-pressure.test.js`**: Large payload injection (100KB+).
  - **Invariant**: Verifies heap stability and prevents memory-limit crashes under throughput.
- **`soak.test.js`**: 15-minute sustained traffic.
  - **Invariant**: Checks for resource leaks (storage CPU, memory) over extended durations.

### Comprehensive Gap Analysis

The current suite is "Credits-Heavy". While it proves our most critical money-path (CreditsDO) is resilient, it leaves significant operational blind spots in the game lifecycle and global singletons.

#### 1. Coverage Gap Matrix
| Domain / Component | Pressure Type | Current Status | Critical Risk Factor |
| :--- | :--- | :--- | :--- |
| **Credits & Badges** | Contention / Idempotency | **High** | None (centralization pending) |
| **Matchmaking** | Singleton Contention | **Zero** | $O(N^2)$ `tryMatch` + entire queue storage write on every join/leave. |
| **Leaderboard** | Global Write Contention | **Zero** | Sort/Put of 1000-entry array on every score upsert. |
| **Match Lifecycle** | Handshake / Orchestration | **Zero** | Latency chains in `MatchFinalizationFlow`. |
| **Signaling (Ws)** | Message Throughput | **Low** | Only connection count is tested; real broadcast pressure is missing. |
| **Audit Logging** | I/O Backpressure | **Zero** | High-volume writes potentially choking state operations. |

#### 2. Specific Missing Scenarios (High Priority)
- **The "Matchmaking Gauntlet"**: 5,000 concurrent tickets hitting `MatchmakingDO` with varied ELO/Region. Measures: `tryMatch` latency and Ticket-to-Match conversion rate.
- **The "Finalization bottleneck"**: 100 concurrent `MatchCoordinatorDO.finalize()` calls triggering 100 `MatchFinalizationFlow` instances. Measures: Impact on `CreditsDO`, `ProgressionDO`, and `LeaderboardDO` shared dependencies.
- **The "Leaderboard Slam"**: 1,000 users updating scores simultaneously. Measures: Write-lock contention on the singleton `Entries` key.
- **The "Audit Log Firehose"**: Simulate 10k audit events/sec. Measures: Backend pressure and its secondary impact on application response times.

#### 3. Real Multi-DO Orchestration Gaps
- **Match -> Reward Chain**: Ensuring that a single match result correctly (and idempotently) increments: `MatchCoordinatorDO` (Phase) -> `CreditsDO` (Winnings) -> `ProgressionDO` (XP) -> `LeaderboardDO` (Rank).
- **Payment -> Credit Chain**: Verifying the Stripe Webhook -> `PaymentDO` -> `CreditsDO` flow handles concurrent webhook retries without double-crediting.

### Current Issues
- Some scripts still use local assumptions that need to stay synchronized with the current worker contract
- The harness can fail on startup or logging behavior before the application logic is exercised
- **Logger Bottleneck**: Local logging I/O (specifically R2 flushing in dev) creates backpressure that causes false-positive timeouts under load.
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

### Confirmed Gaps (Priority Backlog)
These gaps are detailed in the [Comprehensive Gap Analysis](#comprehensive-gap-analysis) section and prioritized in the [Phases](#phases) below.

1. **Matchmaking Pressure**: Singleton bottleneck on $O(N^2)$ pairing logic.
2. **Leaderboard Stress**: Concurrent array-sort/put on a single storage key.
3. **The "Gauntlet" Orchestration**: Full "Join-to-Finish" flow (Matchmaking -> Lobby -> Signaling -> Finalize).
4. **Audit Backpressure**: Impact of write-heavy logging on core state performance.
5. **Payment Resilience**: Multi-stage webhook-to-credits flow under retry pressure.

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

### Phase 6: Build Orchestration Models
- Implement "The Gauntlet": A single player's journey through the 5-6 primary DOs involved in a game.

### Phase 7: Global Break-Point Testing
- Determine the requests-per-second limits for singleton DOs like `MatchmakingDO`.

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

## DO Type Load Profiles

| DO Type | Examples | Test Strategy |
| :--- | :--- | :--- |
| **Global Singleton** | `MatchmakingDO`, `LeaderboardDO` | **Burst Pressure**: High volume to a single instance. |
| **Entity Partitioned** | `CreditsDO`, `ProfileDO` | **User Contention**: Rapid Ops for the SAME user ID. |
| **Ephemeral Stage** | `MatchShardDO`, `LobbyDO` | **Lifetime Stability**: Managing thousands of short-lived DOs. |
| **Coordination** | `MatchCoordinatorDO` | **Handshake Latency**: Timing the chain of multi-DO calls. |
