# CreditsDO

**Purpose:** GP/AC balance and ledger; idempotent award, batch award, earn, consume, purchase, plan state; escrow reserve/settle/consume/expire. Processes idempotency keys; flushes ledger to R2 (CREDITS_LEDGER_ARCHIVE) when configured. Plan tiers and allowance for AI escrow.

**Shard key:** userId (handlers and MatchCoordinatorDO use `env.CREDITS_DO.idFromName(userId)` or `idFromName('match-'+matchId)` for match-scoped credits).

**HTTP surface:** Paths from CreditsDOEndpoints (endpoint-domain): Award, BatchAward, Balance, Earn, Consume, Purchase, PlanStateSet; escrow paths for reserve, settle, consume, expire. POST/GET as per path.

**Message types:** N/A (HTTP only).

**Storage:** CreditsDOStoragePrefix (boundary-domain); in-DO state: gp_balance, ac_balance, ledger, processed (idempotency), escrow records. Optional R2 archive.

**Handlers:** [handleCreditsRequest](../features/credits-and-economy.md) (credits.ts), [handleAIEscrowRequest](../features/ai-integration.md) (ai-escrow.ts), webhooks-stripe (credit grant), feature-handlers (admin credits/plan). MatchCoordinatorDO calls CreditsDO for batch award.

**Domain constants:** endpoint-domain: CreditsDO, DOBaseUrl, Http*, CreditLedgerType, CreditLedgerSource, Currency, TransactionType, MetadataField, validateIdempotencyKey; boundary-domain: CreditsDOStoragePrefix.

```mermaid
sequenceDiagram
  participant Handler
  participant CreditsDO
  Handler->>CreditsDO: fetch Award/Balance/Earn/Consume/Escrow...
  CreditsDO->>CreditsDO: loadState; process idempotency; storage put
  CreditsDO-->>Handler: JSON success/balance/error
```
