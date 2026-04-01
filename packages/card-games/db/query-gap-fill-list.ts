import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const duckdb = require('duckdb');

const dbPath = path.join(__dirname, 'games.duckdb');

if (!fs.existsSync(dbPath)) {
  process.stdout.write(JSON.stringify({ error: 'DB not found. Run npm run db:init && npm run ingest first.', files: [], total: 0 }));
  process.exit(1);
}

const db = new duckdb.Database(dbPath);
const conn = db.connect();

function run(sql: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    conn.all(sql, (err: Error | null, rows: unknown) => {
      if (err) reject(err);
      else resolve(Array.isArray(rows) ? rows : []);
    });
  });
}

async function main() {
  const rows = await run(
    `SELECT source_file AS file
     FROM games
     WHERE LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.history.origins') AS VARCHAR), ''))) < 80
        OR LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.setup.players') AS VARCHAR), ''))) < 15
        OR LENGTH(TRIM(COALESCE(CAST(json_extract(content, '$.rules.objective') AS VARCHAR), ''))) < 50
        OR content LIKE '%"hasPlaceholders":true%'
     ORDER BY source_file`
  );
  const files = (rows as { file: string }[]).map((r) => r.file).filter(Boolean);
  const deduped = [...new Set(files)];
  conn.close();
  db.close();
  process.stdout.write(JSON.stringify({ files: deduped, total: deduped.length }));
}

main().catch((e) => {
  process.stdout.write(JSON.stringify({ error: String(e?.message ?? e), files: [], total: 0 }));
  process.exit(1);
});
