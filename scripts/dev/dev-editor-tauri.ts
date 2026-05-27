#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyEditorWebEnv,
  applyLocalWorkerEnv,
  resolveEditorWebBaseUrl,
  resolveEditorWebPort,
  resolveWorkerPort,
} from './dev-port-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const EDITOR_DIR = path.join(ROOT, 'packages', 'asset-editor');
const EDITOR_TARGET_DIR = path.join(EDITOR_DIR, 'src-tauri', 'target-editor');
const EDITOR_TAURI_DIR = path.join(EDITOR_DIR, 'src-tauri');
const EDITOR_TAURI_CONFIG_PATH = path.join(EDITOR_TAURI_DIR, 'tauri.conf.json');

function formatDurationMs(ms: number): string {
  if (ms >= 60_000) {
    return `${(ms / 60_000).toFixed(2)}m`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
}

const EDITOR_TAURI_BIN_WIN = 'ocentraeditor.exe';
const EDITOR_TAURI_BIN_UNIX = 'ocentraeditor';

async function killEditorAppIfRunning(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /IM ${EDITOR_TAURI_BIN_WIN} /F 2>nul`, { stdio: 'pipe' });
    } else {
      execSync(`pkill -x ${EDITOR_TAURI_BIN_UNIX} || true`, { stdio: 'pipe' });
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  } catch {
    // ignore
  }
}

function createGeneratedTauriConfig(editorPort: number): string {
  const config = JSON.parse(readFileSync(EDITOR_TAURI_CONFIG_PATH, 'utf8')) as {
    build?: { devUrl?: string };
  };
  config.build = {
    ...(config.build ?? {}),
    devUrl: resolveEditorWebBaseUrl(editorPort),
  };
  const generatedDir = path.join(EDITOR_TAURI_DIR, '.generated');
  mkdirSync(generatedDir, { recursive: true });
  const generatedPath = path.join(generatedDir, `tauri.dev.${editorPort}.conf.json`);
  writeFileSync(generatedPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return path.relative(EDITOR_DIR, generatedPath).replace(/\\/g, '/');
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const editorPort = resolveEditorWebPort();
  const workerPort = resolveWorkerPort();
  const generatedConfigPath = createGeneratedTauriConfig(editorPort);
  const devEnv: Record<string, string> = {};
  applyEditorWebEnv(devEnv, editorPort);
  applyLocalWorkerEnv(devEnv, workerPort);
  console.log('[dev:editor:tauri] Starting editor Tauri launcher...');
  console.log(`[dev:editor:tauri] Using editor port ${editorPort} and worker port ${workerPort}.`);

  const killStartedAt = Date.now();
  await killEditorAppIfRunning();
  console.log(
    `[dev:editor:tauri] Stale editor process cleanup completed in ${formatDurationMs(Date.now() - killStartedAt)}.`
  );

  const proc = spawn('cargo', ['tauri', 'dev', '-c', generatedConfigPath], {
    cwd: EDITOR_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ...devEnv,
      CARGO_TARGET_DIR: EDITOR_TARGET_DIR,
    },
  });

  proc.once('spawn', () => {
    console.log(
      `[dev:editor:tauri] cargo tauri dev spawned after ${formatDurationMs(Date.now() - startedAt)}.`
    );
  });
  proc.on('exit', (code) => {
    console.log(
      `[dev:editor:tauri] cargo tauri dev exited after ${formatDurationMs(Date.now() - startedAt)}.`
    );
    process.exit(code ?? 0);
  });
  proc.on('error', (error) => {
    console.error(`[dev:editor:tauri] Fatal: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}

main().catch((error) => {
  console.error(`[dev:editor:tauri] Fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
