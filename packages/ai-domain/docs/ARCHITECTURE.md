# AI Domain – Architecture

This document describes the ai-domain architecture. `@ocentra/ai-domain` is the single source of truth for AI: types, constants, provider logic, prompts, auth, and settings. The game engine, Cloudflare Worker, and main app consume from this package.

---

## What It Is

`@ocentra/ai-domain` is **pure logic**. It contains NO Firebase, Cloudflare APIs, DOM, or direct network calls. It receives adapters (Secret, Fetch, Storage) from the host and does not store API keys itself. The Cloudflare Worker owns key storage and decryption; the browser never sees API keys.

---

## System Overview

```mermaid
flowchart TB
    subgraph main["Main App (Browser)"]
        UI[Settings UI]
        AIPlay[AIPlayground]
        GameEngine[Game Engine]
    end

    subgraph adapters["Main App Adapters"]
        WorkerFetch[WorkerFetchAdapter]
        IDBStorage[IDBStorageAdapter]
    end

    subgraph domain["@ocentra/ai-domain"]
        types[types/]
        constants[constants/]
        providers[providers/]
        prompts[prompts/]
        registry[utils/registry]
        validators[validators/]
    end

    subgraph worker["Cloudflare Worker"]
        aiKeys[ai-keys handlers]
        aiProxy[ai-proxy handler]
        userKeysDO[UserKeysDO]
    end

    UI --> WorkerFetch
    AIPlay --> WorkerFetch
    GameEngine --> types
    GameEngine --> prompts

    WorkerFetch --> |"POST /api/v1/ai/*"| aiKeys
    WorkerFetch --> |"POST /api/v1/ai/generate"| aiProxy

    aiKeys --> userKeysDO
    aiProxy --> domain
    aiProxy --> userKeysDO
```

**Flow summary:** Main app calls worker endpoints. Worker uses ai-domain provider classes with real adapters. ai-domain provides types, constants, providers, and prompts; it does not call external APIs directly.

---

## Request Flow: Key Storage and AI Generation

```mermaid
sequenceDiagram
    participant Browser as Main App
    participant Worker as Cloudflare Worker
    participant DO as UserKeysDO
    participant Domain as ai-domain

    Note over Browser: User enters API key in Settings
    Browser->>Worker: POST /api/v1/ai/keys { providerId, apiKey }
    Worker->>Worker: Auth (JWT)
    Worker->>Worker: Encrypt key (AES-256-GCM)
    Worker->>DO: Store ciphertext + IV
    Worker->>Browser: { success: true }
    Note over Browser: API key NEVER reaches browser storage

    Note over Browser: User triggers AI generation
    Browser->>Worker: POST /api/v1/ai/generate { providerId, systemPrompt, userPrompt }
    Worker->>Worker: Auth (JWT)
    Worker->>DO: Get encrypted key
    Worker->>Worker: Decrypt with master key
    Worker->>Domain: create provider with decrypted key
    Worker->>Domain: provider.generate(request)
    Domain->>Domain: Provider calls external API
    Domain->>Worker: GenerationResult
    Worker->>Browser: GenerationResult
```

---

## Component Connections

```mermaid
flowchart LR
    subgraph browser["Main App"]
        aiService[ai-service]
        workerFetch[WorkerFetchAdapter]
    end

    subgraph cf["Cloudflare Worker"]
        handleKeys[ai-keys handlers]
        handleProxy[ai-proxy handler]
        aiLogic[ai-domain providers]
    end

    subgraph pkg["@ocentra/ai-domain"]
        t[types]
        c[constants]
        p[providers]
        pr[prompts]
        v[validators]
    end

    aiService --> workerFetch
    workerFetch --> |HTTP| handleKeys
    workerFetch --> |HTTP| handleProxy

    handleKeys --> |"encrypt/store"| DO[(UserKeysDO)]
    handleProxy --> |"decrypt"| DO
    handleProxy --> aiLogic
    aiLogic --> t
    aiLogic --> c
    aiLogic --> p
    aiLogic --> pr
    aiLogic --> v
```

---

## What Lives Where

