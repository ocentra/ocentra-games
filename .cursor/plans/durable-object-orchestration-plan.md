# Durable Object Orchestration & Layering Plan

## Overview
This document defines the architectural standard for the Ocentra Cloudflare Worker. We are locking in these boundaries to preserve low latency and entity-owned state, while stopping the "Implementation Drift" that leads to distributed monoliths.

### Core Principle: The Conductor and the Instruments
**Durable Objects own state. Flows own cross-domain workflows.**
- **The Flow is the Conductor**: It decides the sequence, coordinates the outcome, and handles failures.
- **The DOs are the Instruments**: They perform narrow, authoritative actions on their own state. They don't know about other instruments.

---

#### Core Strategic Principles

1.  **Keep DOs Narrow**: A DO is a state guardian and invariant enforcer. It must NOT care *why* credits are granted or *why* a match ended.
2.  **Make Handlers Boring**: Handlers must remain thin adapters. As a default target, handlers should stay under 100 lines and must not contain orchestration logic or external provider (Stripe/Firebase/AI) calls.
3.  **Flows are First-Class Orchestrators**: All multi-domain logic lives in `src/flows/`. If a use case touches two DOs, it is a Flow. 
    - **Guardrail**: Flows orchestrate; they do not become new domain state owners. They must not replace DO-local invariants or become catch-all business modules.
4.  **Failure Isolation**: Side effects (Feeds, Notifications) must never block or roll back authoritative state changes.
5.  **Hard Boundaries over Philosophy**: Clarity beats nuance. We enforce hard bans on DO-to-DO calls to ensure observability and prevent deadlocks.
6.  **Definition - Authoritative Mutation**: Any operation that changes canonical state for money (Credits), inventory (Items), match outcome, progression (XP/Level), or user entitlements. These require a mandatory `operationId`.

---

## Where We Are (The Problem)

The current system has evolved into a highly coupled and bloated architecture.

### 1. Bloated God-Objects (Durable Objects)
- **`MatchCoordinatorDO` (1029+ lines)**: Manages real-time WebSocket state AND orchestrates payment awards, uploads match records to R2.
- **`CreditsDO` (865+ lines)**: Manages balance integrity AND handles escrow logic and archival.
- Result: Business logic is hidden inside state management classes.

### 2. Monolithic API Handlers
- **`matches.ts` (1081+ lines)**: Orchestrates auth, signature verification, R2 uploads, and direct DO routing.
- Result: Handlers are "Workflow Engines" instead of "Adapters."

### 3. Tightly Coupled DO-to-DO Calls (The "Hard Ban" Target)
- `MatchCoordinatorDO` directly calls `CreditsDO` for `BatchAward`.
- Result: Failure in Credits blocks the Match coordinator. No recovery path exists.



#### Where We Are (Current Audit & Violation Findings)

This section provides a formal inventory of all 27 Durable Objects, their primary responsibilities, and the architectural violations identified during the deep-dive audit of the monolithic handlers.

#### 1. MatchCoordinatorDO -> `infra/cloudflare/src/handlers/matches.ts`
- **handler** : `handleMatchRequest` (1081 lines)
- **What it does** :
    - Aggregates WebSocket connections for real-time matches.
    - Authoritative game state machine (validates moves, turns, and timeouts).
    - Manages real-time spectator feeds and chat filtering.
- **Test | Validation** :
    - **A unit | integration | e2e** : Integration (`match-coordinator-do.test.ts`), WebSocket E2E (`match-ws-*`).
    - **B zod | schemathesis | k6** : Zod (Move validation), Schemathesis (API surface), k6 (WS load placeholders).
    - **C Schemathesis Flow** : Fuzzes `/api/v1/matches/{matchId}` (DELETE), `{matchId}/transparency`, and replay verify endpoints. Currently identifies schema-violating acceptance on transparency/verify responses (needs Zod tightening).
- **Violation Found** : **Orchestration Leak.** The handler `handleMatchRequest` coordinates its own rate limiting, signature verification, and "Active vs Finalized" logic. The DO directly calls `CreditsDO` for batch awards.
- **Resolution** : Move `awardPlayersViaBatch` to `MatchFinalizationFlow`. Slim the handler to just target the DO for active matches.

