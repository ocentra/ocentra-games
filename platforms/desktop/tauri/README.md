# Desktop Tauri Platform

This folder contains the desktop shell for Ocentra using Tauri v2.
The web app UI is loaded from the workspace frontend build/dev server,
and native desktop capabilities are exposed via Tauri commands in Rust.

## What this platform does

- Hosts the web UI in a desktop window.
- Provides native commands for:
  - secure token/secret storage (`keyring`),
  - local cache file reads/writes,
  - OAuth callback server on localhost,
  - remote resource fetch with ETag support.
- Adds system tray behavior and window state persistence.
- Enables updater plugin artifacts for release channels.

## Key files

- `tauri.conf.json`:
  - `devUrl`: `http://localhost:3000`
  - `frontendDist`: `../../../dist`
  - `beforeDevCommand`: `node tauri/run-dev-main.cjs`
  - `beforeBuildCommand`: `node tauri/run-build-main.cjs`
- `Cargo.toml`: app crate, plugins, and Rust dependencies.
- `src/main.rs`: desktop entrypoint delegates to `ocentraplatform_lib::run()`.
- `src/lib.rs`: Tauri app builder and all `#[tauri::command]` handlers.

## Runtime behavior

- Main window close is intercepted and converted to hide-to-tray behavior.
- Left-click tray icon toggles show/hide of the main window.
- Window size/position state is saved via `tauri-plugin-window-state`.
- Native cache is stored under app cache directory in:
  - `asset-cache/entry-index-cache.json`
  - `asset-cache/assets/`
  - `asset-cache/images/`
  - `asset-cache/content-slices/`

## Auth behavior: desktop vs web

Desktop runtime can resolve auth token through native bridge commands (for example `get_auth_token`) exposed from Tauri Rust.

- Desktop-first path: Tauri command bridge token retrieval.
- Web fallback path: Firebase web `currentUser.getIdToken(...)`.

Admin UI routes depend on a valid bearer token reaching worker APIs. If `/admin` gets `401`, verify desktop command token path is active before web fallback.

## OAuth behavior: desktop vs web

- Web: browser Firebase/OAuth flow.
- Desktop: system browser OAuth callback + localhost callback server managed by Tauri command layer.

Use desktop OAuth client credentials for Tauri flows; web OAuth settings alone are insufficient for native callback handling.

## Dev orchestration note (shared backend + turbo)

Desktop dev uses workspace-level dev orchestration scripts. The shared local worker (`:8787`) and recent Turbo warm state can be reused across app/editor starts to avoid duplicate backend spin-up.

## Security and identity

- App identifier: `gg.ocentra.desktop`.
- Secrets are stored using OS keychain services via `keyring`.
- Updater endpoint is configured in `tauri.conf.json`.

## Related docs

- [Asset handling (main app desktop: resolve + fetch)](../../../docs/ocentra/asset-handling.md)
- `ARCHITECTURE.md` in this folder for flow diagrams.
