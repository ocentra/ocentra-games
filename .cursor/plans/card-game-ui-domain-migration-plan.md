# `E:\ocentra-games\.cursor\plans\card-game-ui-domain-migration-plan.md`

## Summary

### Problem statement
The card-game UI authoring system is split across the wrong places.

Today:
- The richest editor-like experience lives in the main app dev route `/games/cardgame/template`.
- The asset editor only has a narrower `CardGameLayoutPreview`.
- Shared layout/runtime logic is still owned by main-app files under `src/ui/layout/**`.
- Persisted `CardGameLayout` assets do not yet match the full editor surface already present in the template shell.
- This makes the main app behave like an editor when it should mostly be a consumer.

### Target
Move to one clear model:

- The asset editor is the only real authoring surface.
- The main app keeps `/games/cardgame/template` as a dev-only preview harness, not as a second editor.
- Shared contracts live in `@ocentra/game-ui-types`.
- Shared runtime/layout logic lives in a new `@ocentra/game-layout-domain`.
- Shared React surfaces live in a new `@ocentra/card-game-ui`.
- `CardGameLayout` assets become the persisted source of truth for the full card-game UI document.

## Where we are

### Main app
Primary files:
- [src/ui/components/GameScreen/CardGameScreen/GameScreen.tsx](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/GameScreen.tsx)
- [src/ui/components/GameScreen/CardGameScreen/HudButtonEditorModal.tsx](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/HudButtonEditorModal.tsx)
- [src/ui/layout/loadGameUiPreset.ts](/E:/ocentra-games/src/ui/layout/loadGameUiPreset.ts)
- [src/ui/layout/tableLayoutStore.ts](/E:/ocentra-games/src/ui/layout/tableLayoutStore.ts)
- [src/ui/layout/tableLayoutTypes.ts](/E:/ocentra-games/src/ui/layout/tableLayoutTypes.ts)
- [src/ui/layout/gameUiTypes.ts](/E:/ocentra-games/src/ui/layout/gameUiTypes.ts)
- [src/ui/routes/PlatformAwareRoutes.tsx](/E:/ocentra-games/src/ui/routes/PlatformAwareRoutes.tsx)

How it works now:
- `/games/cardgame/template` is already dev-only.
- That route mounts the current editor-like template shell.
- `GameScreen.tsx` owns live editing state for table, seats, player UI, HUD, buttons, card fan, and card visuals.
- The app-side store is used for both rendering and authoring behavior.

### Asset editor
Primary files:
- [packages/asset-editor/src/pages/PreviewPanel/CardGameLayoutPreview.tsx](/E:/ocentra-games/packages/asset-editor/src/pages/PreviewPanel/CardGameLayoutPreview.tsx)
- [packages/asset-editor/src/adapters/layout/LayoutAssetService.ts](/E:/ocentra-games/packages/asset-editor/src/adapters/layout/LayoutAssetService.ts)
- [packages/asset-editor/src/pages/StandalonePanelPage.tsx](/E:/ocentra-games/packages/asset-editor/src/pages/StandalonePanelPage.tsx)
- [packages/asset-editor/src/utils/createPanelWindow.ts](/E:/ocentra-games/packages/asset-editor/src/utils/createPanelWindow.ts)
- [packages/asset-editor/src/pages/MainPage/EditorDockLayout.tsx](/E:/ocentra-games/packages/asset-editor/src/pages/MainPage/EditorDockLayout.tsx)

How it works now:
- The asset editor already supports true separate windows.
- In Tauri it opens standalone OS windows through `WebviewWindow`.
- In web dev it falls back to `window.open(...)`.
- It already has a standalone host driven by query params.
- It already uses `BroadcastChannel` for cross-window selection sync.
- The layout preview is partial and does not yet replace the main-app template editor.

### Shared packages
Current anchors:
- [packages/game-ui-types/src/tableLayoutTypes.ts](/E:/ocentra-games/packages/game-ui-types/src/tableLayoutTypes.ts)
- [packages/game-asset-domain/src/ui/layout/CardGameLayout.ts](/E:/ocentra-games/packages/game-asset-domain/src/ui/layout/CardGameLayout.ts)

Persisted asset example:
- [packages/asset-editor/Resources/GameMode/CardGames/Games/Claim/claimLayout.asset](/E:/ocentra-games/packages/asset-editor/Resources/GameMode/CardGames/Games/Claim/claimLayout.asset)

