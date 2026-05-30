# Card Game Migration Sweep - 2026-05-30

## Summary

- Source processed-game JSON files scanned: 1,411
- Source slugs migrated to `CardGameMode`: 1,402
- Source slugs blocked by strict validation: 9
- Total `CardGameMode` assets under `Resources/GameMode/CardGames/Games`: 1,404
- Duplicate game IDs detected: 0
- Extra non-source/pilot game IDs present: `claim`, `three-card-brag`
- Known duplicate-identity review item: source `vying/brag-3-card.json` generated `brag-3-card`, while the existing pilot `three-card-brag` remains present. This needs human source review before release promotion, rather than silently deleting either asset.

## Validation Proof

- `cmd /c npm --prefix packages/asset-editor run validate:game-assets`
  - scanned 28,041 `.asset` files
  - passed 28,041
  - failed 0
  - selected-game readiness scanned 1,404 game mode assets
- `cmd /c npm --prefix packages/asset-editor run validate:card-games-taxonomy`
  - source directories 93
  - marker files 93
  - issues 0
- `cmd /c npm --prefix packages/asset-editor run type-check`
  - passed
- `cmd /c npm --prefix packages/game-asset-domain run build`
  - passed
- `cmd /c npm --prefix packages/asset-editor run lint:eslint -- scripts/install-processed-game-bundle.ts scripts/processed-game-bundle-installer.ts scripts/migrate-processed-game-batch.ts`
  - passed

## Blocked Source Games

These games were intentionally not installed because they fail strict migration validation.

| Source | Reason |
| --- | --- |
| `banking/baccarat-deux-tableaux-baccarat-banque.json` | generated `maxPlayers` exceeds schema maximum of 20 |
| `fishing/commercial/tuxedo.json` | missing deck asset triple `Rook 56/Rook_colors/Rook_1_14` |
| `fishing/katti.json` | generated `maxPlayers` exceeds schema maximum of 20 |
| `shedding/commercial/whot-british.json` | missing deck asset triple `Whot 54/Whot/Whot` |
| `shedding/commercial/whot-nigerian.json` | missing deck asset triple `Whot 54/Whot/Whot` |
| `trick-taking/commercial/call-partner-rook.json` | missing deck asset triple `Rook 56/Rook_colors/Rook_1_14` |
| `trick-taking/commercial/golden-ten.json` | missing deck asset triple `Rook 56/Rook_colors/Rook_1_14` |
| `trick-taking/commercial/kentucky-rook.json` | missing deck asset triple `Rook 56/Rook_colors/Rook_1_14` |
| `trick-taking/commercial/rook.json` | missing deck asset triple `Rook 56/Rook_colors/Rook_1_14` |

## Category Coverage

| Category | Source | Migrated | Missing |
| --- | ---: | ---: | ---: |
| `abstract-strategy` | 3 | 3 | 0 |
| `accumulation` | 42 | 42 | 0 |
| `banking` | 33 | 32 | 1 |
| `beating` | 38 | 38 | 0 |
| `climbing` | 24 | 24 | 0 |
| `combat` | 1 | 1 | 0 |
| `commerce` | 10 | 10 | 0 |
| `compendium` | 15 | 15 | 0 |
| `cuckoo` | 6 | 6 | 0 |
| `domino` | 117 | 117 | 0 |
| `draw-and-discard` | 17 | 17 | 0 |
| `fishing` | 78 | 76 | 2 |
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
| `shedding` | 41 | 39 | 2 |
| `social` | 26 | 26 | 0 |
| `tarot` | 43 | 43 | 0 |
| `tile` | 5 | 5 | 0 |
| `trick-taking` | 245 | 241 | 4 |
| `vying` | 111 | 111 | 0 |
| `war` | 13 | 13 | 0 |
| `whist` | 61 | 61 | 0 |

## Runtime And Visual Notes

- The migration creates schema-valid, selected-game-ready asset bundles with placeholder/fallback art warnings preserved where final art is still needed.
- Visual proof in the asset editor should use `http://localhost:5174/?mock=true`.
- Chrome extension checks passed, but the current Chrome session had no active controllable pane. Opening a Chrome window for Profile 1 is still needed before Chrome screenshots can be captured.
- True two-browser gameplay proof is not available for arbitrary migrated games yet. The current local pilot runtime still gates non-Claim play routes before generic engine execution, so honest smoke coverage for new migrations is selected-game and lobby surface loading only.
