import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const duckdb = require('duckdb');

let dbPath = path.resolve(process.cwd(), 'db', 'games.duckdb');
if (!fs.existsSync(dbPath)) {
  dbPath = path.join(__dirname, 'games.duckdb');
}
if (!fs.existsSync(dbPath)) {
  console.error(JSON.stringify({ error: 'DB not found. Run npm run db:init && npm run ingest first.', rows: [], total: 0 }));
  process.exit(1);
}

async function run() {
  const db = new duckdb.Database(dbPath);
  const conn = db.connect();
  try {
    const list = await new Promise<unknown[]>((resolve, reject) => {
      conn.all(
        `SELECT gn.slug, gn.display_name, gn.is_primary, g.source_file
         FROM game_names gn
         JOIN games g ON g.slug = gn.slug
         WHERE gn.display_name LIKE '%(see %'
         ORDER BY gn.slug, gn.is_primary DESC, gn.sort_order`,
        (err: Error | null, rows: unknown) => {
          if (err) reject(err);
          else resolve(Array.isArray(rows) ? rows : []);
        }
      );
    });
    process.stdout.write(JSON.stringify({ rows: list, total: list.length }, null, 0));
  } finally {
    try {
      conn.close();
      db.close();
    } catch {
      // ignore
    }
  }
}

run().catch((err) => {
  console.error(JSON.stringify({ error: String(err?.message ?? err), rows: [], total: 0 }));
  process.exit(1);
});
