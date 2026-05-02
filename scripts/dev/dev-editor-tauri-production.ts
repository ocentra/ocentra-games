#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const EDITOR_DIR = path.join(ROOT, 'packages', 'asset-editor');
const EDITOR_TARGET_DIR = path.join(EDITOR_DIR, 'src-tauri', 'target-editor');
const force = process.argv.includes('--force') || process.env.FORCE === 'true' || process.env.VITE_FORCE === 'true';

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
  console.log('[dev:editor:tauri:production] Starting editor Tauri (real Cloudflare backend)...');
  await killEditorAppIfRunning();

  const viteEnv = {
    ...process.env,
    VITE_EDITOR_SYNC_TARGET_DEFAULT: 'real-cloud',
  };

  const viteProc = spawn('npm', ['run', 'dev:raw', ...(force ? ['--', '--force'] : [])], {
    cwd: EDITOR_DIR,
    stdio: 'ignore',
    shell: process.platform === 'win32',
    env: viteEnv,
  });

  viteProc.on('error', (err) => {
    console.error('[dev:editor:tauri:production] Failed to start Vite:', err);
    process.exit(1);
  });

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const tauriProc = spawn('cargo', ['tauri', 'dev', '-c', 'src-tauri/tauri.dev-production.conf.json'], {
    cwd: EDITOR_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      CARGO_TARGET_DIR: EDITOR_TARGET_DIR,
    },
  });

  tauriProc.on('exit', (code) => {
    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /PID ${viteProc.pid} /F /T 2>nul`, { stdio: 'pipe' });
      } else if (viteProc.pid) {
        process.kill(-viteProc.pid, 'SIGTERM');
      }
    } catch {
      // ignore
    }
    process.exit(code ?? 0);
  });

  tauriProc.on('error', (err) => {
    console.error('[dev:editor:tauri:production] Tauri error:', err);
    try {
      if (viteProc.pid && process.platform === 'win32') {
        execSync(`taskkill /PID ${viteProc.pid} /F /T 2>nul`, { stdio: 'pipe' });
      }
    } catch {
      // ignore
    }
    process.exit(1);
  });
}

main().catch((err) => {
  console.error('[dev:editor:tauri:production] Fatal:', err);
  process.exit(1);
});
