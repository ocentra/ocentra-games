# Network Router Adapter

Main-app adapter for read-only asset access plus local app log events.

## Current Role

- `GetResourceEvent`: resolves asset bytes through the manifest/public asset pipeline
- `BatchGetResourcesEvent`: resolves multiple asset reads
- `SaveLogsEvent`, `QueryLogsEvent`, `GetLogStatsEvent`, `ClearLogsEvent`: forwards log operations to the local app API

Main-app authoring flows were removed. Asset creation, delete, scan, manifest repair, and sync now belong to the standalone asset editor.

## Runtime Model

- Main app reads assets from `assetsPublicUrl` when available
- Fallback reads go through claim-storage via `CloudService`
- No main-app Vite asset CRUD middleware remains

## Resource Routing Model

- Resource access is GUID/hash/checksum-centric through the router adapter.
- Runtime routes to worker-backed resource endpoints in production.
- Development mode still uses local app/dev server routing behavior.
- Main app remains read-only for assets; authoring APIs belong to `packages/asset-editor`.

## Related

- Main app read path: `src/adapters/assets/ManifestService.ts`
- Main app storage config: `src/services/storage/StorageConfig.ts`
- Standalone editor: `packages/asset-editor`
