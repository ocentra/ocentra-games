import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const duckdb = require('duckdb');

const dbPath = path.join(__dirname, 'games.duckdb');
const migrationsDir = path.join(__dirname, 'migrations');

const db = new duckdb.Database(dbPath);
const conn = db.connect();

conn.run('DROP TABLE IF EXISTS game_names');
conn.run('DROP TABLE IF EXISTS games');
conn.run('DROP TABLE IF EXISTS json_files');
conn.run('DROP TABLE IF EXISTS schema_version');

const initialPath = path.join(migrationsDir, '001_initial.sql');
if (!fs.existsSync(initialPath)) {
  console.error('Migration 001_initial.sql not found');
  conn.close();
  db.close();
  process.exit(1);
}

const content = fs.readFileSync(initialPath, 'utf-8');
const statements = content
  .split(/;\s*\n/)
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter(Boolean);

for (const stmt of statements) {
  conn.run(stmt);
}

conn.close();
db.close();

console.log('DB initialized:', dbPath);
console.log('Tables: schema_version, games, game_names (from migration 001)');