## Where we want to be

### Package boundaries
Keep and expand:
- `@ocentra/game-ui-types`
  - type-only package
  - owns all serializable card-game UI/layout contracts

Create:
- `@ocentra/game-layout-domain`
  - shared runtime/layout logic
  - defaults
  - hydration
  - preset normalization
  - seat generation and adjustment
  - no React

Create:
- `@ocentra/card-game-ui`
  - shared React package
  - owns the card-game consumer surface
  - owns the shared design-studio/editor workbench UI
  - prop-driven only

Keep and expand:
- `@ocentra/game-asset-domain`
  - owns `CardGameLayout`
  - owns the persisted asset schema for the full card-game UI document

### UX ownership
Locked decisions:
- The asset editor is the only authoring surface.
- `/games/cardgame/template` stays, but only as a dev preview harness.
- The main app route must not remain a full second editor.
- Selecting a `CardGameLayout` asset in the asset editor exposes `Open Design Studio`.
- `Open Design Studio` launches a full-screen standalone editor window.
- The design studio can open a separate clean preview window with no editor chrome.
- The main app dev route can load and preview different saved layout/UI assets for consumer verification.

### Preview model
There are 3 preview/use surfaces:

1. Asset Editor Main Window
- resource tree
- inspector
- normal preview
- `Open Design Studio` action for `CardGameLayout`

2. Design Studio Window
- full-screen or large standalone editor window
- shared editor workbench UI
- floating controls/tabs like the current template editor
- edits one `CardGameLayout` draft
- can open or focus a clean preview window

3. Main App Dev Preview Harness
- `/games/cardgame/template`
- consumer-only rendering
- no full editing controls
- can load a chosen saved layout asset for smoke-testing the real app consumer path

Optional additional preview:
- Clean Preview Window from the design studio for live unsaved draft preview with no editor UI

## Key changes

### 1. Shared contracts in `@ocentra/game-ui-types`
Add a new export path such as `@ocentra/game-ui-types/cardGameLayoutTypes`.

Move serializable contracts there:
- `LayoutPreset`
- `CardGameLayoutDocument`
- `PlayerUiDefaults`
- `HudArtworkControls`
- `HudButtonControls`
- `HudButtonVariantControls`
- `CardFanControls`
- `CardVisualControls`
- related document subtypes currently trapped in React files

Keep `tableLayoutTypes` for:
- `SeatLayout`
- `SeatPosition`
- `TableShapeSettings`
- serializable player override keys

### 2. Shared runtime in `@ocentra/game-layout-domain`
Create `packages/game-layout-domain`.

Move pure logic there from current app/editor files:
- document defaults
- preset hydration
- normalization
- seat-ring generation
- table-to-seat adjustment
- document clone/sanitize helpers
- backward-compat support for older assets

Source material:
- `src/ui/layout/loadGameUiPreset.ts`
- `src/ui/layout/tableLayoutStore.ts`
- `packages/asset-editor/src/pages/PreviewPanel/CardGameLayoutPreview.tsx`

### 3. Shared React surface in `@ocentra/card-game-ui`
Create `packages/card-game-ui`.

Export:
- `CardGamePreviewSurface`
- `CardGameDesignStudioWorkbench`

Do not own:
- save/load APIs
- route orchestration
- asset-editor window management

### 4. Expand `CardGameLayout` asset schema
Update `CardGameLayout` so the full current template surface is persisted.

Canonical persisted shape should include:
- `defaultPlayerCount`
- `presets`
- `playerUiDefaults`
- `hud`
- `cardFan`
- `cardVisuals`
- `views`
- `gameplay`
- `extensions`

Do not persist:
- editor window layout
- guide/debug visibility
- transient undo/copy/reset state
- authoring-only layer visibility toggles

### 5. Asset-editor design studio
Extend the current standalone-mode system.

Add standalone modes:
- `standalone=design-studio`
- `standalone=preview-canvas`

Behavior:
- `Open Design Studio` from a `CardGameLayout` asset opens the full-screen workbench.
- The workbench uses `@ocentra/card-game-ui`.
- Save goes through asset-editor services only.
- The design studio can open a clean preview window.
- Cross-window live preview sync uses same-origin app messaging such as `BroadcastChannel`.

