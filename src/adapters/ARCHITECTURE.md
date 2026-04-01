# Adapters Architecture (`src/adapters`)

## Purpose

Adapters are boundary translators between:

- app runtime specifics (web/desktop/mobile hosts, browser APIs)
- domain contracts from `packages/*`

They keep UI and services from talking directly to raw infra details.

## Adapter Layer Model

```mermaid
flowchart LR
  UI[UI and hooks]
  SVC[App services and bootstrap]
  ADP[src/adapters]
  DOM[@ocentra/* domain packages]
  HOST[Platform hosts and external SDKs]

  UI --> ADP
  SVC --> ADP
  ADP --> DOM
  ADP --> HOST
```

## Main Adapter Families

```mermaid
flowchart TD
  A[adapters]
  AS[assets and image]
  AU[auth and credentials and firebase]
  NW[network]
  ST[storage]
  AI[ai]
  SO[solana]
  PAY[tokens and stripe]
  GM[game]

  A --> AS
  A --> AU
  A --> NW
  A --> ST
  A --> AI
  A --> SO
  A --> PAY
  A --> GM
```

## Event-Driven Resource Path

```mermaid
sequenceDiagram
  participant UI as UI consumer
  participant Loader as adapters/assets/AssetLoader
  participant Bus as EventBus
  participant Router as adapters/network/NetworkRouter
  participant Runtime as Asset runtime resolver
  participant Domain as endpoint and network domains

  UI->>Loader: request asset by guid/hash
  Loader->>Bus: publish GetResourceEvent
  Bus->>Router: route event to network handler
  Router->>Runtime: resolve platform asset request
  Runtime->>Domain: build endpoint-aware request
  Domain-->>Router: response
  Router-->>Loader: OperationResult<Response>
  Loader-->>UI: URL/blob response
```

## Platform-Specific Adapter Selection

Adapters commonly branch by runtime:

- auth bridge: web vs desktop vs native
- storage backend bridge: web IDB vs desktop path-resolver vs mobile backend
- shell-aware and platform-aware asset/image cache choices

This logic depends on runtime from `@ocentra/app-core/platform`.

## Admin auth flow across runtimes

```mermaid
sequenceDiagram
  participant AdminUI as Admin Users Page
  participant API as api-domain requestJson
  participant Bridge as adapters/auth bridge
  participant Worker as Cloudflare admin routes

  AdminUI->>API: requestJson(..., authMode: required)
  API->>Bridge: getAuthToken()
  alt Desktop runtime
    Bridge-->>API: token via Tauri command bridge
  else Web runtime
    Bridge-->>API: token via Firebase web SDK
  end
  API->>Worker: Authorization: Bearer <token>
  Worker-->>AdminUI: 200/401/403
```

Desktop and web OAuth are intentionally different host paths, but both must produce the same Firebase bearer token contract for protected worker APIs.

## Domain Dependencies (Typical)

High-usage domain packages from adapters include:

- `@ocentra/asset-domain`
- `@ocentra/eventing-domain`
- `@ocentra/endpoint-domain`
- `@ocentra/network-domain`
- `@ocentra/storage-domain`
- `@ocentra/ai-domain`
- `@ocentra/solana-domain`
- `@ocentra/auth-domain`
- `@ocentra/credentials-domain`
- `@ocentra/logging-domain`

## Platform Host Connections

Adapter behavior is consumed by platform shells documented in:

- `../../platforms/desktop/tauri/README.md`
- `../../platforms/mobile/README.md`
- `../../platforms/mobile/android/README.md`
- `../../platforms/mobile/ios/README.md`