```mermaid
flowchart TB
    subgraph pkg["packages/ai-domain"]
        types[types/]
        constants[constants/]
        providers[providers/]
        auth[auth/]
        prompts[prompts/]
        utils[utils/]
        validators[validators/]
        logger[logger/]
    end

    subgraph infra["infra/cloudflare"]
        aiKeysLogic[logic/ai-keys.ts]
        userKeysDO[durable-objects/UserKeysDO.ts]
        aiKeysHandler[handlers/ai-keys.ts]
        aiProxyHandler[handlers/ai-proxy.ts]
    end

    subgraph app["src/ (main app)"]
        workerFetch[adapters/ai/worker-fetch-adapter.ts]
        idbStorage[adapters/ai/idb-storage-adapter.ts]
        aiService[services/ai/ai-service.ts]
    end

    aiKeysLogic --> userKeysDO
    aiProxyHandler --> pkg
    aiKeysHandler --> aiKeysLogic
    aiProxyHandler --> pkg

    aiService --> workerFetch
```

| Location | Contains |
|----------|----------|
| **packages/ai-domain** | Types, constants, providers, auth, prompts, registry, validators, logger |
| **infra/cloudflare** | AI key encryption, UserKeysDO, worker endpoints (ai-keys, ai-proxy) |
| **src/ (main app)** | Worker adapters, ai-service, UI (Settings, AIPlayground) |

---

## Adapter Pattern

ai-domain never imports host-specific code. The host provides adapters:

```mermaid
flowchart TB
    subgraph domain["ai-domain"]
        provider[Provider]
    end

    subgraph host["Host (Worker or Main App)"]
        secret[SecretAdapter]
        fetch[FetchAdapter]
        storage[StorageAdapter]
    end

    provider --> |"getSecret()"| secret
    provider --> |"fetch()"| fetch
    provider --> |"get/set (optional)"| storage
```

| Adapter | Purpose | Worker | Browser |
|---------|---------|--------|---------|
| **SecretAdapter** | API key retrieval | Reads from DO, decrypts | Returns null (worker holds keys) |
| **FetchAdapter** | HTTP requests | `globalThis.fetch` | Routes through worker proxy |
| **StorageAdapter** | Persistence (non-secret) | Optional | IndexedDB for UI preferences |

---

## Key Management: Two Tiers

```mermaid
flowchart TB
    subgraph tier1["Primary: CF AI Gateway"]
        gateway[CF AI Gateway]
        secretsStore[Secrets Store]
        note1[Keys in hardware-grade AES]
    end

    subgraph tier2["Fallback: Durable Objects"]
        worker2[Worker]
        masterKey[Master Key in Worker Secrets]
        userDO[UserKeysDO per user]
        aes[AES-256-GCM, random IV per record]
    end

    gateway --> secretsStore
    worker2 --> masterKey
    worker2 --> userDO
    userDO --> aes
```

- **BYOK:** Customer provides API key → encrypted on worker → free AI usage.
- **Platform AI:** Ocentra keys on worker → customer pays credits.

---

## Package Layout (ai-domain)

```
packages/ai-domain/
├── src/
│   ├── types/           # Interfaces, branded types
│   │   provider.ts      # ProviderId, ProviderType
│   │   config.ts        # BaseProviderConfig, ApiKeyProviderConfig
│   │   service.ts       # ILLMService
│   │   adapters.ts      # SecretAdapter, FetchAdapter, StorageAdapter
│   │   result.ts        # GenerationResult, ConnectionTestResult
│   │   inference.ts     # InferenceSettings
│   ├── constants/
│   │   auth-types.ts    # AuthType enum
│   │   errors.ts        # AIErrorCode, AIError
│   │   endpoints.ts     # Default base URLs
│   │   models.ts        # Default model lists
│   │   provider-catalog.ts
│   │   provider-categories.ts
│   ├── providers/       # One file per provider
│   │   base-provider.ts
│   │   openai-compatible.ts
│   │   openai.ts, anthropic.ts, gemini.ts, ollama.ts, ...
│   ├── auth/
│   │   oauth-types.ts, oauth-config.ts, oauth-flow.ts
│   │   token-manager.ts
│   ├── prompts/
│   │   prompt-types.ts, prompt-builder.ts
│   ├── utils/
│   │   provider-registry.ts, provider-manager.ts
│   │   local-discovery.ts
│   ├── validators/
│   │   config-validators.ts, request-validators.ts
│   └── logger/
│       runtime.ts, noop.ts
├── docs/
│   ├── ARCHITECTURE.md
│   └── README.md
└── package.json
```

