#!/usr/bin/env node

import {
  GAME_WORKER_PORT,
  ROOT,
  createManagedProcessRegistry,
  ensureLocalCloudflareWorker,
  killManagedProcesses,
  spawnManaged,
} from './cloudflare-dev-bootstrap';
import { ensureTurboDevPrep } from './turbo-dev-prep';
import { applyLocalWorkerEnv } from './dev-port-config';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';

type MobileTarget = 'android' | 'ios';

const registry = createManagedProcessRegistry();

function log(message: string): void {
  console.log(`[dev:mobile] ${message}`);
}

function resolveTarget(): MobileTarget {
  const targetArg = process.argv.find((arg) => arg.startsWith('--target='));
  const rawTarget = targetArg?.split('=')[1];
  if (rawTarget === 'ios') {
    return 'ios';
  }
  return 'android';
}

function resolveAndroidMode(): 'studio' | 'emulator' {
  const modeArg = process.argv.find((arg) => arg.startsWith('--android-mode='));
  const raw = modeArg?.split('=')[1];
  return raw === 'emulator' ? 'emulator' : 'studio';
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
  const target = resolveTarget();
  log(`Starting mobile dev environment for ${target}...`);

  ensureTurboDevPrep('main', (message) => log(message));

  const { workerBase } = await ensureLocalCloudflareWorker(registry, log);
  const mobileWorkerBase = target === 'android' ? `http://10.0.2.2:${GAME_WORKER_PORT}` : workerBase;
  const mobileAssetsPublicUrl = `${mobileWorkerBase.replace(/\/$/, '')}${ApiEndpoint.Assets.Base}`;
  const mobileEnv: Record<string, string> = {};
  applyLocalWorkerEnv(mobileEnv);
  mobileEnv.VITE_CLAIM_STORAGE_URL = mobileWorkerBase;
  mobileEnv.VITE_R2_WORKER_URL = mobileWorkerBase;
  mobileEnv.VITE_ASSETS_WORKER_URL = mobileWorkerBase;
  mobileEnv.VITE_ASSETS_PUBLIC_URL = mobileAssetsPublicUrl;
  mobileEnv.VITE_MAIN_LOCAL_CLAIM_STORAGE_URL = mobileWorkerBase;
  mobileEnv.VITE_MAIN_LOCAL_WORKER_URL = mobileWorkerBase;
  mobileEnv.VITE_MAIN_LOCAL_ASSETS_PUBLIC_URL = mobileAssetsPublicUrl;

  log(`Using worker URL ${mobileWorkerBase}`);
  log(`Using assets public URL ${mobileAssetsPublicUrl}`);

  const androidMode = target === 'android' ? resolveAndroidMode() : null;
  const capScript =
    target === 'android'
      ? androidMode === 'emulator'
        ? 'run:android'
        : 'cap:android'
      : target === 'ios'
        ? 'cap:ios'
        : 'cap:android';
  const command = ['run', capScript];
  const proc = spawnManaged(registry, 'npm', command, ROOT, `cap-${target}`, mobileEnv);

  await new Promise<void>((resolve) => {
    proc.on('exit', () => resolve());
  });

  killManagedProcesses(registry);
}

main().catch((error) => {
  console.error('[dev:mobile] Fatal:', error);
  killManagedProcesses(registry);
  process.exit(1);
});
