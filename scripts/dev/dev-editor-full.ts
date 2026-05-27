#!/usr/bin/env node

import {
  ROOT,
  createManagedProcessRegistry,
  ensureLocalCloudflareWorker,
  killManagedProcesses,
  spawnManaged,
} from './cloudflare-dev-bootstrap';
import path from 'node:path';
import { ensureTurboDevPrep } from './turbo-dev-prep';
import { applyEditorWebEnv, applyLocalWorkerEnv, resolveEditorWebPort } from './dev-port-config';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';

const registry = createManagedProcessRegistry();
const force = process.argv.includes('--force') || process.env.FORCE === 'true' || process.env.VITE_FORCE === 'true';

function log(message: string): void {
  console.log(`[dev:editor] ${message}`);
}

function formatDurationMs(ms: number): string {
  if (ms >= 60_000) {
    return `${(ms / 60_000).toFixed(2)}m`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
}

process.on('SIGINT', () => {
  log('Shutting down...');
  killManagedProcesses(registry);
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Shutting down...');
  killManagedProcesses(registry);
  process.exit(0);
});

async function main(): Promise<void> {
  const startedAt = Date.now();
  log('Starting asset-editor full-stack dev environment...');

  const turboStartedAt = Date.now();
  process.env.SKIP_TURBO_IF_RECENT = '1';
  ensureTurboDevPrep('editor', (message) => log(message));
  log(`Turbo dependency prep completed in ${formatDurationMs(Date.now() - turboStartedAt)}.`);

  const workerStartedAt = Date.now();
  const { workerBase } = await ensureLocalCloudflareWorker(registry, log, {
    skipDependencyPrep: true,
  });
  log(`Cloudflare worker + seed stage completed in ${formatDurationMs(Date.now() - workerStartedAt)}.`);
  const assetsPublicUrl = `${workerBase.replace(/\/$/, '')}${ApiEndpoint.Assets.Base}`;
  const editorEnv: Record<string, string> = {};
  const editorPort = resolveEditorWebPort();
  applyLocalWorkerEnv(editorEnv);
  applyEditorWebEnv(editorEnv, editorPort);
  editorEnv.VITE_CLAIM_STORAGE_URL = workerBase;
  editorEnv.VITE_R2_WORKER_URL = workerBase;
  editorEnv.VITE_ASSETS_WORKER_URL = workerBase;
  editorEnv.VITE_ASSETS_PUBLIC_URL = assetsPublicUrl;
  editorEnv.VITE_EDITOR_SYNC_LOCAL_CLAIM_STORAGE_URL = workerBase;
  editorEnv.VITE_EDITOR_SYNC_LOCAL_ASSETS_PUBLIC_URL = assetsPublicUrl;
  editorEnv.CARGO_TARGET_DIR = path.join(ROOT, 'packages', 'asset-editor', 'src-tauri', 'target-editor');
  if (force) {
    editorEnv.FORCE = 'true';
    editorEnv.VITE_FORCE = 'true';
  }

  log(`Starting asset-editor Vite on port ${editorPort} with claim-storage asset URL ${workerBase}`);

  const viteStartedAt = Date.now();
  const vite = spawnManaged(
    registry,
    'npm',
    ['run', 'dev:web', ...(force ? ['--', '--force'] : [])],
    path.join(ROOT, 'packages/asset-editor'),
    'editor-vite',
    editorEnv
  );
  vite.once('spawn', () => {
    log(`Editor Vite process spawned after ${formatDurationMs(Date.now() - viteStartedAt)}.`);
    log(`Editor full-stack bootstrap reached Vite spawn in ${formatDurationMs(Date.now() - startedAt)}.`);
  });

  await new Promise<void>((resolve) => {
    vite.on('exit', () => resolve());
  });

  log(`Editor full-stack process completed after ${formatDurationMs(Date.now() - startedAt)}.`);
  killManagedProcesses(registry);
}

main().catch((error) => {
  console.error('[dev:editor] Fatal:', error);
  killManagedProcesses(registry);
  process.exit(1);
});