#### 2. CreditsDO -> `infra/cloudflare/src/handlers/credits.ts`
- **handler** : `handleCreditsRequest` (1365 lines)
- **What it does** :
    - Authoritative ledger for GP (Virtual) and AC (Premium) currencies.
    - Transaction journaling and R2 archiving.
- **Test | Validation** :
    - **A unit | integration | contract** : Integration (`credits.test.ts`, `credits-batch-award.test.ts`), Contract (`credits.contract.test.ts`).
    - **B zod | schemathesis** : Zod (Branded Transaction types), Schemathesis (API coverage).
    - **C Schemathesis Flow** : Fuzzes `{userId}/balance` and `{userId}/earn`. Log identifies 401/403 Auth requirements and schema constraints mismatches (validation is stricter than documented).
- **Violation Found** : **Logic Bloat.** `handleCreditsRequest` performs complex promo redemption and purchase/consume orchestration. It manually handles idempotency fallbacks. The handler directly interacts with `env.MATCHES_BUCKET`.
- **Resolution** : Move purchase/consume sequencing to `CreditTransactionFlow`. The DO should only expose `adjustBalance(opId, amount)`.

- **Test | Validation** :
    - **A unit | integration | contract** : Unit (`payment-do.test.ts`), Integration (`payment.test.ts`, `stripe-webhooks.test.ts`).
    - **B zod | schemathesis** : Zod (Payment schemas), Schemathesis coverage.
    - **C Schemathesis Flow** : Fuzzes payment intent creation and state transitions. Currently focuses on webhook signature verification and checkout session mapping.
- **Violation Found** : **Handler Orchestration.** The handler directly creates Stripe sessions and coordinates transitions: `InitPayment` -> `Create Checkout` -> `Transition State`.
- **Resolution** : Move Stripe interaction and DO state stepping into `PaymentCheckoutFlow`.

#### 4. LobbyDO & MatchmakingDO -> `infra/cloudflare/src/handlers/feature-handlers.ts`
- **handler** : `handleLobbyRequest`, `handleMatchmakingRequest`
- **What it does** :
    - Sharding players into 64+ lobby instances.
    - Authoritative queue management and skill-based scoring.
- **Test | Validation** :
    - **A integration | stress** : Integration (`presence.test.ts`), Stress (k6 room aggregation).
    - **B zod | schemathesis** : Zod (Room/Ticket schemas), Schemathesis coverage.
    - **C Schemathesis Flow** : Fuzzes ticket creation and room discovery. Hits `/api/v1/badges/{userId}/claim` as part of feature handler stress. Currently identifies 404s on ticket polling (requires pre-seeded tickets).
- **Violation Found** : **Infrastructure Leak.** `handleLobbyRequest` manually loops over 64 shards to aggregate rooms. Matchmaking lacks a flow to handle "Ticket Created -> Match Found -> Move to Coordinator".
- **Resolution** : Implement `MatchDiscoveryFlow` to aggregate shards and `MatchmakingWorkflow` to handle transitions.

#### 5. ProgressionDO & RewardDO -> `infra/cloudflare/src/handlers/feature-handlers.ts`
- **handler** : `handleProgressionRequest`, `handlePersonalizationRequest`
- **What it does** :
    - XP/Level management and Reward claim logic.
- **Test | Validation** :
    - **A integration | contract** : Integration (`progression-rewards.test.ts`).
    - **B zod | schemathesis** : Zod (XP curve validation), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes XP granting and streak freezing. Monitors for overflow in level-up logic during high-velocity point grants.
- **Violation Found** : **Distributed Query Violation.** `handlePersonalizationRequest` calls both DOs sequentially to build a UI snapshot. `RewardDO` calls `CreditsDO` directly.
- **Resolution** : Create `UserLevelUpFlow` and `RewardClaimFlow`. Use a standard `ProjectionService` for UI snapshots.

