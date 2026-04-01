# Asset Editor Runtime Flows

This document is the canonical runtime flow reference for the standalone editor in `packages/asset-editor`.

## Manifest Flow

- Scan and index paths start in `NetworkRouter.scanAssets`.
- Tauri runtime uses Rust commands for disk/index operations.
- Cloud runtime uses `POST /api/resources` and manifest rebuild paths in `infra/cloudflare`.
- Local save and upload paths persist manifest updates through editor handlers.

## Selection, Tree, and Load Flow

- Tree selection emits asset identity payloads (`path`, `guid`, `id`, `hash`).
- Navigation resolves an identifier and loads through the network router.
- Asset content is written into editor state (`assetData`, `assetPath`, raw content).
- Resource tree behavior and reducer details live in `src/pages/ResourceTree/ARCHITECTURE.md`.

## Preview and Inspector Flow

- Preview pipeline: tree selection -> navigation -> load -> preview component.
- Inspector pipeline: editor state -> inspector connectors -> typed inspector panels.
- Save path goes through upload events and network router persistence.

## Image Loading Flow

- Image requests are event-driven, not polling.
- `ImageLoadingService` handles batch request events and emits batch loaded events.
- Fetch retries use bounded retry/backoff behavior for failed or timed-out requests.

## GUID/Path Loading Behavior

- `load_asset` supports exactly one identifier (`guid` or `path`) per request.
- GUID loads resolve path through index first, then read bytes.
- Path loads validate existence/index assumptions before reading bytes.

## Network Router Runtime

- Editor runtime uses a unified router API for dev and remote modes.
- Resource reads route through `/api/resources`-style contracts.
- Manifest and resource fetch behavior is shared across adapter call sites.
