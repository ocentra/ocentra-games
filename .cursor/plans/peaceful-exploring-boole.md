# Plan: Extract EventBus + ALL Events → `@ocentra/eventing-domain` + Contracts → `@ocentra/boundary-domain`

---

## Principle: Domain First, Then App

**Order of work:**
1. **Make the new domain good** — eventing-domain is self-contained: correct internal imports, no app deps, proper package.json (deps + exports), builds and tests pass. No wiring to the app yet.
2. **Then wire and clean** — main app imports from `@ocentra/eventing-domain`, eventingInit/serviceKeys updated, then delete moved code from the app.

Do not update app imports or delete app code until the domain package builds and is verified on its own.

**Design:** Eventing-domain is framework-agnostic (no React). React hooks and EventListener are main-app/UI layer and stay in the app — not a gap, not moved to the package.

---

## What & Why

EventBus is a 4,500+ line pub/sub framework with 196 event definitions deeply embedded in the main app (`src/lib/eventing/`). The main app should focus on UI/UX — infrastructure belongs in domain packages.

**What moves:**
- **Core framework** → `@ocentra/eventing-domain` (EventBus, EventRegistrar, OperationResult, OperationDeferred, EventArgsBase, contracts)
- **ALL 196 event definitions** → `@ocentra/eventing-domain/events/` (cut-paste, only import path changes)
- **Lightweight shared types** → `@ocentra/eventing-domain/types/` (pure type files used by events: game-events, auth, lobby, meta — 411 lines total)
- **Runtime contracts** → `@ocentra/boundary-domain` (assertImplements, InterfaceSpec — only 4 consumers, all in eventing)

**What stays in app only (React / main-app layer — not eventing-domain):**
- **React hooks** (useEventBus, useEventListener, useEventRegistrar, EventBusContext, EventBusProvider) — React binding to EventBus; main-app UI concern. Stay in `src/lib/eventing/hooks/`. They import EventBus etc. from `@ocentra/eventing-domain`. Eventing-domain does **not** contain React; it is framework-agnostic.
- **EventListener component** — React component; stays in `src/lib/eventing/components/`. Same reason.
- **Event behaviours** (EventBehaviour, EventBehaviourHost, useEventBehaviour, useEventBehaviourState) — they depend on app’s `react-behaviours` (UI/UX layer). They stay in `src/lib/eventing/behaviours/` and import from `@ocentra/eventing-domain` (EventBus) and `@/lib/eventing/hooks` and `@/lib/react-behaviours`. Eventing-domain does not contain or depend on them.