#### 6. PenaltyDO & AntiCheatDO -> `infra/cloudflare/src/handlers/feature-handlers.ts`
- **handler** : `handleSecurityRequest`
- **What it does** :
    - Trust score tracking and ban FSM.
- **Test | Validation** :
    - **A integration | e2e** : Integration (`penalty-enhanced.test.ts`, `anticheat-enhanced.test.ts`).
    - **B zod | schemathesis** : Zod (Ban logic), Schemathesis coverage.
    - **C Schemathesis Flow** : Fuzzes ban reason codes and duration math. Validates path parsing for sharded penalty records.
- **Violation Found** : **Mixed Concerns.** The handler manages complex path parsing and sharding for penalties.
- **Resolution** : Slim handler to a standard `SecurityFlow` entry point.

#### 7. LeaderboardDO -> `infra/cloudflare/src/handlers/leaderboard.ts`
- **handler** : `handleLeaderboardRequest`
- **What it does** :
    - Global ranking cache.
- **Violation Found** : **Logic Leak.** The handler computes the leaderboard from R2 if the DO check fails. It also handles leaderboard refresh orchestration.
- **Resolution** : Move compute/badge logic to `LeaderboardSyncFlow`.

#### 8. UserKeysDO -> `infra/cloudflare/src/durable-objects/UserKeysDO.ts`
- **handler** : `handleUserKeysRequest` (`infra/cloudflare/src/handlers/ai-keys.ts`)
- **What it does** : Authorized AI provider key store.
- **Violation Found** : **State Purist.** Looks okay, but the AI service logic is mixed into other DOs (like MatchCoordinator).
- **Resolution** : Enforce that AI service requests go through a flow.

#### 6. PresenceDO -> `infra/cloudflare/src/durable-objects/PresenceDO.ts`
- **handler** : `handlePresenceRequest` (`feature-handlers.ts`)
- **What it does** :
    - Tracks `online`/`away` status and "Current Game" metadata.
    - Manages user-to-user blocking and typing indicators for social features.
    - Shards status synchronization across 256 instances.
- **Test | Validation** :
    - **A integration | e2e** : Integration (`presence.test.ts`, `social-hub.test.ts`).
    - **B zod | k6** : Zod (Status constants), k6 (Heartbeat stress).
    - **C Schemathesis Flow** : Fuzzes status updates and blocking transitions. Monitors for state desync during high-concurrency availability toggles.
- **Violation Found** : Social Logic Bloat.
    - **What** : Manages heartbeats, blocking, and typing indicators.
    - **Why** : High-frequency typing events clog the presence state machine.
    - **Resolution** : Offload typing indicators to a transient `SignalingFlow` or separate DO.

#### 7. ProgressionDO -> `infra/cloudflare/src/durable-objects/ProgressionDO.ts`
- **handler** : `handleProgressionRequest` (`feature-handlers.ts`)
- **What it does** :
    - Authoritative source for XP, Levels, and Skill points.
    - Manages skill-tree progression and achievement progress tracking.
- **Test | Validation** :
    - **A integration | contract** : Integration (`progression-rewards.test.ts`).
    - **B zod | schemathesis** : Zod (XP curve validation), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes XP history and skill unlocking. Validates level increment safety during concurrent grants.
- **Violation Found** : Math Leakage.
    - **What** : DO calculates levels and XP curves internally.
    - **Why** : XP formulas are product logic and should be swappable without a DO migration.
    - **Resolution** : DO should only store XP; a `ProgressionLogic` service should calculate level increments.

#### 8. RewardDO -> `infra/cloudflare/src/durable-objects/RewardDO.ts`
- **handler** : `handleRewardRequest` (`feature-handlers.ts`)
- **What it does** :
    - Manages daily log-in streaks and streak-freeze logic.
    - Handles reclaimable items and Battle-Pass tier rewards.
    - **Leaky logic**: Directly calls CreditsDO and ProgressionDO upon claim.
- **Test | Validation** :
    - **A integration | contract** : Integration (`progression-rewards.test.ts`).
    - **B zod | schemathesis** : Zod (Reward claim IDs), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes log-in streaks and streak-freeze logic. Identifies temporal race conditions in claim eligibility.
