# Card Game Migration Sweep - 2026-05-30

## Summary

- Source processed-game JSON files scanned: 1,411
- Source slugs migrated to `CardGameMode`: 1,411
- Source slugs blocked by strict validation: 0
- Total `CardGameMode` assets under `Resources/GameMode/CardGames/Games`: 1,413
- Extra non-source/pilot game IDs present: `claim`, `three-card-brag`
- Duplicate game IDs detected: 0
- Known duplicate-identity review item: source `vying/brag-3-card.json` generated `brag-3-card`, while the existing pilot `three-card-brag` remains present. This needs human source review before release promotion, rather than silently deleting either asset.

## What Changed

- Installed the 9 formerly blocked source games:
  - `banking/baccarat-deux-tableaux-baccarat-banque`
  - `fishing/commercial/tuxedo`
  - `fishing/katti`
  - `shedding/commercial/whot-british`
  - `shedding/commercial/whot-nigerian`
  - `trick-taking/commercial/call-partner-rook`
  - `trick-taking/commercial/golden-ten`
  - `trick-taking/commercial/kentucky-rook`
  - `trick-taking/commercial/rook`
- Added explicit placeholder-only commercial deck assets for current source triples:
  - `Rook 56 / Rook_colors / Rook_1_14`
  - `Whot 54 / Whot / Whot`
- Kept commercial deck/card/ranking assets blocked unless the asset data explicitly declares `commercialPlaceholderOnly: true`.
- Raised card-game player bounds to 100 so source-true games such as Baccarat Banque and Katti are not rejected by an arbitrary 20-player ceiling.
- Updated validators to understand current deck/card fields:
  - `rankingAsset` as well as legacy `cardRankingAsset`
  - `DeckRanking` as well as older `CardRanking`
  - `composition[].pieceTemplate` as well as older card-template arrays
  - card, tile, Hanafuda, Karuta, Kabufuda, Mahjong, domino, Rook, and Whot deck/ranking shapes
- Corrected source data that strict migration surfaced:
  - `357-poker` had complete strategy/AI content added from the local source extraction.
  - `whot-nigerian` quality was aligned with its complete source fields.
  - `rook` placeholder public prompt was replaced with concrete game content.
  - `zifuli`, `vira`, and `whist` empty history timelines were replaced with extracted source facts.
  - `Tarocco_Siciliano_63/italian_denari_ace.asset` now points to the 64-card ranking; the local source explains that the Ace of Coins belongs to the 64-card variant, while the 63-card pack omits it.

## Validation Proof

- `cmd /c npm --prefix packages/asset-editor run validate:processed-game-migration`
  - scanned 1,411 source files
  - passed 1,411
  - failed 0
  - warnings 4,352
  - errors 0
- `cmd /c npm --prefix packages/asset-editor run validate:game-assets`
  - scanned 28,313 `.asset` files
  - passed 28,313
  - failed 0
  - selected-game readiness scanned 1,413 game mode assets
  - selected-game readiness warnings 7
- `cmd /c npm --prefix packages/asset-editor run validate:card-games-taxonomy`
  - source directories 93
  - marker files 93
  - issues 0
- `cmd /c npm --prefix packages/game-asset-domain run validate-decks`
  - deck assets 107
  - failed 0
- `cmd /c npm --prefix packages/game-asset-domain run validate-cards`
  - card assets 1,590
  - failed 0
- `cmd /c npm --prefix packages/game-asset-domain run validate-card-rankings`
  - ranking assets 98
  - failed 0
- `cmd /c npm --prefix packages/game-asset-domain run validate-deck-triple-coverage:all`
  - processed games 1,411
  - included commercial games 178
  - skipped commercial games 0
  - missing allowed triples 0
  - uncovered used triples 0
- `cmd /c npm --prefix packages/game-asset-domain run validate-deck-semantic-readiness`
  - deck asset files 107
  - ready decks 107
  - failed decks 0
- `cmd /c npm --prefix packages/game-asset-domain run test -- src/schemas/asset/commercial-asset-policy.test.ts src/factories/ProcessedGameAssetFactory.test.ts`
  - test files 2
  - tests 10
  - failed 0
- `cmd /c npm --prefix packages/game-asset-domain run type-check`
  - passed
- `cmd /c npm --prefix packages/asset-editor run type-check`
  - passed
- `cmd /c npm --prefix packages/game-asset-domain run lint:exec`
  - passed
- `cmd /c npm --prefix packages/asset-editor run lint:exec`
  - passed

## Chrome Visual Proof

Captured through the user's Chrome session against `http://localhost:5174/?mock=true`:

- `docs/ocentra/evidence/card-game-migration-2026-05-30/01-editor-games-taxonomy.png`
  - Games tab shows the categorized folder scaffold in the asset editor.
  - `.meta` files are not visible in the tree.
