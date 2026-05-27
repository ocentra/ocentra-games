#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyEditorWebEnv,
  resolveEditorWebBaseUrl,
  resolveEditorWebPort,
} from './dev-port-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const EDITOR_DIR = path.join(ROOT, 'packages', 'asset-editor');
const EDITOR_TARGET_DIR = path.join(EDITOR_DIR, 'src-tauri', 'target-editor');
const EDITOR_TAURI_DIR = path.join(EDITOR_DIR, 'src-tauri');
const PRODUCTION_TAURI_CONFIG_PATH = path.join(EDITOR_TAURI_DIR, 'tauri.dev-production.conf.json');
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

function createGeneratedTauriConfig(editorPort: number): string {
  const config = JSON.parse(readFileSync(PRODUCTION_TAURI_CONFIG_PATH, 'utf8')) as {
    build?: { devUrl?: string; beforeDevCommand?: string };
  };
  const devUrl = resolveEditorWebBaseUrl(editorPort);
  config.build = {
    ...(config.build ?? {}),
    devUrl,
    beforeDevCommand: `npx tsx ../../scripts/dev/wait-for-dev-server.ts --url=${devUrl}`,
  };
  const generatedDir = path.join(EDITOR_TAURI_DIR, '.generated');
  mkdirSync(generatedDir, { recursive: true });
  const generatedPath = path.join(generatedDir, `tauri.dev-production.${editorPort}.conf.json`);
  writeFileSync(generatedPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  return path.relative(EDITOR_DIR, generatedPath).replace(/\\/g, '/');
}

async function main(): Promise<void> {
  const editorPort = resolveEditorWebPort();
  const generatedConfigPath = createGeneratedTauriConfig(editorPort);
  const editorEnv: Record<string, string> = {};
  applyEditorWebEnv(editorEnv, editorPort);
  console.log('[dev:editor:tauri:production] Starting editor Tauri (real Cloudflare backend)...');
  console.log(`[dev:editor:tauri:production] Using editor port ${editorPort}.`);
  await killEditorAppIfRunning();

  const viteEnv = {
    ...process.env,
    ...editorEnv,
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

  const tauriProc = spawn('cargo', ['tauri', 'dev', '-c', generatedConfigPath], {
    cwd: EDITOR_DIR,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      ...editorEnv,
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