- **Violation Found** : Critical Orchestration Leak.
    - **What** : Directly calls `CreditsDO` and `ProgressionDO`.
    - **Why** : Tight coupling creates brittle claim flows. If one DO is down, the whole claim hangs.
    - **Resolution** : Move claims to a `RewardClaimFlow`.

#### 9. InventoryDO -> `infra/cloudflare/src/durable-objects/InventoryDO.ts`
- **handler** : `handleInventoryRequest` (`feature-handlers.ts`)
- **What it does** :
    - Tracks ownership of virtual items, skins, and card packs.
    - Logic for "Open Pack" and equipping/unequipping cosmetics.
- **Test | Validation** :
    - **A integration | e2e** : Integration (`profile-settings-inventory.test.ts`).
    - **B zod | schemathesis** : Zod (Item uniqueness schemas), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes "Open Pack" and cosmetic equipping. Currently 404s on item lookup; requires pre-seeding of gacha catalog.
- **Violation Found** : Gacha Logic Bloat.
    - **What** : "Open Pack" logic and item serialization live here.
    - **Why** : Item drop rates and pack contents are product-level logic.
    - **Resolution** : DO should only add/remove items; `InventoryOpenPackFlow` handles the logic.

#### 10. ProfileDO -> `infra/cloudflare/src/durable-objects/ProfileDO.ts`
- **handler** : `handleProfileRequest` (`feature-handlers.ts`)
- **What it does** :
    - User bio, avatar metadata, and display name history.
    - Manages profile privacy and social relationship metadata.
- **Test | Validation** :
    - **A integration | e2e** : Integration (`players.test.ts`).
    - **B zod | schemathesis** : Zod (DisplayName sanitization), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes profile metadata and relationship settings. Validates XSS sanitization on display names.
- **Violation Found** : None (State Purist).
    - **Status** : Healthy. Focus remains on user-metadata storage.

#### 11. AuditLogDO -> `infra/cloudflare/src/durable-objects/AuditLogDO.ts`
- **handler** : `handleAuditRequest` (`feature-handlers.ts`)
- **What it does** :
    - Append-only store for critical system events.
    - Implements Merkle Chaining to provide tamper-proof log integrity.
- **Test | Validation** :
    - **A integration | contract** : Integration (`audit.test.ts`, `audit-trail-service.test.ts`).
    - **B zod | integrity-check** : Zod (Audit event schema), Custom Merkle verifier.
    - **C Schemathesis Flow** : Fuzzes audit event ingestion. Monitors for Merkle chain breakage under heavy event load.
- **Violation Found** : None (Infrastructure Purist).
    - **Status** : Healthy. Correctly focused on append-only integrity.

#### 12. PenaltyDO -> `infra/cloudflare/src/durable-objects/PenaltyDO.ts`
- **handler** : `handleSecurityRequest` (`feature-handlers.ts`)
- **What it does** :
    - Manages bans, mutes, and suspension duration/expiration.
- **Test | Validation** :
    - **A integration | e2e** : Integration (`penalty-enhanced.test.ts`).
    - **B zod | schemathesis** : Zod (Penalty reason validation), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes suspension sequences and duration calculations. Hits `/api/v1/disputes/{disputeId}` to validate dispute correlation.
- **Violation Found** : Policy Logic Leak.
    - **What** : Expiration and suspension duration logic live in the DO.
    - **Why** : Ban policies change frequently; should not require DO code changes.
    - **Resolution** : DO behaves as a "Ban Store"; `PenaltyEnforcementFlow` handles the duration math.

#### 13. AntiCheatDO -> `infra/cloudflare/src/durable-objects/AntiCheatDO.ts`
- **handler** : `handleAntiCheatRequest` (`feature-handlers.ts`)
- **What it does** :
    - Analyzes game event timing telemetry to calculate "trust scores."
    - Flags players for manual review on move-velocity anomalies.
- **Test | Validation** :
    - **A integration | contract** : Integration (`anticheat-enhanced.test.ts`).
    - **B zod | k6** : Zod (Telemetry schema), k6 (Ingest stress).
    - **C Schemathesis Flow** : Fuzzes telemetry timing payloads. Identifies thresholds for false-positive anomaly detection.
