# @ocentra/asset-editor

Asset Editor UI - dedicated editor app for creating and editing game assets.

## Status

This package is the standalone Asset Editor app in `packages/asset-editor`.
It is no longer served from `src/ui/pages/dev/AssetEditor` in the main app.

## Architecture Snapshot

- Local editing path: Tauri Rust commands and SQLite-backed asset index
- Cloud sync path: claim-storage asset routes in `infra/cloudflare`
- Main app path: read-only asset consumption from public asset URLs

## Canonical Editor Docs

- **Asset handling (main app vs editor, dev/prod, Tauri, sync targets):** `docs/ocentra/asset-handling.md`
- Runtime flows: `packages/asset-editor/docs/RUNTIME-FLOWS.md`
- Schema-change checklist: `packages/asset-editor/docs/SCHEMA-CHANGE-CHECKLIST.md`
- Resource tree internals: `packages/asset-editor/src/pages/ResourceTree/ARCHITECTURE.md`

## Runtime Ownership

- Rust/Tauri owns filesystem scan, index rebuild, and byte-level loading.
- TypeScript owns editor UI state, inspector forms, and command orchestration.
- Manifest sync/rebuild spans editor and Cloudflare worker paths.

## Tauri Asset DB Runtime

- Tauri commands are registered in `packages/asset-editor/src-tauri/src/lib.rs`.
- Asset index and load flows are implemented in `packages/asset-editor/src-tauri/src/commands/asset_db.rs`.
- `load_asset` enforces exactly one identifier input: `guid` or `path`.
- DB-backed folder/resource lookups use `get_resources_in_folder_db`, `get_resource_by_guid_db`, and related query commands.

## Consolidation Note

There is no separate `cloudflare-assets` worker anymore.
All cloud asset APIs now live in the single `claim-storage` worker in `infra/cloudflare`.

Preferred env names:

- `VITE_CLAIM_STORAGE_URL`
- `VITE_ASSETS_PUBLIC_URL`

Deprecated compatibility alias still accepted:

- `VITE_ASSETS_WORKER_URL`

## Test And Verification

- Unit/integration (asset-editor package): `npm run test:editor` from repo root, or `npm --prefix packages/asset-editor run test`
- Watch mode: `npm --prefix packages/asset-editor run test:watch`
- Coverage: `npm --prefix packages/asset-editor run test:coverage`
- Worker asset route regression: `npm --prefix infra/cloudflare run test -- tests/integration/resources-api.test.ts`

## Google Sign-In: Web Vs Tauri

- Web: Firebase and Google config come from the repo root `.env` / `.env.local`
- Tauri: uses desktop OAuth via local server + system browser
- Tauri should use desktop OAuth client credentials (not web client credentials)

## Tauri Desktop App - Google Sign-In Setup

1. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth client ID of type `Desktop app`.
2. Add redirect URI `http://127.0.0.1:8765` to that desktop client.
3. Put the downloaded client secret JSON in `packages/asset-editor` as `client_secret_<client_id>.json`.
4. From `packages/asset-editor`, run `npm run env:from-google-json`.
5. Run `npm run dev:tauri`, or from repo root `npm run dev:editor:tauri`.

If you see `redirect_uri_mismatch`, the desktop client redirect URI is wrong.
If you see `client_secret is missing` or `invalid_client`, you used a Web client instead of a Desktop client.

## Shared dev backend and turbo reuse

Asset editor and main app are separate Tauri binaries, but in local development they can reuse the same shared backend worker process and warm Turbo state from workspace dev orchestration.

- Shared worker target: local Cloudflare worker on `:8787`
- Editor + main app can be started independently without requiring duplicate backend stacks

## Tauri Desktop App - Windows Crash

If the app exits with `0xc0000409` or `STATUS_STACK_BUFFER_OVERRUN` during WebView2 init:

1. Install or repair WebView2.
2. Avoid multiple WebView2 runtimes.
3. Run the app from a normal filesystem path such as `E:\ocentra-games`.

## Web Dev: API Proxy

Vite proxies `/api` to `http://localhost:8787`.
If claim-storage is not running on `8787`, requests like `GET /api/v1/assets/sync/status` will fail.

## Logs And NDJSON

Logs and NDJSON live under `packages/asset-editor/.logs/` so the asset-editor stays self-contained.

- `npm run dev` wipes `.logs` on startup
- frontend log batches POST to `/__asset-editor-logs__`
- Vite appends NDJSON and ingests into DuckDB
- Tauri build logs to console unless native log persistence is added

## Logger Setup

The asset-editor uses `AssetEditorLogger` from `@ocentra/logging-domain`.
Do not use `console.log`.
