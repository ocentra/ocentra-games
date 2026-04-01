#!/usr/bin/env node

import {
  ROOT,
  createManagedProcessRegistry,
  ensureLocalCloudflareWorker,
  killManagedProcesses,
  spawnManaged,
} from './cloudflare-dev-bootstrap';
import { ensureTurboDevPrep } from './turbo-dev-prep';

const registry = createManagedProcessRegistry();

function log(message: string): void {
  console.log(`[dev:full] ${message}`);
}

function createTimer() {
  const startedAt = performance.now();
  return {
    sinceStart(): string {
      return `${(performance.now() - startedAt).toFixed(1)}ms`;
    },
    measure<T>(label: string, fn: () => Promise<T> | T): Promise<T> | T {
      const phaseStart = performance.now();
      const finish = () => log(`${label} completed in ${(performance.now() - phaseStart).toFixed(1)}ms (total ${this.sinceStart()})`);
      const fail = (error: unknown) => {
        log(`${label} failed after ${(performance.now() - phaseStart).toFixed(1)}ms (total ${this.sinceStart()})`);
        throw error;
      };
      try {
        const result = fn();
        if (result && typeof (result as Promise<T>).then === 'function') {
          return (result as Promise<T>).then((value) => {
            finish();
            return value;
          }).catch(fail);
        }
        finish();
        return result;
      } catch (error) {
        return fail(error);
      }
    },
  };
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
  const timer = createTimer();
  log('Starting full-stack dev environment...');

  ensureTurboDevPrep('main', (message) => log(message));
  log(`Turbo dependency prep completed (total ${timer.sinceStart()})`);

  const { workerBase } = await timer.measure('Worker bootstrap', () => ensureLocalCloudflareWorker(registry, log, {
    skipDependencyPrep: true,
  })) as Awaited<ReturnType<typeof ensureLocalCloudflareWorker>>;

  const viteClaimStorageUrl = process.env.VITE_CLAIM_STORAGE_URL || process.env.VITE_ASSETS_WORKER_URL || workerBase;
  const viteAssetsPublicUrl =
    process.env.VITE_ASSETS_PUBLIC_URL || `${viteClaimStorageUrl.replace(/\/$/, '')}/api/v1/assets`;

  log(`Starting Vite with claim-storage asset URL ${viteClaimStorageUrl}`);
  log(`Using assets public URL ${viteAssetsPublicUrl}`);

  const vite = timer.measure('Vite bootstrap spawn', () => spawnManaged(
    registry,
    'npx',
    ['tsx', 'scripts/dev/dev.ts'],
    ROOT,
    'vite',
    {
      VITE_CLAIM_STORAGE_URL: viteClaimStorageUrl,
      VITE_ASSETS_WORKER_URL: viteClaimStorageUrl,
      VITE_ASSETS_PUBLIC_URL: viteAssetsPublicUrl,
      VITE_MAIN_ASSET_TARGET_FORCE: 'local-dev',
    }
  )) as ReturnType<typeof spawnManaged>;

  await new Promise<void>((resolve) => {
    vite.on('exit', () => resolve());
  });

  killManagedProcesses(registry);
}

main().catch((error) => {
  console.error('[dev:full] Fatal:', error);
  killManagedProcesses(registry);
  process.exit(1);
});
