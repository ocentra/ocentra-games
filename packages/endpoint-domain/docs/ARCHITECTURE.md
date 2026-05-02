# Endpoint Domain – Architecture

**Single source of truth for all API endpoints:** Cloudflare Worker, Local API, Firebase, Tokens, Stripe, Solana.

**Last Updated:** 2026-02-10

**Conventions:** All constants and types MUST follow [DESIGN-CONVENTIONS.md](./DESIGN-CONVENTIONS.md). No raw strings, no exceptions.

**Related:**
- [DESIGN-CONVENTIONS.md](./DESIGN-CONVENTIONS.md) - **MANDATORY** rules for endpoints
- [`infra/cloudflare/ARCHITECTURE.md`](../../infra/cloudflare/ARCHITECTURE.md) - Cloudflare Worker implementation

| Doc | Purpose |
|-----|---------|
| [DESIGN-CONVENTIONS.md](./DESIGN-CONVENTIONS.md) | **MANDATORY** rules: branded types, nested paths, versioning, DO separation |

---

## What It Is

`@ocentra/endpoint-domain` is the **single source of truth** for API contracts. No scattered strings, no duplicated types. One package defines paths, request/response shapes, validation schemas, and typed HTTP clients. Cloudflare Worker, main app, Vite dev middleware, Firebase callers, TokenService, StripeService, and Solana clients all consume from here.

```mermaid
flowchart TB
    subgraph domain["@ocentra/endpoint-domain"]
        constants["constants/"]
        types["types/"]
        schemas["schemas/"]
        clients["client/"]
    end

    subgraph consumers["Consumers"]
        cf["Cloudflare Worker"]
        app["Main App"]
        vite["Vite Dev"]
        fb["Firebase callers"]
        tokens["TokenService"]
        stripe["StripeService"]
        solana["Solana clients"]
    end

    constants --> cf
    constants --> app
    constants --> vite
    types --> cf
    types --> app
    schemas --> cf
    clients --> app
    constants --> tokens
    constants --> stripe
    constants --> solana
    types --> fb
```

---

## How It Fits Together

```mermaid
flowchart LR
    subgraph main["Main App"]
        ui[UI Components]
        r2[R2Service]
        cloud[CloudServiceImpl]
        router[NetworkRouter]
    end

    subgraph domain["endpoint-domain"]
        browserClient[BrowserApiClient]
        cloudflareConst[constants/cloudflare]
        localConst[constants/local]
        prodConst[constants/prod]
    end

    subgraph worker["Cloudflare Worker"]
        routes[routes.ts]
        handlers[handlers]
    end

    ui --> browserClient
    r2 --> cloudflareConst
    cloud --> prodConst
    router --> localConst
    routes --> cloudflareConst
    handlers --> cloudflareConst
```

**Request flow example:** User clicks "Get balance" → UI calls `browserClient.credits.getBalance(userId)` → BrowserClient (from domain) builds URL from `constants/cloudflare`, adds auth, fetches → Worker receives request, routes using same constants, handler returns typed response.

---

## Package Structure

```mermaid
flowchart TD
    subgraph pkg["packages/endpoint-domain"]
        subgraph src["src/"]
            constants["constants/"]
            types["types/"]
            schemas["schemas/"]
            client["client/"]
            durable["durable-objects/"]
            openapi["openapi/"]
        end
        dist["dist/"]
    end

    constants --> |"cloudflare, local, firebase, tokens, stripe, solana, http, versions"| dist
    types --> dist
    schemas --> dist
    client --> dist
    durable --> dist
    openapi --> dist
```

```
packages/endpoint-domain/
├── src/
│   ├── constants/           # Path constants per scope (see DESIGN-CONVENTIONS)
│   │   ├── cloudflare.ts    # Cloudflare Worker REST only (public API)
│   │   ├── cloudflare-do.ts # Durable Object paths (internal; separate file)
│   │   ├── local.ts         # Vite /local/api/*
│   │   ├── firebase.ts      # Callable function names
│   │   ├── tokens.ts        # Tokens API paths
│   │   ├── stripe.ts        # Stripe API paths
│   │   ├── solana.ts        # RPC URLs, program IDs
│   │   ├── http.ts          # HttpMethod, HttpStatus
│   │   └── versions.ts      # ApiVersion.V1, etc.
│   ├── types/               # Branded primitives + request/response
│   │   ├── brands.ts        # ApiPath, DOPath, EndpointId
│   │   └── cloudflare/      # Request/response per domain
│   ├── schemas/             # Effect Schema validation
│   ├── client/              # BrowserApiClient, CloudflareApiClient
│   ├── durable-objects/
│   └── openapi/
├── docs/
│   ├── DESIGN-CONVENTIONS.md  # MANDATORY rules
│   ├── ARCHITECTURE.md
│   └── (index removed; use package README.md)
└── package.json
```

