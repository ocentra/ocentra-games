#!/usr/bin/env node

import { spawnSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cloudflareDir = path.resolve(__dirname, '..');
const port = process.env.WORKER_HTTP_PORT || '8787';

const result = spawnSync('npx', ['wrangler', 'dev', '--env', 'development', '--port', port], {
  cwd: cloudflareDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});
process.exit(result.status ?? 1);
