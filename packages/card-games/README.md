# @ocentra/card-games

Single source of truth for the **card games catalog**: types, schemas, and validation for processed game data. Dev-only package used by the main app (explorer) and ingest/validation scripts. Not shipped to production.

---

## Docs

| Doc | Purpose |
|-----|---------|
| [GameReadyValidation.md](docs/GameReadyValidation.md) | Validation rules, Ready Gate, engine field requirements, "Can I build this?" |
| [GapFillRegulation.md](docs/GapFillRegulation.md) | Fill-the-gap process rules (real data, no placeholders, one game at a time, etc.) |
| [fill-the-gap-sync.md](docs/fill-the-gap-sync.md) | Batch sync for agents |
| [gap_fill_and_verify.md](docs/gap_fill_and_verify.md) | Gap-fill workflow overview |
| [game-checklist.md](docs/game-checklist.md) | Consolidated game list with URLs and local HTML status |
| [scoring-spec.md](docs/scoring-spec.md) | Scoring rules (cardValues, targetScore, nullReasons, engine linkage) |

---

## What it does

- **Schema** – TypeScript/Effect Schema schemas (`game-schema.ts`) for validating `processed-games/*.json`. Deck types/suit/rank come from `@ocentra/game-domain/deck/*`.
- **Domain types** – (Planned) Effect Schema schemas and TypeScript types for deserializing game JSON into typed objects.
- **Data explorer** – Temp dev app in `packages/data-explorer` for browsing the catalog, powered by DuckDB.

---

## Structure

| Path | Purpose |
|------|---------|
| `src/schema/` | Effect Schema schemas, deck types, deck structure |
| `src/` | Domain types, schemas (Effect Schema/TS) |
| `src/processed-games/` | Serialized game documents |
| `src/scripts/` | validate-with-ts-schema, migration scripts |
| `src/SourceHtml/` | Cached source HTML |

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run build` | Compile domain TypeScript |
| `npm run lint` | ESLint (domain + db) via root config |
| `npm run type-check` | `tsc --noEmit` |
| `npm run db:init` | Initialize DuckDB |
| `npm run ingest:list` | Populate games list |
| `npm run ingest:json-files` | Ingest JSON into DuckDB |

---

## Relationship to main app

- The main app explorer now reads asset slices built from `packages/asset-editor/Resources` and served through the asset worker/R2 path.
- `serveFromGameData` and `serveProcessedGames` are in this package (`src/server/serve-game-data.ts`). The temp data-explorer app lives in `packages/data-explorer` and uses them.
- Types from this package can be imported by the main app for typed explorer data.