**Path conventions:** Nested by domain, full path at every leaf. Version in path (`/api/v1/...`). All paths branded as `ApiPath` or `DOPath`. See [DESIGN-CONVENTIONS.md](./DESIGN-CONVENTIONS.md).

---

## Scope Map

Endpoints are grouped by scope. Each scope has its own constant file and consumers.

```mermaid
flowchart TB
    subgraph scopes["Scopes"]
        CF[Cloudflare]
        Local[Local API]
        Prod[Prod API]
        FB[Firebase]
        Tokens[Tokens]
        Stripe[Stripe]
        Solana[Solana]
    end

    subgraph cfConsumers["Cloudflare consumers"]
        Worker[Worker routes]
        R2[R2Service]
        E2E[E2E tests]
    end

    subgraph localConsumers["Local consumers"]
        NR[NetworkRouter]
        VQ[viteLogQuery]
        Sync[sync.ts]
    end

    subgraph prodConsumers["Prod consumers"]
        CS[CloudServiceImpl]
        LP[LogsPage]
    end

    subgraph otherConsumers["Other consumers"]
        AU[AdminUsersPage]
        TS[TokenService]
        SS[StripeService]
        GC[GameClient]
    end

    CF --> Worker
    CF --> R2
    CF --> E2E
    Local --> NR
    Local --> VQ
    Local --> Sync
    Prod --> CS
    Prod --> LP
    FB --> AU
    Tokens --> TS
    Stripe --> SS
    Solana --> GC
```

| Scope | Constant file | What it defines | Consumers |
|-------|---------------|-----------------|-----------|
| **Cloudflare** | cloudflare.ts | Worker REST paths only | Worker routes, R2Service, tests |
| **Cloudflare DO** | cloudflare-do.ts | Durable Object paths (internal) | Worker internal fetch |
| **Local** | local.ts | `/local/api/*` paths | NetworkRouter, viteLogQuery, sync |
| **Prod** | prod (or cloudflare subset) | Main app → Worker paths | CloudServiceImpl, LogsPage |
| **Firebase** | firebase.ts | Callable names | AdminUsersPage |
| **Tokens** | tokens.ts | Tokens API paths | TokenService |
| **Stripe** | stripe.ts | Stripe paths | StripeService |
| **Solana** | solana.ts | RPC URLs, program IDs | WalletAdapter, GameClient |

---

## Import Model (No Barrel)

Every consumer imports from a **specific file**. No `index.ts`, no `@ocentra/endpoint-domain`.

```mermaid
flowchart LR
    A["import { ApiEndpoint } from\n'@ocentra/endpoint-domain/constants/cloudflare'"]
    B["import { LocalApiEndpoint } from\n'@ocentra/endpoint-domain/constants/local'"]
    C["import { BrowserApiClient } from\n'@ocentra/endpoint-domain/client/browser'"]

    A --> cf[Cloudflare Worker]
    B --> vite[Vite / Main App]
    C --> app[Main App]
```

---

## Domain vs Apps

```mermaid
flowchart TB
    subgraph domain["In Domain (endpoint-domain)"]
        paths[Path constants]
        reqtypes[Request/response types]
        effect-schema[Effect Schema schemas]
        clientTypes[Client types]
        doPaths[DO path constants]
    end

    subgraph apps["In Apps (consumers)"]
        handlers[Handler implementations]
        storage[Storage: R2, KV, DO]
        auth[Auth middleware]
        baseUrl[Base URL config]
        cors[CORS, rate limits]
    end

    domain --> |"import"| apps
```

| In Domain | In Apps |
|-----------|---------|
| Endpoint path constants (branded ApiPath, DOPath) | Handler implementations |
| Request/response types | Storage (R2, KV, DO) |
| Effect Schema validation schemas | Auth middleware |
| Base client types | Base URL configuration |
| DO path constants (cloudflare-do.ts) | CORS, rate limiting |

### Responsibility boundary (ownership rule)

**Anything to do with endpoints is endpoint-domain's responsibility — not Cloudflare's, not the main app's, not any other consumer's.**

- Domain owns: paths, path patterns for routing, route specs, types, schemas.
- Consumers do not: define paths, invent routing patterns, or keep endpoint-related constants.
- Flow: (1) Add or change endpoint contract in domain, (2) consumers import and use it, (3) **delete** any code in consumers (e.g. Cloudflare) that defines paths or routing patterns.
- Duplicate or improvised endpoint logic in consumers is forbidden. If it exists, move it to domain and remove it from the consumer.

---

## Client Adapter Pattern

The domain provides **typed clients** that are thin adapters. Base URL and auth come from the app.

