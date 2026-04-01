# Main App UI-Only Migration - Hard Status (Post-Fix)

**Date:** 2026-03-01
**Scope split used for verdicts:**
1. In-scope plan (`main_app_ui-only_migration_d76d9b1d.plan.md`): AI + storage + provider flow migration, desktop/mobile runtime abstractions (excluding desktop/mobile UI shells).
2. Out-of-scope full-repo target: move all non-UI domains (engine/game/network/serialization/etc.) out of `src/`.

## Binary Verdict

- **AI/storage/provider migration scope:** **DONE**
- **Whole app pure UI-only (all domains moved):** **NOT DONE**

No gray language: this is the exact current state.

## What Was Fixed In This Pass

### A10 - No direct global fetch inside ai-domain runtime
- Updated `packages/ai-domain/src/orchestration/AIPlayerService.ts`
  - Removed global fetch fallback.
  - Added explicit adapter requirement when `aiServiceUrl` is configured.
- Updated `src/ai/AIPlayerService.ts`
  - Main app now injects host fetch adapter explicitly.
- Added test: `packages/ai-domain/tests/unit/orchestration/ai-player-service.test.ts`

### A5 - Cache integrity + corruption recovery
- Added checksum utility:
  - `packages/storage-domain/src/model-cache/chunk-integrity.ts`
- Added checksum write/verify + corrupt-group purge in:
  - `packages/storage-domain/src/model-cache/IDBModelCacheAdapter.ts`
  - `packages/storage-domain/src/model-cache/FileSystemModelCacheAdapter.ts`
  - `packages/storage-domain/src/model-cache/NativeModelCacheAdapter.ts`
- Added corruption regression test:
  - `packages/storage-domain/tests/NativeModelCacheAdapter.spec.ts`

### 3.4 - Bounded key scans / pagination controls
- Extended backend key options with `offset`:
  - `packages/storage-domain/src/backends/in-memory-native-backend.ts`
  - `packages/storage-domain/src/backends/async-storage-native-backend.ts`
  - `src/lib/db/IndexedDBInitializer.ts` host backend type
- Added paged scan logic and hard caps in native/file adapters.
- Added test coverage for offset paging:
  - `packages/storage-domain/tests/in-memory-native-backend.spec.ts`

## Validation Evidence

All executed after fixes:

1. `cd packages/storage-domain && npm test` -> **PASS** (`13 passed`)
2. `cd packages/ai-domain && npm test` -> **PASS** (`228 passed`, `4 skipped` live/integration)
3. `npm run -s type-check` (repo root) -> **PASS**
4. `npm run -s lint` (repo root) -> **PASS** (warnings only, no errors)

## If You Mean "100% UI-only for entire main app"

That is still not complete (separate migration phases still pending).
Current remaining non-UI footprint in `src/`:

- `src/engine`: 12 files
- `src/gameMode`: 6 files
- `src/network`: 12 files
- `src/services`: 82 files
- `src/lib`: 219 files

So: AI/storage plan is complete; full-repo UI-only is not.