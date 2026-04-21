# Card Game Layout Unification Plan

## Summary
The current layout system is split across three host surfaces and two state models. The immediate goal is to make the `CardGameLayout` asset the single source of truth, make all preview surfaces render from the same document-driven pipeline, remove host-specific fit bugs, and then add explicit seat/player-UI authoring on top of that stable base.

## Problem Statements
- The same layout document is rendered through different host shells, so the editor preview, `Open Canvas`, and `/games/cardgame/template` do not fit or crop the same way.
- Table and seats are driven by `tableLayoutStore`, while HUD/card-fan/card visuals are driven directly from the `document` prop. This split state model is the core inconsistency.
- `Open Canvas` looks closer to correct because it renders the full responsive page, while the editor preview and main-app harness go through a fixed-canvas scaler that leaves dead space on the right or bottom.
- Seat positions are persisted in the asset, but the editor does not really author them yet. It mainly edits player count and some table fields.
- Player UI defaults and per-seat overrides are only partially exposed. The persisted override model is much smaller than the visible `PlayerUI` config surface.
- The main-app template harness is not reliably wired to the same live-draft pipeline as the asset editor. It uses a different broadcast-channel constant and a wrong asset hydration shape.
- The main-app template harness is still half ghost-preview, half real consumer, instead of being a clear dev-only consumer path.
- The actual game runtime loads saved layout presets, but the editor/template preview path is not guaranteed to match that consumer path.

## Current State And Control Map
- **Persisted contract**: [`tableLayoutTypes.ts`](/E:/ocentra-games/packages/game-ui-types/src/tableLayoutTypes.ts) defines `SeatLayout`, `SeatPosition`, `TableShapeSettings`; [`cardGameLayoutTypes.ts`](/E:/ocentra-games/packages/game-ui-types/src/cardGameLayoutTypes.ts) defines `CardGameLayoutDocument`, `LayoutPreset`, `PlayerUiDefaults`, `hud`, `cardFan`, and `cardVisuals`.
- **Runtime normalization and defaults**: [`cardGameLayoutRuntime.ts`](/E:/ocentra-games/packages/game-layout-domain/src/cardGameLayoutRuntime.ts) owns defaults, preset generation, layout hydration, seat-ring generation, preset resolution, and seat adjustment when table geometry changes.
- **Shared runtime store**: [`tableLayoutStore.ts`](/E:/ocentra-games/packages/game-layout-domain/src/tableLayoutStore.ts) owns `playerCount`, `table`, `seats`, `selectedSeatId`, `asset`, and editor visibility. `CenterTableSvg` and `PlayersOnTable` only read this store.
- **Shared stage consumers**: [`CenterTableSvg.tsx`](/E:/ocentra-games/packages/card-game-ui/src/scene/CenterTableSvg.tsx) reads table shape from the store; [`PlayersOnTable.tsx`](/E:/ocentra-games/packages/card-game-ui/src/scene/PlayersOnTable.tsx) reads seats and selected seat from the store; [`GameHUD.tsx`](/E:/ocentra-games/packages/card-game-ui/src/scene/GameHUD.tsx) and [`CardInHand.tsx`](/E:/ocentra-games/packages/card-game-ui/src/scene/CardInHand.tsx) are driven by props; [`PlayerUI.tsx`](/E:/ocentra-games/packages/card-game-ui/src/scene/PlayerUI.tsx) applies `playerUiDefaults` plus `seat.playerOverrides`.
- **Correct document-to-store bridge already exists**: [`CardGamePreviewSurface.tsx`](/E:/ocentra-games/packages/card-game-ui/src/CardGamePreviewSurface.tsx) creates a preview asset from the document, calls `setGameAsset(...)`, then applies the preset for the chosen player count. This is the cleanest existing consumer path.
- **Problematic shell path**: [`CardGameTemplatePage.tsx`](/E:/ocentra-games/packages/card-game-ui/src/CardGameTemplatePage.tsx) composes the stage directly, but it does not seed the store from `document`. As a result, table/seats can drift from HUD/card-fan.
- **Problematic fit wrapper**: [`CardGameTemplateViewport.tsx`](/E:/ocentra-games/packages/card-game-ui/src/CardGameTemplateViewport.tsx) and [`CardGameTemplateViewport.css`](/E:/ocentra-games/packages/card-game-ui/src/CardGameTemplateViewport.css) scale a fixed `1920x1080` canvas from the top-left, which causes dead-space gutters in hosts whose aspect ratio does not match.
- **Asset-editor authoring state**: [`CardGameLayoutPreview.tsx`](/E:/ocentra-games/packages/asset-editor/src/pages/PreviewPanel/CardGameLayoutPreview.tsx) owns local `document` state for the selected asset, broadcasts unsaved drafts, and uses `onAssetUpdate` to keep the editor asset state hot.
- **Asset-editor save path**: [`LayoutAssetService.ts`](/E:/ocentra-games/packages/asset-editor/src/adapters/layout/LayoutAssetService.ts) loads a normalized document from the raw asset and persists the document back into the `.asset`.
- **Standalone preview-canvas**: [`StandalonePanelPage.tsx`](/E:/ocentra-games/packages/asset-editor/src/pages/StandalonePanelPage.tsx) opens a separate preview window and listens for live draft updates. It currently renders `CardGameTemplatePage` directly.
- **Window and channel wiring**: [`createPanelWindow.ts`](/E:/ocentra-games/packages/asset-editor/src/utils/createPanelWindow.ts) owns `preview-canvas` window creation and defines the asset-editor draft channel constant.
- **Main-app dev harness**: [`CardGamePreviewHarness.tsx`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/CardGamePreviewHarness.tsx) currently uses a different draft-channel literal and calls `hydrateCardGameLayoutAsset` with the wrong shape. It also routes through `CardGameTemplateViewport`, which is the source of the dead-space screenshots.
- **Main-app saved-layout consumer path**: [`cardGameLayoutAsset.ts`](/E:/ocentra-games/src/ui/layout/cardGameLayoutAsset.ts) and [`playableSession.ts`](/E:/ocentra-games/src/ui/pages/games/CardGamePlay/playableSession.ts) load and normalize saved layout assets for the actual playable route.
- **Current persisted example**: [`claimLayout.asset`](/E:/ocentra-games/packages/asset-editor/Resources/GameMode/CardGames/Games/Claim/claimLayout.asset) already stores per-player-count `presets` with seat positions, rotation, and scale.

