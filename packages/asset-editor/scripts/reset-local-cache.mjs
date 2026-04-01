import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const cachePath = join(process.cwd(), 'Resources', '.index', 'assets.db');

if (!existsSync(cachePath)) {
  process.stdout.write(`[reset-local-cache] No local cache found at ${cachePath}\n`);
  process.exit(0);
}

rmSync(cachePath, { force: true });
process.stdout.write(`[reset-local-cache] Removed ${cachePath}\n`);
process.stdout.write('[reset-local-cache] The editor will rebuild the local cache automatically on next startup.\n');