- **Violation Found** : Heuristic Logic Leak.
    - **What** : Calculates trust scores within the DO.
    - **Why** : Analytics and scoring are heavy; shouldn't block authoritative state work.
    - **Resolution** : Use `AntiCheatFlow` to fetch telemetry and push flags to a "Flag Store."

#### 14. LeaderboardDO -> `infra/cloudflare/src/durable-objects/LeaderboardDO.ts`
- **handler** : `handleLeaderboardRequest` (`infra/cloudflare/src/handlers/leaderboard.ts`)
- **What it does** :
    - Sorts global rankings across GP, Levels, and Trophies.
    - Provides friend-only slices for social competition.
- **Test | Validation** :
    - **A integration | contract** : Integration (`leaderboard.test.ts`).
    - **B zod | schemathesis** : Zod (Rank update schema), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes `{gameType}/user/{userId}`. Currently 404s; requires pre-seeding of leaderboard entries to reach core logic.
- **Violation Found** : Projection Anti-Pattern.
    - **What** : DO sorts global rankings synchronously.
    - **Why** : High-volume sorting in DO state is inefficient for massive scale.
    - **Resolution** : Move Leaderboards to a `Projection` layer (e.g. Postgres or Redis-like architecture).

#### 15. ActivityFeedDO -> `infra/cloudflare/src/durable-objects/ActivityFeedDO.ts`
- **handler** : `handleFeedRequest` (`feature-handlers.ts`)
- **What it does** :
    - Social action fan-out (level ups, high scores, friend activity).
- **Test | Validation** :
    - **A integration | e2e** : Integration (`activity-feed.test.ts`).
    - **B zod | schemathesis** : Zod (Activity type validation), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes feed event types and visibility rules. Validates fan-out constraints during massive friend-graph updates.
- **Violation Found** : Fan-Out Orchestration Leak.
    - **What** : Triggers achievments and item drops during feed updates.
    - **Why** : Social feeds should be a result of state changes, not a trigger for them.
    - **Resolution** : Feeds should be strictly read-only projections.

#### 16. MessageDO -> `infra/cloudflare/src/durable-objects/MessageDO.ts`
- **handler** : `handleMessageRequest` (`feature-handlers.ts`)
- **What it does** :
    - History and delivery tracking for DM and Group chats.
- **Test | Validation** :
    - **A integration | e2e** : Integration (`social-hub.test.ts`).
    - **B zod | k6** : Zod (Message schema), k6 (Chat load).
    - **C Schemathesis Flow** : Fuzzes chat message payloads and unread counters. Validates message sequencing across sharded message stores.
- **Violation Found** : Counter Bloat.
    - **What** : Synchronous unread counting for massive group chats.
    - **Why** : CPU intensive during high chat volume.
    - **Resolution** : Use a `MessageDeliveryFlow` to update unread projections asynchronously.

#### 17. NotificationDO -> `infra/cloudflare/src/durable-objects/NotificationDO.ts`
- **handler** : `handleNotificationRequest` (`feature-handlers.ts`)
- **What it does** :
    - Tracking of push notification delivery status and user read-state.
- **Test | Validation** :
    - **A integration | e2e** : Integration (`social-hub.test.ts`).
    - **B zod | schemathesis** : Zod (Notification schema), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes notification delivery tokens and retry settings. Validates read-state tracking accuracy.
- **Violation Found** : Delivery Logic Leak.
    - **What** : Manages push notification retry logic.
    - **Why** : External API (FCM/SNS) delays should not block internal state.
    - **Resolution** : Move delivery logic to a stateless queue/worker.

#### 18. PartyDO -> `infra/cloudflare/src/durable-objects/PartyDO.ts`
- **handler** : `handlePartyRequest` (`feature-handlers.ts`)
- **What it does** :
    - Manages temporary group state (invite, join, ready-up status).
- **Test | Validation** :
    - **A integration | e2e** : Integration (`social-hub.test.ts`).
    - **B zod | schemathesis** : Zod (Party action validation), Schemathesis.
