# CreditsDO

**Purpose:** GP/AC balance and ledger for earn, consume, purchase, batch award, and escrow state. The DO is the authoritative local store for balance, transaction history, and idempotency tracking.

**Shard key:** `userId`.

**HTTP surface:** Paths from `CreditsDOPaths` in endpoint-domain: award, batch-award, balance, earn, consume, purchase, plan-state-set, and escrow paths for reserve, settle, consume, and expire.

**Storage:** `CreditsDOStoragePrefix` from boundary-domain; local state includes `gp_balance`, `ac_balance`, `ledger`, `processed`, and escrow records. Optional R2 archive for older ledger entries.

**Flows that use it:** `MatchFinalizationFlow`, `RewardClaimFlow`, `StripeWebhookFlow`, and `TournamentPrizeDistributionFlow`.

**Handlers:** `credits.ts`, `ai-escrow.ts`, stripe webhook handling, and admin credits/plan routes. The handler layer dispatches into flows for multi-step work.

**Domain constants:** endpoint-domain: `CreditsDOPaths`, `Http*`, `CreditLedgerType`, `CreditLedgerSource`, `Currency`, `TransactionType`, `MetadataField`, `validateIdempotencyKey`; boundary-domain: `CreditsDOStoragePrefix`.

```mermaid
sequenceDiagram
  participant Flow
  participant CreditsDO
  Flow->>CreditsDO: fetch Award/Balance/Earn/Consume/Escrow
  CreditsDO->>CreditsDO: loadState; process idempotency; storage put
  CreditsDO-->>Flow: JSON success/balance/error
```