```mermaid
sequenceDiagram
    participant UI
    participant BrowserClient
    participant Worker

    UI->>BrowserClient: getBalance(userId)
    Note over BrowserClient: baseUrl from app config
    Note over BrowserClient: auth from getAuthHeaders()
    BrowserClient->>BrowserClient: build URL from constants/cloudflare
    BrowserClient->>Worker: fetch(url, { headers })
    Worker->>BrowserClient: JSON response
    BrowserClient->>UI: CreditBalanceResponse (typed)
```

---

## Endpoint Inventory (Canonical)

Canonical paths. Constants must match exactly. Version in path from day one.

### Cloudflare Worker (REST)

| Section | Endpoints |
|---------|-----------|
| Root & Health | `/`, `/health` |
| Explore | `/explore`, `/explore/leaderboard`, `/explore/benchmark` |
| Explore API | `/api/v1/explore/matches`, `/api/v1/explore/benchmarks` |
| Matches | `/api/v1/matches/{matchId}` GET/PUT/POST/DELETE, `/api/v1/matches/{matchId}/anonymize`, `/api/v1/matches/{matchId}/ai-decisions` |
| Disputes | `/api/v1/disputes` POST, `/api/v1/disputes/{disputeId}` GET, `/api/v1/disputes/{disputeId}/evidence` POST |
| Data | `/api/v1/signed-url/{matchId}` GET, `/api/v1/archive/{matchId}` POST, `/api/v1/data-export/{userId}` GET, `/api/v1/data/{userId}` DELETE |
| AI | `/api/v1/ai` POST, `/api/v1/ai/on_event` POST |
| Leaderboard | `/api/v1/leaderboard/{gameType}` GET, `/api/v1/leaderboard/{gameType}/user/{userId}`, `/api/v1/leaderboard/{gameType}/nearby/{userId}` |
| Players | `/api/v1/players/{userId}`, `/api/v1/players/{userId}/stats`, `/api/v1/players/{userId}/learning`, `/api/v1/players/{userId}/report` |
| Credits | `/api/v1/credits/{userId}/balance`, `/api/v1/credits/{userId}/transactions`, `/api/v1/credits/{userId}/award`, `/api/v1/credits/{userId}/purchase`, `/api/v1/credits/{userId}/consume` |
| Badges | `/api/v1/badges`, `/api/v1/badges/{badgeId}`, `/api/v1/badges/{userId}/progress`, `/api/v1/badges/{userId}/award` |
| Logs | `/api/v1/logs`, `/api/v1/logs/query`, `/api/v1/logs/stats`, `/api/v1/logs/sql`, `/api/v1/logs/test-sql` |
| Resources | `/api/v1/resources` GET/DELETE |
| Assets | `/api/v1/assets`, `/api/v1/assets/{assetId}` GET/PUT/DELETE |
| Test | `/api/v1/test`, `/api/v1/test/clear-all` |
| Docs & Monitoring | `/api/v1/docs`, `/openapi.json`, `/api/v1/metrics`, `/api/v1/alerts`, `/api/v1/image-proxy` |

**Credit balance response:** `gp_balance`, `ac_balance` (flat), not `balances: { GP, AC }`.

### Durable Objects

**MatchCoordinatorDO:** `/match/{matchId}`, `/match/{matchId}/create`, `/join`, `/move`, `/checkpoint`, `/sync`, `/finalize`

**CreditsDO:** `/v1/award`, `/v1/purchase`, `/v1/consume`, `/v1/balance`, `/v1/transactions`

### Local API (Vite Dev)

`/local/api/resources`, `/local/api/logs`, `/local/api/logs/query`, `/local/api/logs/stats`, `/local/api/logs/clear`, `/local/api/logs/sql`, `/local/api/open-in-editor`, `/local/api/sync-from-r2`, `/local/api/sync-to-r2`, `/local/api/sync-status`, `/local/api/toggle-remote-assets`, `/local/api/scan-r2-status`, `/local/api/sync-asset`

### Prod API (Main App → Worker)

`/api/v1/resources`, `/api/v1/logs`, `/api/v1/logs/query`, `/api/v1/logs/stats`

### Firebase Callables

`checkAdminStatus`, `setAdminStatus`

### Tokens API

`/api/v1/tokens/balance/{userId}`, `/api/v1/tokens/daily-login`, `/api/v1/tokens/ad-reward`, `/api/v1/tokens/game-payment`, `/api/v1/tokens/ai-credits/consume`

### Stripe API

`/api/v1/stripe/create-checkout-session`, `/api/v1/stripe/webhook`

### Solana

RPC cluster URLs (`clusterApiUrl`), program IDs from `Rust/ocentra-games/programs/`
