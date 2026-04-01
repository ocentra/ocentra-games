# Payments and Stripe

**Purpose:** Payment creation and status (PaymentDO); Stripe webhook ingestion (signature verification, idempotent handling); scheduled reconciliation when PAYMENT_DO and STRIPE_SECRET_KEY are set. PaymentDO sharded by payment intent or user/session from path.

**Handlers:** `handlePaymentRequest` (handlers/payments.ts), `handleStripeWebhookRequest` (handlers/webhooks-stripe.ts). Routes: Payment prefix, Stripe webhook path (endpoint-domain).

**Durable Object:** [PaymentDO](../durable-objects/PaymentDO.md). Shard key: from path (extractIdFromPath). Stores payment events; webhook handler forwards Stripe events to PaymentDO.

**API surface (from code):**
- Payments handler: ApiEndpoint, StripeEndpoint, PaymentTrigger; PaymentDOSegment, DOBaseUrl; extractIdFromPath; payment schemas; POST/GET to PaymentDO for create, status, or event ingestion.
- Webhook: HttpHeader, StripeEventType, PaymentTrigger; Cloudflare DO constants; PaymentEventSchema; signature verification; POST body to PaymentDO or internal logic for credit/payment state.
- Cron (index.ts scheduled): runReconciliation(env) when PAYMENT_DO and STRIPE_SECRET_KEY present.

**Flow**

```mermaid
sequenceDiagram
  participant Stripe
  participant Worker
  participant PaymentDO

  Stripe->>Worker: POST /webhooks/stripe (signed)
  Worker->>Worker: verify signature; parse event
  Worker->>PaymentDO: fetch(event path/body)
  PaymentDO->>PaymentDO: storage put event
  PaymentDO-->>Worker: 200
  Worker-->>Stripe: 200
```
