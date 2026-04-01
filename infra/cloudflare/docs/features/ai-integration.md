# AI Integration

**Purpose:** AI proxy (forward to AI_SERVICE_URL); AI API key storage and lookup (UserKeysDO); AI escrow reserve/consume (CreditsDO); AI OAuth and catalog endpoints. No ai-domain imports in worker; paths and schemas from endpoint-domain.

**Handlers:** `handleAIRequest` (handlers/ai.ts), `handleAIKeysRequest` (handlers/ai-keys.ts), `handleAIEscrowRequest` (handlers/ai-escrow.ts), `handleAIOAuthRequest` (handlers/ai-oauth.ts), `handleAICatalogRequest` (handlers/ai-catalog or route). Routes: AI base, AI keys, AI escrow (reserve/consume), AI OAuth (start/callback), AI catalog.

**Durable Objects:** [UserKeysDO](../durable-objects/UserKeysDO.md) (shard key: userId) for API keys; [CreditsDO](../durable-objects/CreditsDO.md) for escrow (reserve/consume).

**API surface (from code):**
- AI: proxy to env.AI_SERVICE_URL with auth (AI_API_KEY or key from UserKeysDO).
- AI keys: ApiEndpoint.AI.Keys; UserKeysDO paths; GET list, POST set, DELETE revoke (path/body from endpoint-domain).
- AI escrow: ApiEndpoint.AI.EscrowReserve, EscrowConsume; CreditsDOPaths; AIEscrowReserveRequestSchema, AIEscrowConsumeRequestSchema; calculateAICost, getCatalogFromEnv; plan tiers; CreditsDO stub.idFromName(userId).
- AI OAuth: ApiEndpoint.AI.OAuthStart, OAuthCallback; UserKeysDO; OAuth state in KV (KvKeyPrefix from boundary-domain).
- AI catalog: GET catalog (from KV or env); admin PATCH merge providers (feature-handlers handleAdminRequest).

**Flow**

```mermaid
sequenceDiagram
  participant Client
  participant Worker
  participant UserKeysDO
  participant CreditsDO
  participant AIService

  Client->>Worker: POST /api/v1/ai/... or /ai/keys/... or /ai/escrow/...
  Worker->>Worker: requireAuth
  alt keys
    Worker->>UserKeysDO: fetch(path); idFromName(userId)
  else escrow
    Worker->>CreditsDO: reserve/consume; idFromName(userId)
  else proxy
    Worker->>AIService: forward request
    AIService-->>Worker: response
  end
  Worker-->>Client: JSON + CORS
```
