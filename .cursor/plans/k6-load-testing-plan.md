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
- **Full Match Lifecycle**: From matchmaking queue to result submission across `MatchCoordinatorDO` and `MatchShardDO`.
- **Payment flow pressure**: Stressing the checkout/webhook orchestration.
- **Progression/reward flow pressure**: Beyond simple badge unlocks.
- **Global Hot-Shards**: Contention on singletons like `LeaderboardDO` or `MatchmakingDO`.
- **Inter-DO Handshaking**: Latency and failure modes in long Conductor/Instrument chains.

### Current Issues
- Some scripts still use local assumptions that need to stay synchronized with the current worker contract
- **Logger Bottleneck**: Local logging I/O (specifically R2 flushing in dev) creates backpressure that causes false-positive timeouts under load.
- The load suite is still too narrow to claim it covers every major orchestration chain.

## Principles

1. **Use centralized contracts.**
   - Route constants, headers, methods, query keys, path builders, idempotency helpers, and payload examples must come from domain packages.
   - No load script should invent its own route string or payload shape if a shared export already exists.

2. **Test the real system, not a guessed system.**
   - A load scenario must be tied to an actual route, flow, or DO chain that exists in the repo.
   - If the chain does not exist, do not add a load test for it yet.

3. **Keep the harness boring.**
   - Worker startup, health checks, and log flushing must not create false failures.
   - A k6 failure should mean the app failed, not the test wrapper.

4. **Treat idempotency as part of the contract.**
   - Money-critical and stateful write paths must use deterministic idempotency keys.
   - Concurrent tests must verify that retry or replay does not create extra value.

5. **Separate pressure types.**
   - Contention tests
   - Soak tests
   - Memory-pressure tests
   - WebSocket / FD pressure tests
   - Cross-endpoint correctness tests

6. **Isolate Observability I/O.**
   - High-concurrency tests must not be blocked by logging.
   - The logger should move to an asynchronous, non-blocking mode or skip expensive local I/O (like `test.json` flushes) during load runs to ensure we measure application latency, not disk I/O.

7. **Model the DO Topology.**
   - Distinguish between **Singleton DOs** (Global bottlenecks like `MatchmakingDO`) and **Partitioned DOs** (Per-user/Match like `CreditsDO`).
   - Load scenarios must specifically target the unique contention points of each type.

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
- **The "Join-to-Finish" Flow**: Matchmaking -> Lobby -> Signaling -> Match Result.
- **Payment Lifecycle**: Checkout session creation -> Payment success webhook -> Credit grant.
- **Global Singleton Stress**: High volume to `LeaderboardDO` and `MatchmakingDO`.
- **Audit Backpressure**: Does high volume in gameplay DOs choke the `AuditLogDO`?

### Unverified Ideas
- A “joint pressure” scenario spanning match, credits, progression, and leaderboard
- A single hot-shard test for a queue-like singleton DO
- A distributed lock contention test for user-key or profile update paths

## Phases

### Phase 1: Centralize The k6 Contract Layer
- Generate and consume shared constants for routes, headers, and payloads.
- Move repeated test data construction into shared builders.

### Phase 2: Stabilize The Harness & Logger
- Fix worker startup health checks.
- **Decouple Logger I/O**: Modify `domain-logger-init.ts` to skip expensive local R2 flushes when a `k6` context is detected.

### Phase 3: Reconcile Existing Scripts
- Fix payloads and route usage to match the current 2026 worker contracts.

### Phase 4: Classify Scripts
- `keep` / `fix` / `delete` / `defer` based on current relevance.

### Phase 5: Build Orchestration Models
- Implement "The Gauntlet": A single player's journey through the 5-6 primary DOs involved in a game.

### Phase 6: Global Break-Point Testing
- Determine the requests-per-second limits for singleton DOs like `MatchmakingDO`.

## Success Criteria
- k6 runs pass without harness-induced false failures.
- **Zero Double-Spending**: Verified via concurrent purchase tests.
- **Orchestration Integrity**: Verified via "Match-to-Payout" chains.
- Any new cross-DO pressure test maps to a real, existing chain.

## DO Type Load Profiles

| DO Type | Examples | Test Strategy |
| :--- | :--- | :--- |
| **Global Singleton** | `MatchmakingDO`, `LeaderboardDO` | **Burst Pressure**: High volume to a single instance. |
| **Entity Partitioned** | `CreditsDO`, `ProfileDO` | **User Contention**: Rapid Ops for the SAME user ID. |
| **Ephemeral Task** | `MatchShardDO`, `LobbyDO` | **Lifetime Stability**: Managing thousands of short-lived DOs. |
| **Coordination** | `MatchCoordinatorDO` | **Handshake Latency**: Timing the chain of multi-DO calls. |

## Notes
- The logging bottleneck found during recent audits is the #1 blocker for reliable local load testing.
- Standardizing the contract layer is mandatory before adding complex orchestration flows.
