/**
 * Inspect DuckDB directly with raw SQL (no query script logic).
 * Usage: npx tsx scripts/db-inspect.ts [--domain=cloudflare|main|solana|default]
 */

import { createRequire } from 'module';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getDefaultDbPath, LOG_DB_DOMAIN_ENV, DEFAULT_DOMAIN } from '../src/test-log/testLogDuckDb';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const req = createRequire(import.meta.url);
const duckdb = req('duckdb') as {
  Database: new (path: string, cb: (err: Error | null) => void) => {
    all: (sql: string, ...args: unknown[]) => void;
    close: (cb: (err: Error | null) => void) => void;
  };
};

function parseDomain(): string {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--domain=')) {
      const v = arg.slice('--domain='.length).trim();
      return v || DEFAULT_DOMAIN;
    }
  }
  return process.env[LOG_DB_DOMAIN_ENV] ?? DEFAULT_DOMAIN;
}

function run(db: { all: (sql: string, ...args: unknown[]) => void }, sql: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, (err: Error | null, rows: unknown[]) => {
      if (err) reject(err);
      else resolve(rows ?? []);
    });
  });
}

const domain = parseDomain();
const dbPath = getDefaultDbPath(domain);
const db = new duckdb.Database(dbPath, (err) => {
  if (err) {
    console.error('DuckDB open failed:', err.message);
    process.exit(1);
  }
});

async function main() {
  console.log('Domain:', domain);
  console.log('DB path:', dbPath);
  console.log('');

  const tables = await run(db, "SELECT table_name FROM information_schema.tables WHERE table_schema = 'main' ORDER BY table_name");
  console.log('Tables:', (tables as { table_name: string }[]).map((r) => r.table_name).join(', '));
  console.log('');

  const runCount = await run(db, 'SELECT COUNT(*) as n FROM test_runs');
  console.log('test_runs count:', (runCount[0] as { n: number }).n);

  const logCount = await run(db, 'SELECT COUNT(*) as n FROM test_logs');
  console.log('test_logs count:', (logCount[0] as { n: number }).n);
  console.log('');

  const runsSample = await run(db, 'SELECT run_id, test_name, test_file, run_type, status FROM test_runs ORDER BY run_timestamp DESC LIMIT 5');
  console.log('test_runs (latest 5):');
  console.table(runsSample);

  const logsByRun = await run(db, 'SELECT run_id, test_name, COUNT(*) as log_count FROM test_logs GROUP BY run_id, test_name ORDER BY run_id, test_name LIMIT 15');
  console.log('test_logs grouped by run_id, test_name (sample):');
  console.table(logsByRun);

  if ((logCount[0] as { n: number }).n > 0) {
    const logSample = await run(db, 'SELECT run_id, test_name, level, origin, source, LEFT(message, 50) as msg FROM test_logs ORDER BY log_timestamp DESC LIMIT 5');
    console.log('test_logs (latest 5):');
    console.table(logSample);
  }

  db.close(() => {});
}

main().catch((e) => {
  console.error(e);
  db.close(() => {});
  process.exit(1);
});
