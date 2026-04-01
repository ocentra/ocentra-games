# DuckDB schema, migrations, ingest

Single place for game catalog DB. Lives in card-games; the temp data-explorer app is in `packages/data-explorer` and uses this DB.

| Command (from card-games root) | What |
|--------------------------------|------|
| `npm run db:init` | Create/reset DB from `migrations/001_initial.sql` |
| `npm run db:migrate` | Apply new migrations |
| `npm run ingest` | Load `src/processed-games/*.json` into `games` + `game_names` |
| `npm run names-audit` | Query names containing `(see …)` → JSON to stdout |

Query API (open/close + all SQL) lives in **`src/db/game-db.ts`** and is exported as `@ocentra/card-games/db`. Any app (including main app later) can import that and use the same DB path (`packages/card-games/db/games.duckdb` or pass your own).
