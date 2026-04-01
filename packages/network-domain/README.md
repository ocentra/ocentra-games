# @ocentra/network-domain

Browser-oriented **P2P WebRTC** building blocks (types, `WebRTCHandler`, `P2PManager`, `useP2PNetworking`) plus **router-type re-exports** from `@ocentra/boundary-domain` so apps and other domains share one shape for asset/router contracts.

## Scope

- **In:** WebRTC peer/data-channel helpers, P2P manager, optional React hook, shared `ResourceRequest` / `AssetEntry` / `ScanResponse` types.
- **Out:** Signaling servers, matchmaking, TURN credentials, and non-browser transports live outside this package.

## Public API (`package.json` `exports`)

Import from **specific subpaths** (no barrel).

- **`@ocentra/network-domain/types`** — `ConnectionStatus`, `PeerConnection`, `PeerMessage`, `SignalingMessage`, `PeerMedia`, chat payload types.
- **`@ocentra/network-domain/connection/WebRTCHandler`** — `WebRTCHandler`: `RTCPeerConnection` map, data channels, offer/answer, ICE, optional media tracks, JSON messages over data channel (includes automatic `ping` → `pong`).
- **`@ocentra/network-domain/managers/P2PManager`** — `P2PManager`, `P2PManagerConfig`, `ChatMessage`: wraps `WebRTCHandler` with chat/system broadcast helpers and connection lifecycle callbacks.
- **`@ocentra/network-domain/hooks/useP2PNetworking`** — React hook: state for peers, messages, remote streams, errors; exposes offer/answer/ICE/chat helpers. Requires **React** when used.
- **`@ocentra/network-domain/router-types`** — type-only re-exports: `ResourceRequest`, `AssetEntry`, `ScanResponse`, `ImageEntry`, `FileEntry` (from boundary-domain).

## Dependencies

- **`@ocentra/boundary-domain`** — source of truth for router/scan types re-exported under `router-types`.
- **`@ocentra/logging-domain`** — `MainAppLogger` / `getStackTrace` in `WebRTCHandler` for errors.
- **`react`** — optional peer dependency for `useP2PNetworking` only.

## Runtime

Uses **browser WebRTC APIs** (`RTCPeerConnection`, `RTCDataChannel`, `MediaStream`). Default ICE config uses public STUN hosts; override via `RTCConfiguration` where supported.

## Scripts

- **`npm run build`** — `tsc`, `tsc-alias`, ESM import fix.
- **`npm run type-check`** — `tsc --noEmit`.
- **`npm run lint`** — ESLint + type-check (`src`, `tests`).
- **`npm run test`** — Vitest unit tests (`tests/`).

## Related docs

- [ARCHITECTURE.md](./ARCHITECTURE.md) — layers, signaling flow, dependency diagram.