**What stays in main app:**
- `eventingInit.ts` — app-level service registration
- `serviceKeys.ts` — app-level DI keys
- **hooks/, components/** — see above (React layer)
- Heavy app-level types (`ScriptableObject`, `GameInfo`, `GameMode`, DTOs, inspector) — events reference these via `import type` from the main app

### How Events Handle App-Type Dependencies

196 events analyzed:
- **~90 events** (48%): zero external deps — move cleanly
- **68 events**: import from `@/types/` (GameState, PlayerAction, AuthResult, LobbyOptions, etc.)
  - **Pure type files** (game-events.ts, auth.ts, lobby.ts, meta.ts, game.ts = 258 lines) → move into eventing-domain/types/
  - **Heavy type files** (synthesis.ts depends on GameInfo 374 lines; assets.ts depends on BaseAssetMetadata) → events keep `import type` from main app
- **20 events**: import from `@ocentra/asset-domain` (ResourceEntry, ImageHash — type-only) → eventing-domain adds asset-domain as dependency
- **1 event**: imports from `@ocentra/ai-domain` (ProviderType — type-only) → eventing-domain adds ai-domain as dependency

**For events that `import type` from heavy app files**: These work because `import type` is compile-time only. At build time, eventing-domain's tsconfig will have the main app types available via path aliases or `typeRoots`. At runtime, only the type erasures matter — no circular runtime deps.

---

## Phase 1: Move Contracts → `@ocentra/boundary-domain`

`boundary-domain` already exists (`packages/boundary-domain/`) but only has `src/constants/`. Add contracts.

### Create
| File | Source | Notes |
|------|--------|-------|
| `packages/boundary-domain/src/contracts/Interface.ts` | Copy from `src/lib/contracts/Interface.ts` | 168 lines, zero external deps |
| `packages/boundary-domain/src/contracts/Implements.ts` | Copy from `src/lib/contracts/Implements.ts` | 27 lines, imports Interface.ts |

### Modify
| File | Change |
|------|--------|
| `packages/boundary-domain/package.json` | Add exports: `"./contracts/Interface"`, `"./contracts/Implements"` |

### Delete (after all imports updated)
- `src/lib/contracts/Interface.ts`
- `src/lib/contracts/Implements.ts`
- `src/lib/contracts/README.md`

---

## Phase 2: Create `@ocentra/eventing-domain` Package

**Checkpoint:** Do not proceed to Phase 3 (main app) until eventing-domain builds on its own with zero app imports. Fix all internal imports, add package.json dependencies and exports, remove ServiceRegistry from EventBus, then `cd packages/eventing-domain && npm run build` and run package tests.

### Scaffold
```
packages/eventing-domain/
├── src/
│   ├── core/
│   │   ├── EventBus.ts
│   │   ├── EventRegistrar.ts
│   │   ├── EventArgsBase.ts
│   │   ├── OperationResult.ts
│   │   ├── OperationDeferred.ts
│   │   └── createEventRegistrar.ts
│   ├── interfaces/
│   │   ├── IEventArgs.ts
│   │   ├── IEventBus.ts
│   │   ├── IEventHandler.ts
│   │   ├── IEventRegistrar.ts
│   │   └── IOperationResult.ts
│   ├── contracts/
│   │   └── specs.ts
│   ├── events/
│   │   ├── assets/           (57 events — cut-paste from src/lib/eventing/events/assets/)
│   │   ├── game/             (63 events — cut-paste)
│   │   ├── authentication/   (13 events — cut-paste)
│   │   ├── lobby/            (20+ events — cut-paste)
│   │   ├── model/            (12 events — cut-paste)
│   │   ├── image/            (6 events — cut-paste)
│   │   ├── logs/             (4 events — cut-paste)
│   │   ├── dev/              (1 event — cut-paste)
│   │   ├── PlayerTypes.ts    (cut-paste)
│   │   └── index.ts          (barrel — cut-paste)
│   ├── types/
│   │   ├── game-events.ts    (74 lines — from src/types/game-events.ts)
│   │   ├── auth.ts           (48 lines — from src/types/auth.ts)
│   │   ├── lobby.ts          (39 lines — from src/types/lobby.ts)
│   │   ├── meta.ts           (26 lines — from src/types/meta.ts)
│   │   └── game.ts           (71 lines — from src/types/game.ts)
│   │   (NO react/ — hooks and EventListener stay in app; see "What stays in app only")
│   ├── testing/
│   │   └── createTestEventBus.ts
│   └── utils/
│       ├── timeout.ts
│       └── guid.ts
├── __tests__/
│   └── EventBus.spec.ts
├── package.json
└── tsconfig.json
```

### package.json
```json
{
  "name": "@ocentra/eventing-domain",
  "version": "1.0.0",
  "type": "module",
  "scripts": { "build": "tsc && tsc-alias" },
  "dependencies": {
    "@ocentra/logging-domain": "file:../logging-domain",
    "@ocentra/boundary-domain": "file:../boundary-domain",
    "@ocentra/asset-domain": "file:../asset-domain",
    "@ocentra/ai-domain": "file:../ai-domain"
  },
  "devDependencies": {
    "typescript": "~5.9.3",
    "tsc-alias": "^1.8.16"
  },
  "exports": {
    "./core/EventBus": { ... },
    "./core/EventRegistrar": { ... },
    "./core/EventArgsBase": { ... },
    "./core/OperationResult": { ... },
    "./core/OperationDeferred": { ... },
    "./core/createEventRegistrar": { ... },
    "./interfaces/IEventArgs": { ... },
    "./interfaces/IEventBus": { ... },
    "./interfaces/IEventHandler": { ... },
    "./interfaces/IEventRegistrar": { ... },
    "./interfaces/IOperationResult": { ... },
    "./contracts/specs": { ... },
    "./events/assets": { ... },
    "./events/game": { ... },
    "./events/authentication": { ... },
    "./events/lobby": { ... },
    "./events/model": { ... },
    "./events/image": { ... },
    "./events/logs": { ... },
    "./events/dev": { ... },
    "./events": { ... },
    "./types/game-events": { ... },
    "./types/auth": { ... },
    "./types/lobby": { ... },
    "./types/meta": { ... },
    "./types/game": { ... },
    "./testing/createTestEventBus": { ... }
  }
}
```

### Core files — cut-paste with import fixes only

| Source | Destination | Changes (import paths only) |
|--------|-------------|---------------------------|
| `src/lib/eventing/EventBus.ts` | `src/core/EventBus.ts` | Remove static ServiceRegistry block (12 lines). `@/lib/core/timeout` → `../utils/timeout` |
| `src/lib/eventing/EventRegistrar.ts` | `src/core/EventRegistrar.ts` | `@/lib/contracts/*` → `@ocentra/boundary-domain/contracts/*`. `@lib/eventing/*` → relative |
| `src/lib/eventing/OperationResult.ts` | `src/core/OperationResult.ts` | Same pattern |
| `src/lib/eventing/base/EventArgsBase.ts` | `src/core/EventArgsBase.ts` | `@/lib/core/guid` → `../utils/guid`. Contracts → boundary-domain |
| `src/lib/eventing/internal/deferred.ts` | `src/core/OperationDeferred.ts` | `@/lib/eventing/OperationResult` → `./OperationResult` |
| `src/lib/eventing/createEventRegistrar.ts` | `src/core/createEventRegistrar.ts` | Relative imports |
| `src/lib/eventing/interfaces/*.ts` | `src/interfaces/*.ts` | No changes (pure types) |
| `src/lib/eventing/contracts/specs.ts` | `src/contracts/specs.ts` | Contracts → boundary-domain |
| `src/lib/eventing/hooks/*.ts` | **Stay in app** (React layer — not in package) |
| `src/lib/eventing/components/*.tsx` | **Stay in app** (React layer — not in package) |
| `src/lib/eventing/testing/*.ts` | `src/testing/*.ts` | Relative imports |

### Event files — cut-paste entire directories

| Source | Destination | Changes |
|--------|-------------|---------|
| `src/lib/eventing/events/assets/` | `src/events/assets/` | `@lib/eventing/base/EventArgsBase` → `../../core/EventArgsBase` etc. |
| `src/lib/eventing/events/game/` | `src/events/game/` | Same pattern |
| `src/lib/eventing/events/authentication/` | `src/events/authentication/` | Same |
| `src/lib/eventing/events/lobby/` | `src/events/lobby/` | Same |
| `src/lib/eventing/events/model/` | `src/events/model/` | Same |
| `src/lib/eventing/events/image/` | `src/events/image/` | Same |
| `src/lib/eventing/events/logs/` | `src/events/logs/` | Same |
| `src/lib/eventing/events/dev/` | `src/events/dev/` | Same |
| `src/lib/eventing/events/PlayerTypes.ts` | `src/events/PlayerTypes.ts` | No changes |
| `src/lib/eventing/events/index.ts` | `src/events/index.ts` | Relative imports |

**Import changes in ALL event files (mechanical find-replace):**
```
@lib/eventing/base/EventArgsBase     →  @/core/EventArgsBase          (or relative ../../core/)
@lib/eventing/interfaces/IEventArgs  →  @/interfaces/IEventArgs       (or relative)
@lib/eventing/interfaces/IEventHandler → @/interfaces/IEventHandler
@/lib/eventing/internal/deferred     →  @/core/OperationDeferred
@/lib/eventing/OperationResult       →  @/core/OperationResult
```

**Events referencing app types** — those imports change from `@/types/` to `@/types/` within eventing-domain's tsconfig path aliases, OR to the new `../types/` within the package for the ones we moved.

### Type files — cut-paste (pure types, 258 lines total)
| Source | Destination | Changes |
|--------|-------------|---------|
| `src/types/game-events.ts` | `src/types/game-events.ts` | None (pure types, zero deps) |
| `src/types/auth.ts` | `src/types/auth.ts` | None |
| `src/types/lobby.ts` | `src/types/lobby.ts` | None |
| `src/types/meta.ts` | `src/types/meta.ts` | None |
| `src/types/game.ts` | `src/types/game.ts` | May need `@/constants/game` resolved |

### Utility files — copy (tiny, zero deps)
| Source | Destination | Changes |
|--------|-------------|---------|
| `src/lib/core/timeout.ts` (23 lines) | `src/utils/timeout.ts` | None |
| `src/lib/core/guid.ts` (createGuid only, 16 lines) | `src/utils/guid.ts` | Remove `createAssetGuid` + asset-domain import |

### Events with heavy app-type deps — tsconfig resolution

~15 events import types from heavy app files (ScriptableObject, GameInfo, DTOs, inspector, GameMode, synthesis). These use `import type` which is compile-time only. Solution:

**Option A (recommended)**: In `eventing-domain/tsconfig.json`, add path alias for the main app types:
```json
"paths": {
  "@/*": ["./*"],
  "@app/*": ["../../src/*"]
}
```
Events reference `@app/types/synthesis`, `@app/lib/serialization/ScriptableObject`, etc. These resolve at compile time only.

**Option B**: Keep those imports as-is (`@/types/...`) and configure tsconfig `references` to the main app. Works with bundler moduleResolution.

---

## Phase 3: Update Main App — All Consumers

After events move, every file in the main app that imports events or framework classes needs updating:

### Event imports (~100+ files across src/)
```typescript
// BEFORE
import { SaveLogsEvent } from '@/lib/eventing/events/logs/SaveLogsEvent';
import { GetResourceEvent } from '@/lib/eventing/events/assets/GetResourceEvent';
// AFTER
import { SaveLogsEvent } from '@ocentra/eventing-domain/events/logs';
import { GetResourceEvent } from '@ocentra/eventing-domain/events/assets';
// OR individual imports:
import { SaveLogsEvent } from '@ocentra/eventing-domain/events/logs/SaveLogsEvent';
```

### EventBus direct imports (~30 files)
```typescript
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
```

### EventRegistrar imports (~15 files)
```typescript
import { EventRegistrar } from '@ocentra/eventing-domain/core/EventRegistrar';
```

### Hook and component imports (~20 files) — stay in app
Keep importing from app paths (React layer is not in eventing-domain):
```typescript
import { useEventListener } from '@/lib/eventing/hooks/useEventListener';
import { EventListener } from '@/lib/eventing/components/EventListener';
```

**Event behaviours** stay in app: keep importing from `@/lib/eventing/behaviours` (they use `@ocentra/eventing-domain` + `@/lib/eventing/hooks` + `@/lib/react-behaviours`). No behaviour imports from the package.

### OperationDeferred/Result imports (~25 files)
```typescript
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred';
import { OperationResult } from '@ocentra/eventing-domain/core/OperationResult';
```

### Type imports — update main app to use eventing-domain types
```typescript
// BEFORE
import type { PlayerProfile } from '@/types/auth';
// AFTER
import type { PlayerProfile } from '@ocentra/eventing-domain/types/auth';
```

(Only for the types that moved. Heavy types like synthesis.ts stay in main app.)

---

## Phase 4: Update `eventingInit.ts` & `serviceKeys.ts`

These stay in main app:

**`src/lib/eventing/serviceKeys.ts`** — update imports:
```typescript
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import type { IEventBus } from '@ocentra/eventing-domain/interfaces/IEventBus';
```

**`src/lib/eventing/eventingInit.ts`** — unchanged (imports from local serviceKeys.ts)

---

## Phase 5: Root Config Updates

### `package.json` (root)
```json
"dependencies": {
  "@ocentra/eventing-domain": "file:./packages/eventing-domain"
}
```

### `build:domains` script
Build order: boundary-domain → logging-domain → eventing-domain → others

---

## Phase 6: Delete Moved Files from Main App

### Delete entire `src/lib/eventing/` except:
- Keep: `eventingInit.ts`, `serviceKeys.ts`, `behaviours/` (event behaviours — app-only), `hooks/` (React hooks — app-only), `components/` (EventListener — app-only)
- Delete: core, interfaces, contracts, testing, events, base, internal, __tests__

### Delete from `src/lib/contracts/`
- `Interface.ts`, `Implements.ts`, `README.md`

### Delete moved type files from `src/types/`
- `game-events.ts`, `auth.ts`, `lobby.ts`, `meta.ts`, `game.ts`
- (Keep heavy types: synthesis.ts, assets.ts, etc.)

---

## Phase 7: Build & Verify

```bash
cd packages/boundary-domain && npm run build
cd ../eventing-domain && npm run build
cd ../.. && npm run build
npm run dev
```

### Verify
1. `npm run build` — no TypeScript errors
2. `npm run dev` — app starts, events fire
3. Asset editor — GetResourceEvent, UploadAssetEvent work
4. Game flow — game events fire
5. Image loading — ImageLoadRequestEvent works
6. Logs — SaveLogsEvent, QueryLogsEvent work

### Import verification
```bash
# Should find ZERO:
grep -r "from.*@/lib/eventing/" src/ --include="*.ts" --include="*.tsx"
grep -r "from.*@/lib/contracts" src/ --include="*.ts" --include="*.tsx"
grep -r "from.*@lib/eventing/" src/ --include="*.ts" --include="*.tsx"

# Should find many:
grep -r "from.*@ocentra/eventing-domain" src/ --include="*.ts" --include="*.tsx"
```

---

## Summary

| What | From | To |
|------|------|----|
| Contracts | `src/lib/contracts/` | `@ocentra/boundary-domain/contracts/` |
| EventBus core (6 files) | `src/lib/eventing/` core | `@ocentra/eventing-domain/core/` |
| Interfaces (5 files) | `src/lib/eventing/interfaces/` | `@ocentra/eventing-domain/interfaces/` |
| Contract specs | `src/lib/eventing/contracts/` | `@ocentra/eventing-domain/contracts/` |
| **ALL 196 events** | `src/lib/eventing/events/` | `@ocentra/eventing-domain/events/` |
| Shared types (5 files, 258 lines) | `src/types/` | `@ocentra/eventing-domain/types/` |
| React hooks (5 files) | `src/lib/eventing/hooks/` | **Stay in app** (React layer — not eventing-domain) |
| Components (1 file) | `src/lib/eventing/components/` | **Stay in app** (React layer — not eventing-domain) |
| Event behaviours (4 files) | `src/lib/eventing/behaviours/` | **Stay in app** (depend on package + react-behaviours) |
| Testing (1 file) | `src/lib/eventing/testing/` | `@ocentra/eventing-domain/testing/` |
| eventingInit + serviceKeys | `src/lib/eventing/` | **Stay in main app** |

**Approach**: Cut-paste all files. Only change is import paths (mechanical find-replace). Only code change: remove 12-line ServiceRegistry block from EventBus.ts.
**Dependencies**: logging-domain, boundary-domain, asset-domain (type-only), ai-domain (type-only)
