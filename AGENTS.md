# Ocentra Games - Agent Quick Reference

**Last Updated:** 2026-05-11

Quick pointers for AI agents. For detailed rules, see [`.cursor/rules/`](#cursor-rules).

---

## Domain Packages (MANDATORY — Use Them, Don’t Bypass)

**AI must use the correct domain package for each concern.** Do not introduce raw strings, duplicate constants, or new `src/constants` entries for things a domain already owns. Using the wrong source causes drift, bugs, and merge conflicts.

| Package | Owns | Import from (example) | Do NOT |
|--------|------|------------------------|--------|
| **@ocentra/boundary-domain** | R2 bucket names, R2 path prefixes, Firestore collection names | `@ocentra/boundary-domain/constants/buckets` | Use `'ocentra-assets'`, `'claim-matches'`, `'matches/'`, `'users'` etc. as literals |
| **@ocentra/endpoint-domain** | API paths, HTTP methods/headers, query params, route keys | `@ocentra/endpoint-domain/constants/cloudflare` (or specific file) | Use raw paths like `'/api/v1/...'`, raw `'GET'`, `'Authorization'` |
| **@ocentra/logging-domain** | Logger API, log levels, structured logging | Per package README / `@ocentra/logging-domain` | Use `console.log` or ad‑hoc log formats |
| **@ocentra/ai-domain** | AI provider types, model IDs, pipeline keys, prompts | `@ocentra/ai-domain` (specific modules) | Hardcode provider names, model IDs, or prompt keys in app |
| **@ocentra/seo-domain** | SEO audit helpers, raw HTML/body verification, sitemap/robots/internal-link audit logic | `@ocentra/seo-domain` | Rebuild ad-hoc SEO crawlers or metadata audit helpers in app/scripts |
| **@ocentra/storage-domain** | Cache/IndexedDB config, validation constants | `@ocentra/storage-domain` | Duplicate storage config or validation rules in app |
| **@ocentra/asset-domain** | Asset types, resource entry, serialization | `@ocentra/asset-domain` | Use asset type strings or serialization logic from `src/` only |
| **@ocentra/network-domain** | P2P types, WebRTCHandler, P2PManager, useP2PNetworking, router-types | `@ocentra/network-domain/types`, `@ocentra/network-domain/router-types` | Duplicate P2P or router types in app |
| **@ocentra/solana-domain** | MerkleBatching, ErrorHandler, CircuitBreaker, RateLimiter, MemoAnchor, TransactionHandler | `@ocentra/solana-domain/MerkleBatching`, `@ocentra/solana-domain/ErrorHandler`, etc. | Use `@services/solana/*` for moved modules |
| **@ocentra/api-domain** | HTTP client, playerHub, social, multiplayer, competition, CloudService/CloudServiceImpl | `@ocentra/api-domain/createApiClient`, `@ocentra/api-domain/playerHub`, `@ocentra/api-domain/cloud/CloudService` | Use `@/services/cloudflare/*` or `@/services/cloud/*` for moved modules |

**Rules when coding:**
- **Before adding a constant:** Check if a domain package already defines it (boundary, endpoint, ai, etc.). If yes, import from there.
- **Before using a string for API path, bucket, collection, or header:** Use the corresponding domain constant. No raw literals for cross-runtime boundaries.
- **When editing app, infra, or scripts:** Prefer domain imports over `@/constants` for paths, buckets, collections, HTTP, and AI/config that multiple runtimes share.
- **When uncertain:** Prefer importing from a domain package; only add to `src/constants` when the value is app-only and not shared with worker/Firebase/scripts.

See each package README for scope and usage (e.g. [boundary-domain](packages/boundary-domain/README.md), [endpoint-domain](packages/endpoint-domain/README.md)).

---

## Essential Resources

| Resource | Purpose | When to Use |
|----------|---------|-------------|
| [`.cursor/rules/ocentra-games-rules.mdc`](.cursor/rules/ocentra-games-rules.mdc) | **Main coding rules** - imports, constants, comments, logging | Always |
| [`.cursor/rules/ocentra-test-rules.mdc`](.cursor/rules/ocentra-test-rules.mdc) | Testing standards & requirements | Writing tests |
| [`.cursor/rules/ocentra-security-rules.mdc`](.cursor/rules/ocentra-security-rules.mdc) | Security guarantees & rules | Security-related code |
| [`.cursor/rules/ocentra-mutation-rules.mdc`](.cursor/rules/ocentra-mutation-rules.mdc) | State mutation patterns | State management |
| [`.cursor/rules/ocentra-endpoints-single-source.mdc`](.cursor/rules/ocentra-endpoints-single-source.mdc) | Endpoint single-source rule for app, scripts, card-games, and infra | Any endpoint/path work outside endpoint-domain |
| [`.cursor/rules/`](.cursor/rules/) | All rules | See index below |
| [`docs/ocentra/`](docs/ocentra/) | Full documentation hub | Deep dives |
| [`docs/ocentra/asset-handling.md`](docs/ocentra/asset-handling.md) | Asset delivery (`download-url`), dev/prod, main app vs editor, Tauri/mobile | Changing asset load paths or Worker contracts |
| [`docs/ocentra/plans/platform-aware-logging-plan.md`](docs/ocentra/plans/platform-aware-logging-plan.md) | Platform-aware logging transport and retention plan | Logging architecture or local log-query work |

---

## Quick Rules Summary

### Imports
- Use `@/` aliases only (no `../`)
- Import from specific files (no barrel imports)
- Constants from `@/constants/*`

### Constants
- Never use string literals for boundaries — use **domain packages** first (boundary-domain, endpoint-domain, ai-domain, etc.), then `@/constants` for app-only values
- No raw API paths, bucket names, collection names, or HTTP tokens — use endpoint-domain / boundary-domain
- Use `as const` pattern; schema versions: `AssetSchemaVersion.V1` not `1`

### Code Style
- Zero comments (self-documenting code)
- No `console.log` - use `@/lib/logging`

### Responsive Layout
- Avoid `px` for layout (width, height, padding, margin, gap). Use tokens (`var(--space-*)`, `var(--control-h-*)`, `var(--radius-*)`), `rem`, `clamp()`, `dvh`. Keep `px` for borders, shadows, hairline details. See [responsive-scaling-plan.md](docs/ocentra/plans/responsive-scaling-plan.md).

### Route SEO
- Route SEO now has a shared audit package at `packages/seo-domain`; use it instead of ad-hoc crawlers when checking metadata, sitemap, robots, canonicals, raw HTML fallback bodies, or internal-link coverage.
- `npm run generate:catalog-seo` refreshes `src/seo/generated/catalogSeoData.ts` from `packages/asset-editor/Resources/catalog/*`; the main `npm run build` path already runs this before Vite.
- After route/head SEO changes, prefer `npm run seo:audit` against a local app server (defaults to `http://127.0.0.1:3000`; override with `-- --base=http://127.0.0.1:4174` or `SEO_AUDIT_BASE_URL`) so served HTML, sitemap, robots, and fallback text are checked together.

### Dev: shared backend and separate Tauri apps
- **Shared dev backend:** One Cloudflare worker (port 8787); main app or editor can start it; the other reuses it. Same for Turbo (skip if recently run).
- **Two Tauri apps:** Main app binary **ocentraplatform** (platforms/desktop/tauri), editor **ocentraeditor** (packages/asset-editor/src-tauri). They do not depend on each other; each is built and run from its own directory with its own `CARGO_TARGET_DIR`.
- **Asset editor Tauri launchers:** `npm --prefix packages/asset-editor run dev:tauri` is the direct launcher backed by `scripts/dev/dev-editor-tauri.ts`; it kills stale `ocentraeditor` processes and uses `packages/asset-editor/src-tauri/target-editor` as its dedicated Cargo target dir. `npm run dev:editor:tauri` is the simpler root shortcut that currently runs plain `cargo tauri dev` from `packages/asset-editor`.
- **Interactive editor launcher:** `npm --prefix packages/asset-editor run dev` uses `scripts/dev/dev-editor-interactive.ts` when you need preset/local-vs-production backend selection, optional `.temp/dev-editor-output.log`, or `--force` Vite cache clearing before launch.
- **Mobile stack launcher:** `npm run dev:android:stack` / `npm run dev:ios:stack` uses `scripts/dev/dev-mobile-full.ts` to ensure shared dev prep, start or reuse the local Cloudflare worker, and point mobile asset/storage URLs at the local worker. For Android emulator runs, the worker is exposed as `http://10.0.2.2:8787`.

### Domain Build Standard (No .js in Source)
- **Never** add `.js` to relative or path-alias imports in domain source (e.g. `from './foo'` not `from './foo.js'`)
- All domains that emit ESM use the shared `scripts/fix-esm-imports.mjs` post-build to add `.js` in emitted files
- Build pattern: `tsc && tsc-alias && node ../../scripts/fix-esm-imports.mjs` (or `tsc && node ../../scripts/fix-esm-imports.mjs` if no path aliases)

### Testing
- See [`.cursor/rules/ocentra-test-rules.mdc`](.cursor/rules/ocentra-test-rules.mdc)
- All code must have tests where applicable

### Card-game Layout / Local Pilot
- For layout authoring, prefer the standalone design-studio / preview-canvas flow; saving a layout there already does the local save plus targeted R2 sync for that asset.
- The local pilot runtime is currently ready for **Claim** only; treat other card-game local-pilot paths as not ready unless the asset/runtime explicitly says otherwise.
- When debugging the local Claim play route, run the exact screen test first: `cmd /c npm exec -- vitest run src\ui\pages\games\CardGamePlay\GameScreenPage.test.tsx`, then rerun broader validation only after that warning/failure is clean.
- After changing shared layout types in `packages/game-ui-types`, rebuild shared deps first (`npm run dev:prep:editor` or `npm run dev:prep:main`) before trusting downstream type-check failures.

### Page Layout Assets
- Site page-shell/layout work is now asset-backed with `PageLayout` assets under `packages/asset-editor/Resources/Pages/*`.
- In the asset editor, use the dedicated `Pages` resource tab for this workflow; it filters to the `Pages` root and `PageLayout` assets instead of the full resource tree.
- For homepage/page-layout tuning, prefer the standalone page/homepage layout control panels and save from there so the editor does the local write plus targeted R2 sync.
- Lobby page tuning now uses `packages/asset-editor/Resources/Pages/LobbyPageLayout.asset`; open the standalone lobby layout controls from the editor and use Save there so the editor writes the updated `lobbyControls` and performs the targeted R2 sync for that asset.
- Selected-game page tuning now uses `packages/asset-editor/Resources/Pages/SelectedGameLayout.asset`; adjust its standalone selected-game layout controls (`layoutControls` / `contentPlan`) there, then use Save + Sync for the local write plus targeted R2 sync flow.

### Shared Main-App Page Surfaces
- Main-app home/showcase and app-page body surfaces are now shared out of `packages/core-ui` (`AppPages/*`, `Common/HomePage/*`, `Common/SelectedGameShowcase/*`).
- When changing homepage, selected-game, lobby, matchmaking, shop, social, player-hub, settings, competition, or admin page bodies, prefer editing the shared `@ocentra/core-ui` surface first instead of rebuilding page-local markup.

---

## MCP Tools Available

| Tool | Use When |
|------|----------|
| `Solana Expert` | Solana how-to, concepts, errors |
| `Solana Documentation Search` | Search Solana docs |
| `Anchor Framework Expert` | Anchor SDK questions |
| `get_errors` | Debugging errors (last 24h) |
| `get_recent_logs` | General debugging |
| `get_logs_by_source` | Filter by source (e.g., "Auth") |
| `get_logs_by_context` | Filter by module/context |
| `query_logs` | Flexible log queries |

See [`.cursor/rules/ocentra-games-rules.mdc`](.cursor/rules/ocentra-games-rules.mdc) §MCP_USE_GUIDELINE for details.

---

## Project Structure

```
packages/       # Domain packages — USE THESE for shared boundaries
  boundary-domain/   # Bucket names, path prefixes, Firestore collections
  endpoint-domain/  # API paths, HTTP, route keys
  logging-domain/   # Logging API
  ai-domain/        # AI providers, models, prompts
  seo-domain/       # SEO audit helpers and HTML/metadata validation
  storage-domain/   # Cache/IndexedDB config
  asset-domain/     # Asset types, resource entry
  network-domain/   # P2P types, WebRTCHandler, P2PManager, useP2PNetworking, router-types

src/
  lib/          # Core libraries (eventing, serialization, logging)
  engine/       # Game engine
  gameMode/     # Game mode system
  ai/           # AI system
  services/     # External services (solana, storage, assets)
  ui/           # React UI
  adapters/     # App adapters (image, assets, network, storage, firebase, solana, tokens, stripe, dev)
  services/     # Config, orchestration, verification only (StorageConfig, verification/, monitoring/, core/)
  constants/    # App-only constants (NOT for paths/buckets/API — use domains)

.cursor/rules/  # ← All coding rules live here
docs/ocentra/   # ← Full documentation
```

---

## .cursor/rules/ Index

| File | Purpose |
|------|---------|
| `ocentra-games-rules.mdc` | Main rules: imports, constants, logging, MCP |
| `ocentra-test-rules.mdc` | Testing constitution |
| `ocentra-security-rules.mdc` | Security guarantees |
| `ocentra-security-guidelines.mdc` | Security tooling & CI |
| `ocentra-mutation-rules.mdc` | State mutation patterns |
| `ocentra-endpoint-domain-rules.mdc` | Endpoint-domain: branded types, no raw strings (when editing `packages/endpoint-domain/**`) |
| `ocentra-endpoints-single-source.mdc` | Endpoints only in endpoint-domain; app/scripts/infra consume exported constants |
| `ocentra-cloudflare-logging.mdc` | **infra/cloudflare**: Logger + logInfo/logWarn/logError/logDebug in all new handlers, DOs, tests |
| `ocentra-cloudflare-workers-io.mdc` | **infra/cloudflare**: Consume fetch response at call site (whoever sends must consume; Workers request-scoped I/O) |
| `ocentra-durable-objects-rules.md` | Durable Objects patterns |
| `ocentra-rules-compliance-subagent.mdc` | **Subagent:** Rules vs Cloudflare compliance check (invoke or when editing infra/cloudflare) |
| `ocentra-build-flags-guide.mdc` | Build flags, conditional compilation, domain stripping (Vite + TypeScript) |
| `ocentra-log-redaction-guide.mdc` | Mandatory log redaction — scrub secrets before console/files/CI (Firebase, Stripe, Solana) |
| `parallel-processing-patterns.md` | Parallel processing |

### Rules Compliance Subagent (invocation)

When you want a **compliance report** (rules vs `infra/cloudflare` code and tests), say: *"check rules"*, *"run compliance"*, *"audit Cloudflare tests"*, *"validate tests against rules"*, or *"do the rules check"*. The agent will act as the Rules Compliance Subagent, use [`.cursor/skills/check-rules-vs-cloudflare-tests/REFERENCE.md`](.cursor/skills/check-rules-vs-cloudflare-tests/REFERENCE.md), and output a Pass/Fail/Gap report. The same subagent applies when editing files under `infra/cloudflare/`.

---

## docs/ocentra/ Index

| Path | Content |
|------|---------|
| [`README.md`](docs/ocentra/README.md) | Hub / index for curated docs in this folder |
| [`asset-handling.md`](docs/ocentra/asset-handling.md) | Asset delivery (`download-url`), dev/prod, main app vs editor, Tauri/mobile |
| [`Lib/`](docs/ocentra/Lib/) | Library docs (eventbus, logging, serialization) |
| [`Architecture/`](docs/ocentra/Architecture/) | System architecture |
| [`GameMode/`](docs/ocentra/Gamemode/) | Game mode system |
| [`GameData/`](docs/ocentra/GameData/) | Asset system |
| [`Multiplayer and Solana/`](docs/ocentra/Multiplayer%20and%20Solana/) | Blockchain integration |
| [`REPO-MINDMAP.md`](docs/ocentra/REPO-MINDMAP.md) | Complete repo overview |
| [`plans/responsive-scaling-plan.md`](docs/ocentra/plans/responsive-scaling-plan.md) | Responsive layout: tokens, rem, clamp, dvh, unit policy, migration phases |
| [`plans/platform-aware-logging-plan.md`](docs/ocentra/plans/platform-aware-logging-plan.md) | Logging transports, retention, and platform-specific runtime behavior |

### Domain Package Docs (read when touching that domain)

| Package | Doc | When to read |
|---------|-----|---------------|
| **boundary-domain** | [packages/boundary-domain/README.md](packages/boundary-domain/README.md) | Bucket names, path prefixes, Firestore collections — what it owns, how it connects |
| **endpoint-domain** | [packages/endpoint-domain/docs/DESIGN-CONVENTIONS.md](packages/endpoint-domain/docs/DESIGN-CONVENTIONS.md) | **MANDATORY** when editing endpoint-domain — branded types, no raw strings |
| **endpoint-domain** | [packages/endpoint-domain/docs/ARCHITECTURE.md](packages/endpoint-domain/docs/ARCHITECTURE.md) | Structure, endpoint inventory |
| **ai-domain** | [packages/ai-domain/README.md](packages/ai-domain/README.md) | AI providers, models, prompts |
| **logging-domain** | [packages/logging-domain/README.md](packages/logging-domain/README.md) | Logger API, usage |

---

## Common Commands

```bash
npm run dev              # Dev server
npm run dev:prep:main    # Prebuild shared workspace deps for main app
npm run dev:prep:editor  # Prebuild shared workspace deps for asset editor
npm run dev:prep:worker  # Prebuild shared workspace deps for Cloudflare worker
npm run dev:compare      # Shared web stack + desktop/mobile compare targets
npm run dev:android:stack # Main app + local worker + Capacitor Android flow
npm run dev:ios:stack   # Main app + local worker + Capacitor iOS flow
npm run dev:editor:stack # Asset editor with shared backend/dev stack
npm run dev:editor:e2e   # Start editor stack for Playwright/editor flows
npm run dev:editor:tauri # Root shortcut: plain cargo tauri dev from packages/asset-editor
npm --prefix packages/asset-editor run dev:tauri # Direct editor Tauri launcher (stale-process cleanup, dedicated target dir)
npm --prefix packages/asset-editor run dev # Interactive asset-editor launcher (backend/output presets, optional log/profile)
npm run dev:seed:assets  # Seed and verify local asset payloads
npm run dev:seed:assets:tee # Seed assets and tee output to .dev-seed-output.log
npm run dev:seed:assets:force # Force re-upload during local asset seeding
npm run generate:catalog-seo # Rebuild generated catalog SEO data from asset-editor catalog resources
npm run seo:audit       # Crawl a local app server and verify SEO metadata, robots, sitemap, canonicals, and fallback bodies
npm run build            # Production build
npm test                 # Unit tests
npm run test:editor      # Asset-editor package tests
npm run test:e2e         # E2E tests
npm run test:e2e:editor:full # Full editor E2E stack (seed local assets, worker on 8787, editor on 5175)
npm run test:editor:prod-smoke # Prod-like asset-editor smoke test
npm run lint             # ESLint + type check
npm run validate:main    # Main-app focused lint + type-check
npm run validate:editor  # Asset-editor focused lint + type-check
npm run logs:main        # Query local main-app logs
npm run logs:main:errors # Query local main-app errors
npm run logs:main:stats  # Query local main-app log stats
npm run logs:android     # Follow filtered Android logcat output
npm run logs:android:dump # Dump filtered Android logcat output once
npm run logs:android:auth # Filter Android logcat to auth/login flow only
npm run logs:vite        # Query local Vite/dev-server logs
npm run logs:vite:errors # Query local Vite/dev-server errors
npm run logs:query       # Flexible local log queries (recent/errors/stats/search)
npm run logs:db:rebuild  # Rebuild local log DuckDB from NDJSON files
npm run generate:icons   # Rebuild Android launcher icons from packages/app-assets/src/images/mobile-icons
```

---

## Card-games data quality (find & fix without bloat)

**Do not** scan or load all `packages/card-games/src/processed-games/*.json` to find issues. That bloats context and the repo.

**Do:**
1. **Query DuckDB** from `packages/card-games`: e.g. `npm run names-audit` → stdout is `{ "rows": [ { "slug", "display_name", "source_file" }, ... ], "total": N }`.
2. **Edit only those files** indicated by the query (e.g. `src/processed-games/<slug>.json` for each affected slug).
3. **Validate touched files first**: `npm run validate:one -- src/processed-games/<slug>.json` for a targeted check, or `npm run validate:list:n20` / `npm run validate:list:strict:n20` to inspect failures in batches without loading the whole catalog.
4. **Re-ingest** so the DB matches: `npm run ingest` (or use data-explorer Re-ingest).

Available queries (from card-games root):

| Command | Purpose |
|--------|--------|
| `npm run db:init` | Create/reset the DuckDB catalog from migrations before first ingest or after a local reset. |
| `npm run db:migrate` | Apply new card-games DB migrations. |
| `npm run names-audit` | Rows where `name`/`alsoKnownAs` contain `(see …)`. Fix: strip that suffix in the listed JSONs, then ingest. |

More queries can be added under `packages/card-games/db/` (same pattern: script runs SQL, prints JSON to stdout). See [packages/card-games/db/README.md](packages/card-games/db/README.md). The temp data-explorer UI lives in `packages/data-explorer`.

---

## Troubleshooting: npm install / npm audit fix

- **`rg.exe` fails with `Access is denied`**: In this Windows shell, switch to PowerShell-native repo discovery instead of retrying `rg`. Use `Get-ChildItem -Recurse -File` for file inventory and `Get-ChildItem -Recurse | Select-String -Pattern '<pattern>'` for text search.

- **`npx.ps1` / `npm.ps1` cannot be loaded because running scripts is disabled**: Invoke through `cmd /c` instead of the PowerShell shim, e.g. `cmd /c npx eslint path\to\file.tsx` or `cmd /c npm run lint`.

- **Validation is noisy or blocked by unrelated tooling**: Prefer targeted checks before repo-wide commands. Typical order in this repo: file-level eslint via `cmd /c npx eslint ...`, package-level validation such as `cmd /c npm --prefix packages/core-ui run lint:exec`, then broader gates like `cmd /c npm run lint`.

- **Shared page-surface work needs a fast validation loop**: For `packages/core-ui` home/showcase or app-page surface edits, start with `cmd /c npm --prefix packages/core-ui run lint:exec`, then `cmd /c npm run validate:main`.

- **Card-game asset work needs validation without dragging the whole repo first**: Start with the package-level tests that match the asset contract you changed, then run the root gate. Current proven path: `cmd /c npm --prefix packages/asset-editor run test -- src/adapters/assets/createGameModeBundle.test.ts`, `cmd /c npm --prefix packages/game-asset-domain run test -- src/game/gameMechanics/MechanicsTranslator.test.ts src/schemas/asset/card-game-mechanics-data.schema.test.ts`, then `cmd /c npm run lint`.

- **`logs:main` / `logs:vite` says the DB is missing or stale**: Rebuild from NDJSON first with `npm run logs:db:rebuild -- --scope main`, `npm run logs:db:rebuild -- --scope vite`, or `npm run logs:db:rebuild -- --scope all`, then retry the query. For ad hoc filtering, use `npm run logs:query -- search "<term>" --scope main --format json`.

- **Android launcher icon updates do not show up**: The icon generator now reads from `packages/app-assets/src/images/mobile-icons`, with the shared logo SVG in `packages/app-assets/src/images/commons/OcentraLogo.svg` as the source for regenerated icon art. After changing those assets, rerun `npm run generate:icons`.

- **`yarn` is not recognized** or **`@stellar/stellar-sdk` command failed**: A transitive dependency (Stellar SDK, via Trezor wallet adapter) runs a lifecycle script that expects Yarn and Unix shell. Use:
  ```bash
  npm install --ignore-scripts
  npm audit fix --ignore-scripts
  ```
  The package ships pre-built code; skipping scripts is safe. Re-run without `--ignore-scripts` only when you need native rebuilds (e.g. after Node upgrade).

- **EBUSY/EPERM on `workerd` or `@cloudflare/workerd-windows-64`**: Another process is locking those files (e.g. `wrangler dev`, IDE, antivirus). Close wrangler and any terminal using it, then retry. If it persists, run the install from an elevated shell or after a reboot.

- **Tauri Google sign-in fails with `client_secret is missing`**: Use a **Desktop app** OAuth client, not a Web client. 1) In Google Cloud Console create OAuth client ID → Desktop app. 2) Add redirect URI `http://127.0.0.1:8765`. 3) Put the downloaded `client_secret_*.json` in `packages/asset-editor`. 4) From `packages/asset-editor`, run `npm run env:from-google-json`. 5) Then run `npm run dev:tauri` there, or from repo root `npm --prefix packages/asset-editor run dev:tauri`.

---

## Need Help?

1. **New path, bucket, collection, or HTTP constant?** → Use the right **domain package** (see [Domain Packages](#domain-packages-mandatory--use-them-dont-bypass)); don’t add to `src/constants` or use raw strings.
2. Check [`.cursor/rules/`](.cursor/rules/) for specific rules (including `ocentra-endpoint-domain-rules.mdc` when editing endpoints).
3. Check [`docs/ocentra/`](docs/ocentra/) for architecture docs.
4. Use MCP tools for debugging (logs, Solana).
5. When uncertain — **STOP and ASK** (per test-rules §AI OVERRIDE CLAUSE).
