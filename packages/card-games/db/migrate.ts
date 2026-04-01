import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const duckdb = require('duckdb');

const dbPath = path.join(__dirname, 'games.duckdb');
const migrationsDir = path.join(__dirname, 'migrations');

if (!fs.existsSync(dbPath)) {
  console.error('DB not found. Run npm run db:init first.');
  process.exit(1);
}

const db = new duckdb.Database(dbPath);
const conn = db.connect();

function runSql(sql: string): void {
  const s = sql.trim();
  if (!s) return;
  conn.run(s);
}

conn.run(`
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  );
`);

let current = 0;
try {
  const r = conn.all('SELECT version FROM schema_version ORDER BY version DESC LIMIT 1');
  if (Array.isArray(r) && r.length > 0 && r[0]?.version != null) {
    current = Number(r[0].version);
  }
} catch {
  current = 0;
}

const files = fs.readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .map((f) => {
    const match = f.match(/^(\d+)_/);
    return { name: f, num: match ? parseInt(match[1], 10) : 0 };
  })
  .filter((f) => f.num > 0)
  .sort((a, b) => a.num - b.num);

let applied = 0;
for (const { name, num } of files) {
  if (num <= current) continue;
  const fullPath = path.join(migrationsDir, name);
  const content = fs.readFileSync(fullPath, 'utf-8');
  const statements = content
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const stmt of statements) {
    runSql(stmt);
  }
  conn.run('DELETE FROM schema_version');
  conn.run('INSERT INTO schema_version VALUES (?)', num);
  current = num;
  applied++;
  console.log('Applied migration:', name);
}

conn.close();
db.close();

if (applied === 0) {
  console.log('Schema up to date. Current version:', current);
} else {
  console.log('Migrations done. Schema version:', current);
}