## Solution Statements
- The canonical authoring input is a normalized `CardGameLayoutDocument` plus an explicit `playerCount`.
- The canonical rendered scene is one shared component that converts `document + playerCount` into store state and then renders table, seats, HUD, background, and card fan together.
- `CardGamePreviewSurface` becomes the stage baseline. No host should compose `CenterTableSvg`, `PlayersOnTable`, and `GameHUD` separately anymore.
- `CardGameTemplatePage` becomes a shell-only wrapper around the canonical stage. It may own header/footer/chrome, but not its own parallel scene-state logic.
- `CardGameTemplateViewport` is removed from the editor preview and main-app harness path for this phase. The baseline fit behavior is the responsive full-page/canvas behavior that already looks right in `Open Canvas`.
- A single shared draft-channel constant is moved into a package both app and editor can import, so editor preview, preview-canvas, and main-app harness can use the same live-draft transport.
- The asset editor preview remains the authoring surface for this phase. Do not reintroduce a separate full design-studio window yet.
- `/games/cardgame/template` becomes a true dev-only consumer harness. Default behavior is to load a saved asset; optional live-draft mode can be kept for side-by-side debugging, but it must use the same channel and same stage host.
- The layout document remains the source of truth. `tableLayoutStore` is kept as a render/editor helper, not as an independent authoring source.

## Implementation Plan
1. **Stabilize the rendering pipeline**
- Refactor [`CardGameTemplatePage.tsx`](/E:/ocentra-games/packages/card-game-ui/src/CardGameTemplatePage.tsx) so it renders a single shared stage component instead of composing `CenterTableSvg`, `PlayersOnTable`, `GameHUD`, and `CardInHand` itself.
- Reuse [`CardGamePreviewSurface.tsx`](/E:/ocentra-games/packages/card-game-ui/src/CardGamePreviewSurface.tsx) as the canonical stage, or rename it to a clearer shared name, but keep one implementation only.
- Ensure the canonical stage always seeds `tableLayoutStore` from the incoming `document` and chosen `playerCount` before rendering.
- Keep `selectedSeatId` in the store for editor highlighting, but do not let the store become the primary source of persisted authoring data.

2. **Unify host sizing and remove the dead-space bug**
- Stop using [`CardGameTemplateViewport.tsx`](/E:/ocentra-games/packages/card-game-ui/src/CardGameTemplateViewport.tsx) in the asset-editor preview and in [`CardGamePreviewHarness.tsx`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/CardGamePreviewHarness.tsx).
- Use the same responsive shell logic that `Open Canvas` already uses as the fit baseline.
- Keep CSS responsible only for outer shell layout and chrome. Do not keep a top-left fixed `1920x1080` scene scaler in the preview path.
- Normalize the shell CSS across [`CardGameLayoutPreview.css`](/E:/ocentra-games/packages/asset-editor/src/pages/PreviewPanel/CardGameLayoutPreview.css), [`CardGameTemplatePage.css`](/E:/ocentra-games/packages/card-game-ui/src/CardGameTemplatePage.css), and the main-app harness wrapper so the stage always fills the intended bounds without a large empty right or bottom region.

