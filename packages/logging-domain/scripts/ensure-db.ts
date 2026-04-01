import { getDefaultDbPath, TestLogDuckDb, LOG_DB_DOMAIN_ENV, DEFAULT_DOMAIN } from '../src/test-log/testLogDuckDb';

function parseDomain(): string {
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--domain=')) {
      const v = arg.slice('--domain='.length).trim();
      return v || DEFAULT_DOMAIN;
    }
  }
  return process.env[LOG_DB_DOMAIN_ENV] ?? DEFAULT_DOMAIN;
}

async function main(): Promise<void> {
  const domain = parseDomain();
  const dbPath = getDefaultDbPath(domain);
  process.stdout.write(`Creating DB at ${dbPath} (domain: ${domain})...\n`);
  try {
    const db = await TestLogDuckDb.create({ dbPath });
    await db.close();
    process.stdout.write(`OK: DB created (or already exists).\n`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`FAIL: ${msg}\n`);
    if (err instanceof Error && err.stack) {
      process.stderr.write(err.stack + '\n');
    }
    process.exit(1);
  }
}

main();
