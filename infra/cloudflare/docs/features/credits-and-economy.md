# Credits and Economy

**Purpose:** GP/AC balance and ledger (earn, consume, purchase, promo redeem). Balance and transactions stored in R2 (MATCHES_BUCKET, BucketPath.UserCredits, UserTransactions); optional CreditsDO for DO-backed operations. Idempotency keys required for state-changing operations. Stripe webhooks update payment state and can trigger credit grants; AI escrow reserve/consume uses CreditsDO.

**Handlers:** `handleCreditsRequest` (handlers/credits.ts), `handleStripeWebhookRequest` (handlers/webhooks-stripe.ts), `handleAIEscrowRequest` (handlers/ai-escrow.ts). Routes: Credits prefix, Stripe webhook, AI escrow (reserve/consume).

**Durable Object:** [CreditsDO](../durable-objects/CreditsDO.md). Shard key: userId. Used for balance/ledger when CREDITS_DO is bound; handler also uses R2 via CreditStorage (getBalance, saveBalance, addTransaction) for some code paths.

**API surface (from code):**
- Credits handler: balance (GET), earn GP, consume AC, purchase (POST with idempotency); path parsing via extractAndValidateIdFromPath; ParamName; CreditAction, Currency, TransactionType from endpoint-domain; MetadataField idempotency; fetchFromCreditsDO for DO; logic in logic/credits and logic/promo-redeem.
- Stripe webhook: signature verification; event types from endpoint-domain; PaymentEventSchema; forwards to PaymentDO and/or credit grant when applicable.
- AI escrow: POST reserve (AIEscrowReserveRequestSchema), POST consume (AIEscrowConsumeRequestSchema); calculateAICost, getCatalogFromEnv; CreditsDO paths for reserve/consume; plan tiers and allowance.

**Flow**

```mermaid
sequenceDiagram
  participant Client
  participant Worker
  participant CreditsDO
  participant R2

  Client->>Worker: POST /api/v1/credits/... (earn/consume/purchase)
  Worker->>Worker: requireAuth; idempotency key
  alt DO bound
    Worker->>CreditsDO: fetchFromCreditsDO(path, body)
    CreditsDO->>CreditsDO: storage/ledger
    CreditsDO-->>Worker: JSON
  else R2 path
    Worker->>R2: getBalance/saveBalance/addTransaction
  end
  Worker-->>Client: JSON + CORS
```
