#!/usr/bin/env node

import { spawn } from 'node:child_process';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyEditorWebEnv,
  applyLocalWorkerEnv,
  resolveEditorWebPort,
  resolveWorkerPort,
} from './dev-port-config';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const editorDir = path.join(root, 'packages/asset-editor');

function waitForPort(port: number, maxWaitMs = 90_000): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = (): void => {
      const req = http.request({ hostname: '127.0.0.1', port, path: '/', method: 'HEAD' }, () => resolve());
      req.on('error', () => {
        if (Date.now() - start > maxWaitMs) {
          reject(new Error(`Port ${port} not ready after ${maxWaitMs}ms`));
          return;
        }
        setTimeout(check, 800);
      });
      req.end();
    };
    check();
  });
}

async function main(): Promise<void> {
  const workerPort = resolveWorkerPort();
  const editorPort = resolveEditorWebPort();
  const workerEnv = { ...process.env };
  const editorEnv = { ...process.env, VITE_E2E_BYPASS_AUTH: 'true' };

  applyLocalWorkerEnv(workerEnv, workerPort);
  applyEditorWebEnv(editorEnv, editorPort);

  console.log(`[start-editor-e2e-full] Starting local worker on ${workerPort}...`);
  const worker = spawn('npx', ['tsx', 'scripts/dev/dev-worker.ts', '--worker-port', String(workerPort)], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
    env: workerEnv,
  });

  try {
    await waitForPort(workerPort);
  } catch (error) {
    worker.kill('SIGTERM');
    throw error;
  }

  console.log(`[start-editor-e2e-full] Starting editor on ${editorPort}...`);
  const vite = spawn('npx', ['vite', '--port', String(editorPort)], {
    cwd: editorDir,
    stdio: 'inherit',
    shell: true,
    env: editorEnv,
  });

  const cleanup = (): void => {
    try {
      worker.kill('SIGTERM');
    } catch (_) {
      void _;
    }
    try {
      vite.kill('SIGTERM');
    } catch (_) {
      void _;
    }
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  vite.on('exit', (code) => {
    cleanup();
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error('[start-editor-e2e-full]', error);
  process.exit(1);
});