3. **Fix the broken cross-surface draft plumbing**
- Move `CARD_GAME_LAYOUT_DRAFT_CHANNEL` into `@ocentra/game-layout-domain` or `@ocentra/game-ui-types` so both editor and main app import the same constant.
- Update [`createPanelWindow.ts`](/E:/ocentra-games/packages/asset-editor/src/utils/createPanelWindow.ts), [`CardGameLayoutPreview.tsx`](/E:/ocentra-games/packages/asset-editor/src/pages/PreviewPanel/CardGameLayoutPreview.tsx), [`StandalonePanelPage.tsx`](/E:/ocentra-games/packages/asset-editor/src/pages/StandalonePanelPage.tsx), and [`CardGamePreviewHarness.tsx`](/E:/ocentra-games/src/ui/components/GameScreen/CardGameScreen/CardGamePreviewHarness.tsx) to use that shared constant.
- Replace the wrong harness-side `hydrateCardGameLayoutAsset({ data: document, system: ... })` ghost asset creation with the same preview-asset creation path used by the canonical shared stage.

4. **Make seat and player-UI authoring explicit**
- Keep `document.presets[String(playerCount)]` as the editable target for the active player-count layout.
- Extend [`CardGameDesignStudio.tsx`](/E:/ocentra-games/packages/card-game-ui/src/CardGameDesignStudio.tsx) so the `Table > Seats` workspace edits actual seat data for the active preset: `x`, `y`, `rotation`, and `scale` per seat.
- Add an explicit active player-count selector in the table workspace so the user is always editing a concrete preset, not just `defaultPlayerCount`.
- Use store selection only for seat picking/highlight. Persisted edits must update `document.presets[count].seats`.
- Extend the `Player UI` workspace so it clearly separates global defaults (`document.playerUiDefaults`) from per-seat overrides (`seat.playerOverrides`).
- Keep the current serialized override set limited to `baseArcRotation`, `infoBoxAngle`, and `infoBoxRotation` for this phase unless there is an explicit decision to widen the persisted contract.

5. **Align the main-app consumer paths**
- Keep [`playableSession.ts`](/E:/ocentra-games/src/ui/pages/games/CardGamePlay/playableSession.ts) using saved layout presets; this is already the right consumer model.
- Reduce [`cardGameLayoutAsset.ts`](/E:/ocentra-games/src/ui/layout/cardGameLayoutAsset.ts) to a thin adapter over `@ocentra/game-layout-domain` if possible, so normalization logic is not duplicated.
- Change `/games/cardgame/template` to default to loading a real saved layout asset by `gameId` and optional `layoutGuid` instead of a dummy inline preset.
- Keep live-draft preview for `/games/cardgame/template` only as an explicit dev mode, not as the default path.

## Test Plan And Acceptance
- Resizing the asset-editor preview, preview-canvas window, and `/games/cardgame/template` must keep the same scene composition with no large empty right or bottom gutter.
- The same saved `claimLayout.asset` must place the table and opponent seats consistently in all three surfaces.
- Editing a seat position in the editor must update the embedded preview and `Open Canvas` immediately, then persist after save and reload.
- Editing `playerUiDefaults` and a per-seat override must visibly change the corresponding rendered seat and survive save/reload.
- The main-app template harness must load the saved asset and match the editor after save.
- The playable game route must still consume the same saved preset and place seats from the asset, not from regenerated defaults.
- Existing older layout assets must still hydrate through `normalizeCardGameLayoutDocument(...)` without migration breakage.

## Assumptions And Defaults
- Keep the asset-editor preview pane as the authoring surface for now; do not restore a separate full design-studio window in this phase.
- Keep `Open Canvas` as a clean preview window with no editor controls.
- Keep `/games/cardgame/template` as dev-only and non-production.
- Keep seat `0` as the local-player seat that is not rendered as an opponent bubble in the template preview scene unless a later product decision changes that behavior.
- Preserve backward compatibility for current asset shapes, including assets that still carry legacy nested `data.layout` structure.

## Checklist
- [ ] Replace parallel scene composition in `CardGameTemplatePage` with one shared canonical stage component.
- [ ] Make the canonical stage seed `tableLayoutStore` from `document + playerCount` on every render path.
- [ ] Remove `CardGameTemplateViewport` from the asset-editor preview path.
- [ ] Remove `CardGameTemplateViewport` from `/games/cardgame/template`.
- [ ] Normalize the preview shell CSS so there is no right-side or bottom dead-space gutter.
- [ ] Move the draft broadcast-channel constant into a shared package.
- [ ] Update asset editor preview, preview-canvas, and main-app harness to import the same shared draft-channel constant.
- [ ] Fix the main-app harness ghost asset creation so it uses the same preview-asset path as the shared stage.
- [ ] Make `/games/cardgame/template` load a saved layout asset by default instead of a dummy inline preset.
- [ ] Add active player-count selection to the table editor workspace.
- [ ] Make `Table > Seats` edit `document.presets[count].seats` directly.
- [ ] Add direct controls for seat `x`, `y`, `rotation`, and `scale`.
- [ ] Keep seat selection in the store only for highlight/targeting, not as the persisted source.
- [ ] Split `Player UI` editing into global defaults vs per-seat overrides.
- [ ] Keep per-seat override persistence limited to the current serialized override set unless explicitly expanded.
- [ ] Verify save/reload round-trip for seat positions and player-UI values.
- [ ] Verify all three preview surfaces render the same saved layout consistently.
- [ ] Verify the playable game route still consumes saved presets correctly.