- **Violation Found** : None (State Purist).
    - **Status** : Healthy. Correct focus on group membership and transient state.

#### 19. MarketplaceDO -> `infra/cloudflare/src/durable-objects/MarketplaceDO.ts`
- **handler** : `handleMarketplaceRequest` (`feature-handlers.ts`)
- **What it does** :
    - Handles P2P item listings, auctions, and purchase settlement logic.
- **Test | Validation** :
    - **A integration | contract** : Integration (`marketplace-tournament.test.ts`).
    - **B zod | schemathesis** : Zod (Listing schema), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes `/api/v1/marketplace/buy`. Currently 404s due to missing valid listing IDs in test-runner config. High sensitivity to component mutation (schema mutation detection).
- **Violation Found** : High-Risk Orchestration.
    - **What** : Settlement logic (Escrow to Credits) is handled inside the Marketplace DO.
    - **Why** : Money moves are critical and should not be buried in item listing logic.
    - **Resolution** : Use `MarketplaceSettlementFlow` to coordinate CreditsDO and InventoryDO.

#### 20. TournamentDO -> `infra/cloudflare/src/durable-objects/TournamentDO.ts`
- **handler** : `handleTournamentRequest` (`feature-handlers.ts`)
- **What it does** :
    - Bracket management, scoring, and round-robin scheduling.
- **Test | Validation** :
    - **A integration | e2e** : Integration (`marketplace-tournament.test.ts`).
    - **B zod | schemathesis** : Zod (Bracket schema), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes `{tournamentId}`. Currently 404s (missing IDs). Validates bracket mutation schema constraints.
- **Violation Found** : Game Design Leak.
    - **What** : Tournament bracket logic and round timing live here.
    - **Why** : Tournament formats (Single Elim vs Round Robin) should be code-agnostic.
    - **Resolution** : DO holds the "State of Matchups"; `TournamentCoordinationFlow` handles the logic.

#### 21. UserKeysDO -> `infra/cloudflare/src/durable-objects/UserKeysDO.ts`
- **handler** : `handleAIKeysRequest` (`infra/cloudflare/src/handlers/ai-keys.ts`)
- **What it does** :
    - Encrypted per-user storage for AI provider API keys.
- **Test | Validation** :
    - **A integration | contract** : Integration (`ai-keys.test.ts`).
    - **B zod | schemathesis** : Zod (Key metadata validation), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes AI provider key storage and rotation endpoints. Validates encryption envelope integrity during update operations.
- **Violation Found** : None (State Purist).
    - **Status** : Healthy. Focus on encrypted storage is correct.

#### 22. SignalingDO -> `infra/cloudflare/src/durable-objects/SignalingDO.ts`
- **handler** : Internal via `matches.ts`
- **What it does** :
    - Brokering ICE candidates and SDP offers for P2P WebRTC data channels.
- **Test | Validation** :
    - **A integration | e2e** : Integration (`signaling.test.ts`).
    - **B zod | k6** : Zod (Signaling envelope), k6 (Latency checks).
    - **C Schemathesis Flow** : Fuzzes WebRTC signaling envelopes. Validates SDP offer/answer pair consistency under data-channel stress.
- **Violation Found** : None (Infrastructure Purist).
    - **Status** : Healthy. Essential for P2P topology.

#### 23. FraudDetectionDO -> `infra/cloudflare/src/durable-objects/FraudDetectionDO.ts`
- **handler** : `handleFraudRequest` (`feature-handlers.ts`)
- **What it does** :
    - Detects spending velocity anomalies and cross-player credit theft patterns.
- **Test | Validation** :
    - **A integration | contract** : Integration (`fraud-detection-enhanced.test.ts`).
    - **B zod | schemathesis** : Zod (Analysis scoring schema), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes high-velocity transaction payloads. Identifies spending anomalies that trigger automated escrow holds.
- **Violation Found** : Heavy Computation at the Edge.
    - **What** : Spending velocity checks on large histories.
    - **Why** : Blocks primary DO threads during check.
    - **Resolution** : Use a secondary `Flow` to analyze ledger history and flag the user asynchronously.

