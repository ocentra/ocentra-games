# @ocentra/solana-domain

Solana **client-side** domain: transaction helpers, SPL Memo anchoring, Anchor program access, match coordination, Merkle batching, and resilience primitives. Consumes `@ocentra/crypto-domain`, `verification-domain`, `eventing-domain`, `ai-domain`, and `logging-domain`. Uses **`@solana/web3.js`** (required peer) and optional **Anchor**, **SPL Memo**, **bn.js**.

## Scope

- **In:** Signing/sending/confirming flows, memo-based hashes, IDL-backed program calls, lobby/game event wiring to chain, match lifecycle orchestration, batching, rate limits, circuit breaker, structured Solana error taxonomy.
- **Out:** On-chain Rust programs, RPC hosting, and HTTP API routes (use `@ocentra/endpoint-domain` at app boundaries).

## Public API (`package.json` `exports`)

No barrel file — import each entry by subpath.

### Resilience and errors

- `ErrorHandler` — `SolanaErrorCode`, error normalization helpers.
- `CircuitBreaker` — failure threshold / cooldown around RPC or submit paths.
- `RateLimiter` / `RateLimiterKV` — token-bucket style limiting (see `RateLimiter.ts`).

### Transactions and anchoring

- `TransactionHandler` — build/sign/send/confirm with retries, timeout, progress callbacks.
- `MemoAnchor` — SPL Memo transactions carrying match metadata (size limits enforced).
- `MerkleBatching` — Merkle trees/proofs over match hashes (`HashService` from crypto-domain).

### Anchor and game client

- `AnchorClient` — loads IDL (Node vs browser behavior), `Program` + `AnchorProvider`, program id wiring.
- `SolanaAnchorService` — memo-centric “anchor match hash” submission path.
- `GameClient` — high-level match/player/move operations on top of `AnchorClient`, emits `UpdateGameStateEvent` via eventing-domain.

### Coordination and events

- `SolanaEventBridge` — subscribes to lobby/game `EventBus` events and drives `GameClient` when initialized with `Connection` + wallet.
- `MatchCoordinator` — real-time match orchestration (pending txs, rollback/sync, optional R2 storage, `BatchManager`, `CoordinatorWalletPool`, `AIDecisionRecorder`, verification/crypto hooks).
- `MatchEventCollector` — builds `MatchRecord` / move streams from on-chain state for verification types.
- `BatchManager` — batches match hashes, Merkle roots, Ed25519 batch signatures (`SignatureService`).
- `CoordinatorWalletPool` — coordinator signing pool abstraction for batched work.

### Contracts

- `types` — e.g. `PlayerAction`, `PlayerActionType` for moves.
- `interfaces` — `IMatchRecordStorage`, `IMetricsCollector` for dependency injection.

## Workspace dependencies

| Package | Role in this domain |
|---------|---------------------|
| `@ocentra/crypto-domain` | Hashing, Merkle leaves, `SignatureService` (batch signing) |
| `@ocentra/verification-domain` | `CanonicalSerializer`, `MatchRecord` / signature types |
| `@ocentra/eventing-domain` | `EventBus`, lobby/game events for `GameClient` / `SolanaEventBridge` |
| `@ocentra/ai-domain` | `AIDecisionRecorder` and CoT types inside `MatchCoordinator` |
| `@ocentra/logging-domain` | `MainAppLogger` / stack traces across modules |

## Peer dependencies

- **`@solana/web3.js`** — required for connections, transactions, keys.
- **`@coral-xyz/anchor`** — optional at install time; `AnchorClient` expects program/IDL usage when present.
- **`@solana/spl-memo`** — used by `MemoAnchor` / `SolanaAnchorService`.
- **`bn.js`** — used with on-chain numeric types in game client flows.

## Scripts

- **`npm run build`** — `tsc`, `tsc-alias`, ESM import fix.
- **`npm run type-check`** — `tsc --noEmit`.
- **`npm run lint`** — ESLint + type-check (`src`, `tests`).
- **`npm run test`** — Vitest (`tests/` including load/e2e/benchmarks per tree).

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — layers, cross-domain wiring, diagrams.
