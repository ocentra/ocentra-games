#!/usr/bin/env node

import {
  ROOT,
  createManagedProcessRegistry,
  killManagedProcesses,
  spawnManaged,
} from './cloudflare-dev-bootstrap';
import { LocalWebConfig, createLocalHttpBaseUrl } from '@ocentra/endpoint-domain/constants/local';
import { resolveMainWebPort, resolveWorkerPort } from './dev-port-config';

type CompareTarget = 'web' | 'tauri' | 'android' | 'ios';

const registry = createManagedProcessRegistry();

function log(message: string): void {
  console.log(`[dev:compare] ${message}`);
}

function parseTargets(): CompareTarget[] {
  const targetArg = process.argv.find((arg) => arg.startsWith('--targets='));
  const requested = targetArg?.split('=')[1]?.split(',').map((value) => value.trim().toLowerCase()) ?? [];
  const targets = requested.filter(
    (value): value is CompareTarget =>
      value === 'web' || value === 'tauri' || value === 'android' || value === 'ios'
  );

  if (targets.length === 0) {
    return ['web', 'tauri', 'android'];
  }

  return Array.from(new Set(targets));
}

async function waitForUrl(url: string, timeoutMs: number): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      await response.text().catch(() => undefined);
      if (response.ok) {
        return;
      }
    } catch {
      void 0;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for ${url} after ${timeoutMs}ms`);
}

process.on('SIGINT', () => {
  log('Shutting down shared compare stack...');
  killManagedProcesses(registry);
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Shutting down shared compare stack...');
  killManagedProcesses(registry);
  process.exit(0);
});

async function main(): Promise<void> {
  const targets = parseTargets();
  const androidHost = process.argv.find((arg) => arg.startsWith('--android-host='))?.split('=')[1] || '10.0.2.2';
  const iosHost = process.argv.find((arg) => arg.startsWith('--ios-host='))?.split('=')[1] || 'localhost';
  const webPort = resolveMainWebPort();
  const workerPort = resolveWorkerPort();
  const webBaseUrl = createLocalHttpBaseUrl(LocalWebConfig.Host, webPort);

  log(`Starting shared web stack for ${targets.join(', ')}...`);
  spawnManaged(registry, 'npx', ['tsx', 'scripts/dev/dev-full.ts'], ROOT, 'compare-main', {
    VITE_HOST: '0.0.0.0',
    PORT: String(webPort),
    VITE_PORT: String(webPort),
    WORKER_PORT: String(workerPort),
    VITE_LOCAL_WORKER_PORT: String(workerPort),
    VITE_MAIN_ASSET_TARGET_FORCE: 'local-dev',
  });

  await waitForUrl(webBaseUrl, 180000);
  log(`Shared dev server is ready on ${webBaseUrl}`);

  if (targets.includes('tauri')) {
    log('Attaching desktop Tauri shell to shared dev server...');
    spawnManaged(
      registry,
      'npx',
      ['tauri', 'dev', '-c', 'platforms/desktop/tauri/tauri.dev-shared.conf.json'],
      ROOT,
      'compare-tauri',
      {
        BROWSER: 'none',
        VITE_MAIN_ASSET_TARGET_FORCE: 'local-dev',
      }
    );
  }

  if (targets.includes('android')) {
    log(`Launching Android live reload against ${androidHost}:${webPort}...`);
    spawnManaged(
      registry,
      'npx',
      [
        'cap',
        'run',
        'android',
        '--live-reload',
        '--host',
        androidHost,
        '--port',
        String(webPort),
        '--forwardPorts',
        `${webPort}:${webPort}`,
        '--forwardPorts',
        `${workerPort}:${workerPort}`,
      ],
      ROOT,
      'compare-android',
      {
        VITE_MAIN_ASSET_TARGET_FORCE: 'local-dev',
      }
    );
  }

  if (targets.includes('ios')) {
    log(`Launching iOS live reload against ${iosHost}:${webPort}...`);
    spawnManaged(
      registry,
      'npx',
      ['cap', 'run', 'ios', '--live-reload', '--host', iosHost, '--port', String(webPort)],
      ROOT,
      'compare-ios',
      {
        VITE_MAIN_ASSET_TARGET_FORCE: 'local-dev',
      }
    );
  }

  log(`Web shell is available at ${webBaseUrl}`);
  await new Promise(() => undefined);
}

main().catch((error) => {
  console.error('[dev:compare] Fatal:', error);
  killManagedProcesses(registry);
  process.exit(1);
});