### 6. Main-app dev preview harness
Keep `/games/cardgame/template`, but downgrade it from editor to preview harness.

Behavior:
- It renders the shared consumer surface only.
- It loads saved assets, not live unsaved editor drafts.
- It supports previewing different saved layout/UI assets.
- Asset selection is done through a small dev-only harness control or query-driven loader, not by keeping the full workbench in the app.

Locked implementation direction:
- Primary selector inputs should be `gameId` and optional explicit layout override such as `layoutGuid`.
- The harness may expose a small dev-only load panel, but not the full editor UI.
- Asset editor may open this route in browser or app for saved-asset consumer verification.

### 7. Main app runtime rewire
Outside the dev harness, main app should:
- load persisted card-game layout data
- hydrate it through `@ocentra/game-layout-domain`
- render via `@ocentra/card-game-ui`
- stop owning authoring-only behavior

## Checklist

### New packages
- [ ] Create `packages/game-layout-domain`
- [ ] Create `packages/card-game-ui`
- [ ] Wire workspace dependencies and build order

### Shared contracts
- [ ] Move serializable card-game document contracts into `game-ui-types`
- [ ] Remove app-local ownership of serializable UI config types
- [ ] Keep `game-ui-types` type-only

### Shared runtime
- [ ] Move normalization/default/hydration helpers into `game-layout-domain`
- [ ] Add backward-compat support for older layout assets
- [ ] Add unit tests for pure layout logic

### Shared React package
- [ ] Move reusable consumer/editor React surfaces into `card-game-ui`
- [ ] Export separate workbench and preview surfaces
- [ ] Keep all components prop-driven

### Asset schema
- [ ] Expand `CardGameLayout`
- [ ] Update validation and serialization
- [ ] Preserve compatibility with older assets

### Asset editor
- [ ] Add `Open Design Studio` action for `CardGameLayout`
- [ ] Add `design-studio` standalone mode
- [ ] Add `preview-canvas` standalone mode
- [ ] Implement live draft sync between studio and clean preview
- [ ] Replace reduced `CardGameLayoutPreview` authoring path with the shared workbench

### Main app
- [ ] Rewire runtime rendering to shared packages
- [ ] Keep `/games/cardgame/template` as dev-only preview harness
- [ ] Remove full authoring behavior from that route
- [ ] Add lightweight asset-loading controls for saved-asset preview
- [ ] Keep the route useful for fast consumer-path testing

### Cleanup
- [ ] Delete or reduce `src/ui/layout/tableLayoutTypes.ts`
- [ ] Delete or reduce `src/ui/layout/gameUiTypes.ts`
- [ ] Delete or reduce `src/ui/layout/loadGameUiPreset.ts`
- [ ] Delete or reduce `src/ui/layout/tableLayoutStore.ts`
- [ ] Remove obsolete app-local editor components once shared package adoption is complete
- [ ] Update package and architecture docs

## Test plan

- [ ] `game-ui-types` compiles with no runtime imports
- [ ] `game-layout-domain` tests cover defaults, hydration, preset resolution, seat generation, and seat adjustment
- [ ] `game-asset-domain` tests cover expanded `CardGameLayout` serialization and backward compatibility
- [ ] Asset editor tests cover:
  - opening design studio from a layout asset
  - opening clean preview
  - live draft sync between studio and preview
  - saving and reloading the same asset
- [ ] Main app tests cover:
  - runtime consumer rendering from saved assets
  - `/games/cardgame/template` staying dev-only
  - harness loading different saved assets without editor UI
- [ ] Older layout assets still load with hydrated defaults
- [ ] `npx tsc -b --force --pretty false` passes at each checkpoint

## Assumptions and locked decisions

- `@ocentra/game-ui-types` remains type-only
- New shared runtime package is `@ocentra/game-layout-domain`
- New shared React package is `@ocentra/card-game-ui`
- Migration covers the full current template surface
- Asset editor is the only authoring surface
- `/games/cardgame/template` remains, but only as a dev preview harness
- The main app route is not a second full editor
- `Open Design Studio` is an explicit action from a selected `CardGameLayout` asset
- The asset editor uses its existing standalone-window pattern for the studio and clean preview
- Cross-window live sync uses same-origin app messaging such as `BroadcastChannel`
- The main app dev harness previews saved assets, not unsaved cross-app drafts
