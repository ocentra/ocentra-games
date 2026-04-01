#!/usr/bin/env node
/**
 * Run assets seed (local R2) with visible output and optional tee to a log file.
 * Usage:
 *   node scripts/dev/run-seed-and-verify.mjs           # seed, stdout only
 *   node scripts/dev/run-seed-and-verify.mjs --tee     # seed, stdout + write to .dev-seed-output.log
 *   node scripts/dev/run-seed-and-verify.mjs --force    # force re-upload (ignore cache)
 */

import { spawn } from 'child_process';
import { createWriteStream } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');
const CLOUDFLARE_DIR = path.join(ROOT, 'infra', 'cloudflare');
const LOG_FILE = path.join(ROOT, '.dev-seed-output.log');

const args = process.argv.slice(2);
const tee = args.includes('--tee');
const force = args.includes('--force');
const seedArgs = args.filter((a) => a !== '--tee');

if (force) {
  seedArgs.push('--force');
}

console.log('[run-seed-and-verify] Starting assets seed (local R2)...');
console.log('[run-seed-and-verify] cwd:', CLOUDFLARE_DIR);
if (tee) console.log('[run-seed-and-verify] Tee to', LOG_FILE);

const outStream = tee ? createWriteStream(LOG_FILE, { flags: 'w' }) : null;

function write(line) {
  process.stdout.write(line);
  if (outStream) outStream.write(line);
}

const child = spawn(
  'npx',
  ['tsx', 'scripts/seed-assets-local.ts', ...seedArgs],
  {
    cwd: CLOUDFLARE_DIR,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    env: { ...process.env },
  }
);

child.stdout.on('data', (data) => write(data.toString()));
child.stderr.on('data', (data) => write(data.toString()));

child.on('close', async (code) => {
  if (outStream) outStream.end();

  if (code !== 0) {
    console.error('[run-seed-and-verify] Seed exited with code', code);
    process.exit(code);
  }

  const reportPath = path.join(CLOUDFLARE_DIR, '.wrangler', 'seed-assets-local-report.json');
  try {
    const report = JSON.parse(await readFile(reportPath, 'utf8'));
    console.log('[run-seed-and-verify] Report:', reportPath);
    console.log('[run-seed-and-verify] Files:', report.files, '| Mode:', report.mode, '| Uploaded:', report.uploadedFiles);
  } catch {
    console.log('[run-seed-and-verify] (no report file yet)');
  }

  console.log('[run-seed-and-verify] Done. Start worker with: cd infra/cloudflare && npm run dev');
});

child.on('error', (err) => {
  console.error('[run-seed-and-verify] Spawn error', err);
  process.exit(1);
});