- `docs/ocentra/evidence/card-game-migration-2026-05-30/02-rook-deck-preview.png`
  - `Resources/GameMode/CardGames/Decks/Rook 56.asset` renders as a 56-piece deck matrix.
  - The cards intentionally use placeholder commercial art.
- `docs/ocentra/evidence/card-game-migration-2026-05-30/03-rook-carousel-preview.png`
  - Rook generated carousel exists and renders three fallback-art slides.
  - The fallback hashes are visible so replacement work is traceable.
- `docs/ocentra/evidence/card-game-migration-2026-05-30/04-rook-deck-model-preview.png`
  - `rookDeckModel.asset` resolves the Rook deck reference and renders the linked 56-piece deck preview.
  - The proof page had no `Loading deck...`, no `Loading asset...`, and no Chrome console errors after the preview loader fix.

The Chrome pass caught two editor loading bugs while proving the migrated assets:

- Asset-tree selection was loading non-image resources by GUID in browser mode instead of preferring the indexed resource path, which could leave migrated asset previews stuck at `Loading asset...`.
- Deck preview reference loading could discard a valid `Resources/...` path and fall back to GUID lookup, which could leave nested deck references stuck at `Loading deck...`.

Both bugs were fixed in this pass:

- `useAssetNavigation` now preserves the indexed resource path for non-image asset selection when the editor is running in browser mode.
- `DeckPreview` now normalizes referenced resource paths, prefers direct resource paths over GUID lookup, and bounds nested reference loading so a missing/slow reference degrades instead of leaving the preview stuck indefinitely.

## Warning Policy

The migration validator is intentionally not silent-green. It passes only when the source game can be installed as a complete asset bundle, but it keeps warnings for work that should not be hidden:

- `source-review-pending`: rules, deck, category, and duplicate identity still need human source-page review before release promotion.
- `carousel-slide-uses-fallback-art`: shared fallback art is present and must be replaced with final game-specific frames.
- `carousel-needs-final-art`: generated carousel is conceptually present but not final visual art.
- Selected-game readiness warnings currently remain only for final-art work in Briscola and Three Card Brag.

## Category Coverage

| Category | Source | Migrated | Missing |
| --- | ---: | ---: | ---: |
| `abstract-strategy` | 3 | 3 | 0 |
| `accumulation` | 42 | 42 | 0 |
| `banking` | 33 | 33 | 0 |
| `beating` | 38 | 38 | 0 |
| `climbing` | 24 | 24 | 0 |
| `combat` | 1 | 1 | 0 |
| `commerce` | 10 | 10 | 0 |
| `compendium` | 15 | 15 | 0 |
| `cuckoo` | 6 | 6 | 0 |
| `domino` | 117 | 117 | 0 |
| `draw-and-discard` | 17 | 17 | 0 |
| `fishing` | 78 | 78 | 0 |
| `gambling` | 27 | 27 | 0 |
| `invented` | 3 | 3 | 0 |
| `jass` | 48 | 48 | 0 |
| `karnoeffel` | 11 | 11 | 0 |
| `last-trick` | 13 | 13 | 0 |
| `marriage` | 35 | 35 | 0 |
| `matching` | 39 | 39 | 0 |
| `miscellaneous` | 9 | 9 | 0 |
| `passing` | 5 | 5 | 0 |
| `patience` | 77 | 77 | 0 |
| `poker` | 111 | 111 | 0 |
| `race` | 5 | 5 | 0 |
| `role` | 1 | 1 | 0 |
| `rummy` | 98 | 98 | 0 |
| `shedding` | 41 | 41 | 0 |
| `social` | 26 | 26 | 0 |
| `tarot` | 43 | 43 | 0 |
| `tile` | 5 | 5 | 0 |
| `trick-taking` | 245 | 245 | 0 |
| `vying` | 111 | 111 | 0 |
| `war` | 13 | 13 | 0 |
| `whist` | 61 | 61 | 0 |

## Runtime And Visual Notes

- The migration creates schema-valid, selected-game-ready asset bundles with placeholder/fallback art warnings preserved where final art is still needed.
- Browser visual proof was captured in Chrome at `http://localhost:5174/?mock=true` and covers both folder hierarchy and rendered migrated asset previews.
- The `.meta` files are present on disk for selected pilot assets, but the editor resource index path filter is expected to hide `.meta` and dot-folder paths from the tree.
- Standard 52 card assets now carry `imageHash` and `imagePath`; if the deck preview renders labels only, that is a UI/runtime loading bug rather than missing card asset metadata.
- True two-browser gameplay proof is not available for arbitrary migrated games yet. The current local pilot runtime still gates non-Claim play routes before generic engine execution, so honest smoke coverage for new migrations is selected-game and lobby/editor surface loading until generic runtime execution is expanded.