#### 24. SettingsDO -> `infra/cloudflare/src/durable-objects/SettingsDO.ts`
- **handler** : `handleSettingsRequest` (`feature-handlers.ts`)
- **What it does** :
    - Global feature flags and per-user preference overrides.
- **Test | Validation** :
    - **A integration | contract** : Integration (`profile-settings-inventory.test.ts`).
    - **B zod | schemathesis** : Zod (Settings schema), Schemathesis.
    - **C Schemathesis Flow** : Fuzzes feature-flag overrides and localization settings. Validates priority-override logic for nested flags.
- **Violation Found** : None (State Purist).
    - **Status** : Healthy.

#### 25. MatchShardDO -> `infra/cloudflare/src/durable-objects/MatchShardDO.ts`
- **handler** : Internal-only (accessed via MatchCoordinator)
- **What it does** :
    - Stores hot game-state segments that exceed the 128KB DO state limit.
- **Test | Validation** :
    - **A integration | stress** : Integration (`dos.test.ts`).
    - **B integrity-check** : Internal binary checksum validation.
- **Violation Found** : None (Infrastructure Shard).
    - **Status** : Healthy. Purpose-built for overflow state.

#### 26. PlayerShardDO -> `infra/cloudflare/src/durable-objects/PlayerShardDO.ts`
- **handler** : Internal-only (accessed via Shard Manager)
- **What it does** :
    - Sharded player data segments for high-velocity session updates.
- **Test | Validation** :
    - **A integration | stress** : Integration (`dos.test.ts`).
    - **B integrity-check** : Internal segment consistency check.
- **Violation Found** : None (Infrastructure Shard).
    - **Status** : Healthy. Purpose-built for overflow state.

#### 27. StateSyncCoordinatorDO -> `infra/cloudflare/src/durable-objects/StateSyncCoordinatorDO.ts`
- **handler** : `handleSyncRequest` (`infra/cloudflare/src/handlers/sync.ts`)
- **What it does** :
    - Ensures consistency across sharded DOs during state hand-offs.
- **Test | Validation** :
    - **A integration | consistency** : Integration (`sync.test.ts`, `desync.test.ts`).
    - **B zod | contract** : Zod (Sync envelope schema), Schemathesis.
- **Violation Found** : None (Coordination Instrument).
    - **Status** : Healthy for infrastructure consistency.

---


#---

## Target State: The Conductor/Instrument Rules

### 1. Mandatory Domain Boundary Rules (The Hard Ban)

> [!CAUTION]
> **Rule 1: DO-to-DO calls are strictly forbidden.**
> A Durable Object must NOT:
> - `fetch()` another Durable Object.
> - Obtain or use a stub for another Durable Object.
> - Call another DO indirectly through a utility or helper function.
> - Orchestrate any workflow that involves state in another domain.
>
> **The Shard Exception**: Same-domain shard/accessory DOs (e.g. `MatchCoordinatorDO` calling its own `MatchShardDO`) are treated as **internal storage infrastructure**, not cross-domain orchestration. This is allowed but must be narrowly scoped.

**Rule 2: Handlers are Thin Adapters.**
Handlers must remain thin adapters. As a default target, handlers should stay under 100 lines and must not contain orchestration logic.

**Rule 3: Flows are Orchestrators, not Business Modules.**
Flows decide the sequence and apply retry/compensation policy. They must NOT become new "God Services" or recreate domain state logic that belongs in a DO or a dedicated logic service.

**Rule 4: DOs are State Guardians.**
A DO owns its local state and enforces local invariants (e.g., non-negative balance). It must NOT trigger side effects in sibling domains.

**Rule 5: Authoritative Mutations require OperationIds.**
Every authoritative mutation (Money, Inventory, Outcome, XP) **MUST** require a non-nullable `operationId` and be recorded in the DO's idempotency journal.

**Rule 6: Resilience & Sequencing.**
Flows MUST sequence **Authoritative work** (Critical state changes) before **Projection work** (Lag-tolerant side effects). If a Worker dies, the client retries with the same `operationId`, and the Flow runner ensures idempotent execution.

