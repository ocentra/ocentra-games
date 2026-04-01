# Build Scripts

## `upload-assets.ts`

**Purpose:** Bulk upload CLI tool for syncing all assets to R2 storage.

**Who uses it:**
1. **GitHub Actions CI/CD** (`.github/workflows/sync-assets.yml`) - Automatically syncs assets on push to main
2. **Manual CLI usage** - For bulk operations, CI mode, or when you need filtering

**When to use:**
- ✅ CI/CD pipelines (automated)
- ✅ Bulk upload all assets (ignores change detection)
- ✅ Filtered uploads (`--filter Cards`)
- ✅ Dry-run preview (`--dry-run`)
- ✅ Git-based change detection (`--check-changes`)

**When NOT to use:**
- ❌ Day-to-day development - Use Asset Editor UI instead
- ❌ Syncing individual changed files - Asset Editor is smarter

## Comparison: Script vs Asset Editor UI

| Feature | `upload-assets.ts` | Asset Editor UI |
|---------|-------------------|-----------------|
| **Change Detection** | Git diff or force all | Checksum-based (smarter) |
| **Metadata Tracking** | None | Tracks sync status per asset |
| **UI** | CLI only | Visual interface |
| **Use Case** | CI/CD, bulk ops | Daily development |
| **Filtering** | ✅ Yes (`--filter`) | ❌ No |
| **Dry Run** | ✅ Yes | ❌ No |

**Recommendation:**
- **Developers:** Use Asset Editor UI "Sync to R2" button (only syncs changed files)
- **CI/CD:** Use `upload-assets.ts` script (automated, reliable)
- **Bulk operations:** Use `upload-assets.ts` with filters

## `verify-build.js`

**Purpose:** Verifies that `dist/` doesn't contain `Resources/` directory. This ensures `packages/asset-editor/Resources/` is NOT bundled into the production build.

**Why it matters:**
- Assets should be served from R2 (production) or `packages/asset-editor/Resources/` (dev), not bundled
- Bundling assets would bloat the production bundle unnecessarily
- Assets are loaded dynamically at runtime via `AssetLoader`, not statically bundled

**Who uses it:**
1. **Build process** (`npm run build`) - Runs automatically after `vite build`
   - If verification fails, build exits with error code 1
2. **Manual verification** - `npm run build:verify` (standalone)
3. **CI/CD workflows** (`.github/workflows/ci.yml`) - Indirectly via `npm run build`
   - `build-typescript` job (line 204)
   - `deploy-cloudflare-pages` job (line 267)

**What it checks:**
- ✅ `dist/` directory exists
- ✅ `dist/Resources/` directory does NOT exist (fails build if found)

**Failure example:**
```
❌ ERROR: dist/Resources/ directory found!
   packages/asset-editor/Resources/ should NOT be bundled.
   Check vite.config.ts build configuration.
```


