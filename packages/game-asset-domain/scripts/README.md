Active scripts in this folder are part of the current maintenance workflow:

- `validate-*`: asset and family validation
- `report-*`: backlog and coverage reporting
- `sync-card-game-assets.ts`: sync processed game deck usage into asset expectations
- `sync-tile-image-hashes.mjs`: apply real tile image hashes after art import
- `sync-tarot-family-image-hashes.mjs`: apply tarot-family image hashes after art import
- `fill-normaldeck-image-hashes.ts`: apply standard-card image hashes
- `fix-card-ranking-declarations.mjs`: build-time declaration cleanup

Historical one-off migrations and repair scripts were moved to [`archive/2026-deck-migrations`](/E:/ocentra-games/packages/game-asset-domain/scripts/archive/2026-deck-migrations) to keep the live script surface small without losing the implementation history.