---

## API Endpoints (Worker)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/ai/keys` | POST | Store encrypted API key |
| `/api/v1/ai/keys` | GET | List configured providers (IDs only) |
| `/api/v1/ai/keys/{providerId}` | DELETE | Remove key |
| `/api/v1/ai/keys/{providerId}/test` | POST | Test connection |
| `/api/v1/ai/generate` | POST | Run generation (systemPrompt, userPrompt, model, etc.) |

---

## Consumers

| Consumer | Uses |
|----------|------|
| Main app | Types, constants, prompt builder, provider catalog |
| Cloudflare Worker | Provider classes (with real adapters), validators, auth |
| Tests | Everything (with mock adapters) |

---

## Logger Setup

ai-domain uses an injectable logger. The host must call `initLogger(...)` before any ai-domain code runs.

**Main app:** Forward to app logger during bootstrap.

**Cloudflare Worker:** Forward to worker logger after `initLogger(env.ANALYTICS, ...)`.

**Tests:** Use `noopLogger` or mock; call `resetLogger()` in teardown.

Exports: `initLogger`, `setLogger`, `getLogger`, `resetLogger` from `@ocentra/ai-domain/logger/runtime`; `noopLogger` from `@ocentra/ai-domain/logger/noop`.

---

## Provider Categories

| Category | Providers | Auth |
|----------|-----------|------|
| Cloud API | OpenAI, Anthropic, Gemini, Groq, DeepSeek, Together, Fireworks, Perplexity, xAI, Mistral, Cohere | api_key / oauth2 |
| Aggregator | OpenRouter | api_key |
| Local Server | Ollama, LMStudio, vLLM, LocalAI, KoboldCpp | none |
| Browser | transformers.js, WebLLM | none |
| Native | Native app | none / bearer |

---

## Conventions

- No barrel imports; import from specific files (e.g. `@ocentra/ai-domain/types/provider`).
- Branded types: `ProviderId`, `ProviderType`, etc.
- Constants use `as const` pattern.
- Provider classes are NOT singletons; registry uses factories.
- camelCase method names.
- Security guarantees G1–G6 from project rules apply.

## Pipelines and Fetch (Platform Notes)

See also: `docs/ocentra/Architecture/platform-support-matrix.md` (host injection, quota recovery).

### DOM / Renderer vs Main Process

- Pipelines use DOM, fetch, Blob, and Web APIs. **Never run inference in Electron main** or Node-only environments without DOM polyfills.
- Run inference in **renderer/WebView only** (browser, Electron renderer, Capacitor WebView).
- React Native has memory limits; consider smaller models and test on devices.

### Fetch Injection

- Host **must** inject fetch when not in a browser. `globalThis.fetch` may differ in Node, workers, or edge runtimes.
- Use `wireFetchInterceptor(getConfig, { transformersEnv, baseFetch })` to wire the fetch interceptor.
- See `@ocentra/ai-domain/utils/wire-fetch-interceptor` and `fetch-intercept.ts` JSDoc.

### Build Target

- Pipeline code requires DOM for Blob, fetch, etc. Build target must include DOM.
- For Node-only builds (CLI, tests), exclude pipeline modules or provide stub implementations.

### OAuth / Deep Links

- Desktop and mobile handle OAuth redirects differently (deep links, custom URL schemes).
- Host must configure redirect URIs per platform.

---

## Shared Constants (endpoint-domain)

ai-domain depends on `@ocentra/endpoint-domain`. Do not redeclare constants that exist there. Import and use:

- `HttpMethod`, `HttpStatus`, `HttpHeader`, `ContentType`, `HttpAuthScheme` from `@ocentra/endpoint-domain/constants/http` when building providers or making HTTP calls
- `ErrorMessage` from `@ocentra/endpoint-domain/constants/errors` if mapping AI errors to API responses
- Branded types from `@ocentra/endpoint-domain/types/brands` if applicable

endpoint-domain and logging-domain remain pure (no imports from ai-domain); ai-domain imports from them without creating circular dependencies.
