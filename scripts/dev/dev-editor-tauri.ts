#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const EDITOR_DIR = path.join(ROOT, 'packages', 'asset-editor');
const EDITOR_TARGET_DIR = path.join(EDITOR_DIR, 'src-tauri', 'target-editor');

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

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log('[dev:editor:tauri] Starting editor Tauri launcher...');

  const killStartedAt = Date.now();
  await killEditorAppIfRunning();
  console.log(
    `[dev:editor:tauri] Stale editor process cleanup completed in ${formatDurationMs(Date.now() - killStartedAt)}.`
  );

  const proc = spawn('cargo', ['tauri', 'dev'], {
    cwd: EDITOR_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
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
