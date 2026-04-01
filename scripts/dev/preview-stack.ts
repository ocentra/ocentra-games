#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createManagedProcessRegistry, ensureLocalCloudflareWorker, killManagedProcesses, spawnManaged, ROOT } from './cloudflare-dev-bootstrap';
import { ensureTurboDevPrep } from './turbo-dev-prep';
import { ensurePortFree } from './port-utils';

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

function log(message: string): void {
  console.log(`[preview] ${message}`);
}

function applyDotenvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const parsed = dotenv.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    const existing = process.env[key];
    if (existing === undefined || String(existing).trim().length === 0) {
      process.env[key] = value;
    }
  }
}

function isLikelyOurs(occupant: { name: string; commandLine: string }): boolean {
  const name = occupant.name.toLowerCase();
  const cmd = occupant.commandLine.toLowerCase();
  return (
    name.includes('node') ||
    name.includes('vite') ||
    cmd.includes('vite') ||
    cmd.includes('tsx') ||
    cmd.includes('node')
  );
}

async function main(): Promise<void> {
  const registry = createManagedProcessRegistry();
  const shutdown = () => {
    killManagedProcesses(registry);
    process.exit(0);
  };

  applyDotenvFile(path.join(ROOT, '.env'));
  applyDotenvFile(path.join(ROOT, '.env.local'));

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    if (hasFlag('--with-worker')) {
      log('Preparing workspace dependencies with Turbo...');
      ensureTurboDevPrep('main', (message) => log(message));

      log('Starting local Cloudflare worker + seed...');
      await ensureLocalCloudflareWorker(registry, (message) => log(message), { skipDependencyPrep: true });
    }

    log('Running production build (vite build)...');
    execSync('npm run build', {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
    });

    const portRaw = process.env.VITE_PREVIEW_PORT || process.env.PREVIEW_PORT || '4173';
    const port = parseInt(portRaw, 10);
    if (!Number.isFinite(port)) {
      throw new Error(`Invalid preview port: ${portRaw}`);
    }
    log(`Ensuring preview port ${port} is free...`);
    await ensurePortFree(port, isLikelyOurs, log, 8);
    log(`Starting Vite preview on port ${port}...`);
    const preview = spawnManaged(
      registry,
      'npx',
      ['vite', 'preview', '--port', String(port), '--strictPort'],
      ROOT,
      'preview'
    );

    await new Promise<void>((resolve) => {
      preview.on('exit', () => resolve());
    });
  } finally {
    killManagedProcesses(registry);
  }
}

main().catch((error) => {
  console.error('[preview] Fatal:', error);
  process.exit(1);
});

