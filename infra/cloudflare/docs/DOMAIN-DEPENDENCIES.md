# Domain Package Dependencies

**Source of truth:** Grep of `infra/cloudflare/src` for `@ocentra/endpoint-domain`, `@ocentra/boundary-domain`, `@ocentra/logging-domain`, `@ocentra/ai-domain`.

The worker and its tests use shared domain packages for paths, storage boundaries, logging, and types. This document lists what is actually imported and used.

---

## @ocentra/endpoint-domain

**Purpose:** API paths, HTTP constants, route manifest, DO path segments, schemas, validators, and types used at request/response boundaries.

**Usage (from code):**

| Area | Imports / usage |
|------|------------------|
| **HTTP** | `HttpMethod`, `HttpStatus`, `HttpHeader`, `HttpContentType`, `WebSocketProtocol`, `CacheControl` from `constants/http` |
| **Errors** | `ErrorMessage` from `constants/errors` |
| **Routes** | `CloudflareRouteManifest`, `CloudflareHandlerKey`, `MiddlewareKey`, `RouteMatch` from `constants/cloudflare-route-manifest` and `cloudflare-route-keys` |
| **Environment / health** | `Environment` from `constants/environment`; `HealthStatus` from `constants/health` |
| **API paths** | `ApiEndpoint` from `constants/cloudflare`; path parsing (`extractIdFromPath`, `extractPathAfterEndpoint`, `extractPathParts`, `extractAndValidateMatchIdFromPath`, etc.) from `utils/path-parser` |
| **DO paths / names** | `DOBaseUrl`, segment and path constants from `constants/cloudflare-do` (e.g. `MatchCoordinatorDOSegment`, `CreditsDO`, `UserKeysDO`, `LobbyDOSegment`, `LobbyDODefaultInstanceName`, `PresenceDO`, `PaymentDOSegment`, `SignalingDOSegment`, `NotificationDOSegment`, `AuditLogDO`) |
| **Game / match** | `GameName`, `GameTypeId`, `PlayerType`, `NotificationType` from `constants/game`; `MatchId`, `validateMatchId` from `constants/match`; match/WS types and schemas |
| **Credits** | `CreditLedgerType`, `CreditLedgerSource`, `Currency`, `TransactionType` from `constants/credits` |
| **Idempotency** | `MetadataField`, `validateIdempotencyKey`, `asIdempotencyKey` from `constants/idempotency` and validators |
| **Stripe / payments** | `StripeEventType`, `PaymentTrigger`, `StripeEndpoint` from `constants/stripe`; payment schemas and types |
| **Query / validation** | `QueryParam` from `constants/query`; `validateMatchRecord` from `utils/validation`; content-type and URL helpers |
| **Resources** | `IdentifierType`, `ResourceType`, `ApiAction` from `constants/resources`; content-validation utils |
| **Schemas** | Payment, AI escrow, audit schemas (e.g. `PaymentEventSchema`, `PaymentEvent`, AI escrow request/response, `AuditEvent`, `AuditQueryFilters`) |

**Worker vs tests:** Route manifest and handler keys are shared. Tests use the same endpoint-domain constants for paths and methods; test env may use different bindings (e.g. test DO namespaces, test KV) but same path/segment constants.

---

## @ocentra/boundary-domain

**Purpose:** Storage boundaries — bucket paths, R2 path prefixes, DO storage key prefixes, KV key prefixes. No raw bucket or key names in worker code.

**Usage (from code):**

| Constant / module | Used in |
|-------------------|--------|
| `BucketPath` (bucket-paths) | domain-logger-init (log manifest path), MatchCoordinatorDO (match storage), monitoring/system, AuditTrailService, ReplayService |
| `MatchCoordinatorDOStoragePrefix`, `CreditsDOStoragePrefix`, `UserKeysDOStoragePrefix`, `PaymentDOStoragePrefix`, `LobbyDOStoragePrefix`, `PresenceDOStoragePrefix`, `NotificationDOStoragePrefix` (do-storage-prefixes) | Corresponding DOs and handlers |
| `KvKeyPrefix` (kv-key-prefixes) | feature-handlers (Discovery and other KV usage), oauth-state, logs-api, config/products |

**Worker vs tests:** Tests may point to test buckets or KV namespaces via env; the same boundary-domain constants define the key/bucket path shape so worker and tests stay aligned.

---

## @ocentra/logging-domain

**Purpose:** Structured logging API, stack traces, test log types, and bridge transport for test log ingestion.

**Usage (from code):**

| Area | Imports / usage |
|------|------------------|
| **Logger** | `CloudflareLogger`; adapters: `CloudflarePathResolver`, `CloudflareRequestContextProvider`, `CloudflareLogDecisionProvider`, `CloudflareStorage`; `getStackTrace`; helpers from `cloudflareLoggerHelpers` |
| **Types** | `StackTrace` from `core/stackTrace`; `InternalLogEntry`; `TestLogOrigin` and test-log types |
| **Transport** | `LogConsumer`, `bridgeLogPayload`; `bridgeTransport` (flushReporterQueue) for test log bridge |

**Worker vs tests:** In tests, request context (e.g. runId, testName) is set so logs can be attributed and ingested (e.g. bridge to DuckDB). Same logger API; test setup may enable different log levels or destinations.

---

## @ocentra/ai-domain

**Purpose:** Not directly imported in the worker `src` tree from the grep results. AI provider configuration and model identifiers may live in app or in ai-domain; the worker uses endpoint-domain for AI routes and schemas and forwards requests to an AI service URL (env). If ai-domain is used elsewhere (e.g. app or scripts), it is out of scope for this worker doc.

**Worker:** Uses `ApiEndpoint.AI.*`, AI escrow schemas, and `AI_SERVICE_URL` / `AI_API_KEY` (env); no ai-domain imports found in `infra/cloudflare/src`.

---

## Summary table

| Package | Role in worker |
|---------|----------------|
| endpoint-domain | Routes, paths, HTTP, DO segments, game/credits/payment/audit constants and schemas, validators |
| boundary-domain | Bucket paths, DO storage prefixes, KV key prefixes |
| logging-domain | Logger, adapters, stack trace, test log types, bridge transport |
| ai-domain | Not used in worker src; AI behavior via endpoint-domain + env |

---

## Test / dev differences

- **Bindings:** Test wrangler or env can override DO namespaces, KV, R2, and Analytics to point to test instances.
- **Auth:** Tests may use `DISABLE_AUTH` or test tokens; same endpoint-domain auth error messages and headers.
- **Logging:** Test runs set request context (runId, testName) and may flush via bridge transport for queryable test logs; same logging-domain API.
