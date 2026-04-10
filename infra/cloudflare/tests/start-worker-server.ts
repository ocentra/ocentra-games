#!/usr/bin/env node

import * as fs from 'fs';
import { spawnSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cloudflareDir = path.resolve(__dirname, '..');
const port = process.env.WORKER_HTTP_PORT || '8787';
const persistTo = process.env.WORKER_PERSIST_TO || path.join(os.tmpdir(), 'ocentra-games-wrangler-state', `${Date.now()}-${process.pid}`);

if (!process.env.WORKER_PERSIST_TO) {
  fs.rmSync(persistTo, { recursive: true, force: true });
}
fs.mkdirSync(persistTo, { recursive: true });

const result = spawnSync('npx', ['wrangler', 'dev', '--env', 'development', '--port', port, '--persist-to', persistTo], {
  cwd: cloudflareDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});
process.exit(result.status ?? 1);
