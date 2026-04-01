# Asset Schema Change Checklist

When required fields change, update every producer and validation path in the same change.

## Manifest Producers

- `packages/asset-editor/src-tauri/src/commands/asset_db.rs`
  - `export_manifest`
  - `validate_manifest_before_write`
- `packages/asset-editor/src/adapters/assets/ManifestEventHandler.ts`
  - `defaultManifest`
- `packages/asset-editor/src/adapters/network/NetworkRouter.ts`
  - `ensureManifest`
- `infra/cloudflare/src/logic/assets/manifest-loader.ts`
  - Rebuild/validation assumptions for manifest resources

## Validation Paths

- TypeScript required-field validation pipeline:
  - `vite/plugins/requiredFieldValidation.ts`
  - generated required-fields map
- Rust manifest validation:
  - `asset_db.rs` manifest validation functions
- CI validation command:
  - `npm run validate:assets`

## Required Change Sequence

1. Update schema and required fields in the authoritative schema source.
2. Update all manifest producers (Rust + TypeScript).
3. Update validation rules where required.
4. Run editor and asset validation commands.
5. Fix failing assets or generators before merge.