---

### 2. Why the Hard Ban?
We adopt this strict boundary for three reasons:
1.  **Observability**: Flows provide a single file where a product feature's entire lifecycle can be audited.
2.  **Failure Isolation**: If the `NotificationDO` is down, the `MatchFinalizationFlow` can still complete the authoritative reward grant and retry the notification later.
3.  **No Deadlocks**: DO-to-DO calls in a sharded environment (like ours) are prone to circular dependencies and distributed deadlocks that are nearly impossible to debug.

---

### 3. Target Layering Policy
| Layer | Responsibility | Directory |
|-------|----------------|-----------|
| **Handlers** | **Thin Adapters**: Parse HTTP, validate Zod, call one Flow. | `src/handlers/` |
| **Flows** | **The Conductor**: Logic sequencing, cross-DO calls, failure management. | `src/flows/` |
| **Durable Objects** | **The Instrument**: State isolation, local invariants, journaling. | `src/durable-objects/` |
| **Projections** | **Side Effects**: Post-authority Feed, Leaderboards, Notifications. | `src/logic/projections/` |

---

## Transition Roadmap

### Phase 1: Core Flow Infrastructure (Status: NEXT)
1.  **Initialize `infra/cloudflare/src/flows/core/`**:
    - [ ] `FlowRunner.ts`: Execution engine.
    - [ ] `BaseFlow.ts`: Base class for sequencing.
    - [ ] `FlowContext.ts`: Metadata container.
    - [ ] `FlowResult.ts`: Response standard.
2.  **Implementation**:
    - [ ] Implement `FlowRunner` with support for authoritative vs projection sequencing.
3.  **Validation**:
    - [ ] Update `credits-batch-award.test.ts` to use a mocked `MatchFinalizationFlow` instead of checking DO-to-DO calls.

### Phase 2: The "Match Finalization" Refactor (High Priority)
1.  **Create `MatchFinalizationFlow`**:
    - [ ] Step 1: Lock `MatchCoordinatorDO` status.
    - [ ] Step 2: Extract winners/losers.
    - [ ] Step 3: Call `CreditsDO.awardBatch(opId, ...)`.
    - [ ] Step 4: Call `ProgressionDO.addXp(opId, ...)`.
    - [ ] Step 5: Archive match record to R2.
2.  **Refactor Handler**:
    - [ ] Slim `matches.ts` by removing orchestration logic.
3.  **Mechanical Fixes**:
    - [ ] Purge all `.fetch()` calls inside `MatchCoordinatorDO.ts`.

### Phase 3: The "Payment & Reward" Cleanup
1.  **PaymentCheckoutFlow**: Move Stripe initialization and DO state transitions out of `payments.ts`.
2.  **RewardClaimFlow**: Decouple `RewardDO` from direct `CreditsDO` calls.

### Phase 4: Mechanical Enforcement (CI/Lint)
1.  **ESLint Policy**: Prevent `env.[DO_BINDING].get()` or `.fetch()` inside any file under `src/durable-objects/`.
2.  **CI Lint**: Fail if a handler in `src/handlers/` exceeds 150 lines.
3.  **OpenAPI Sync**: Ensure all flows are documented as the entry point in the OpenAPI spec.

---

### Test Impact & Strategy

| Feature | Primary Test | Change Required |
| :--- | :--- | :--- |
| **Match Awards** | `credits-batch-award.test.ts` | Redirect test to hit `MatchFinalizationFlow` via Handler. |
| **Payments** | `stripe-webhooks.test.ts` | Verify `PaymentSettlementFlow` steps are idempotent. |
| **Lobby** | `presence.test.ts` | Verify `ShardAggregationFlow` returns correct room list. |
| **Security** | `penalty-fsm.test.ts` | Ensure `SecurityFlow` correctly handles ban transitions. |

---

> [!IMPORTANT]
> **Durable Objects must never call other Durable Objects.** This is the definitive architectural standard for Ocentra. Any workflow touching multiple DOs MUST be implemented as a named Flow in `src/flows/`.
