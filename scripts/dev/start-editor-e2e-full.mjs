#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const cloudflareDir = path.join(root, 'infra/cloudflare');
const editorDir = path.join(root, 'packages/asset-editor');

function waitForPort(port, maxWaitMs = 90000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      const req = http.request(
        { hostname: '127.0.0.1', port, path: '/', method: 'HEAD' },
        () => resolve()
      );
      req.on('error', () => {
        if (Date.now() - start > maxWaitMs) reject(new Error(`Port ${port} not ready after ${maxWaitMs}ms`));
        else setTimeout(check, 800);
      });
      req.end();
    };
    check();
  });
}

async function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      stdio: opts.silent ? 'pipe' : 'inherit',
      shell: true,
      cwd: opts.cwd || root,
      env: { ...process.env, ...opts.env },
    });
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`Exit ${code}`))));
  });
}

async function main() {
  console.log('[start-editor-e2e-full] Seeding local R2...');
  await run('npm', ['run', 'seed:assets:local'], { cwd: cloudflareDir });

  console.log('[start-editor-e2e-full] Starting claim-storage on 8787...');
  const wrangler = spawn('npx', ['wrangler', 'dev', '--env', 'development'], {
    cwd: cloudflareDir,
    stdio: 'inherit',
    shell: true,
  });

  try {
    await waitForPort(8787);
  } catch (e) {
    wrangler.kill('SIGTERM');
    throw e;
  }

  console.log('[start-editor-e2e-full] Starting editor on 5175...');
  const vite = spawn('npx', ['vite', '--port', '5175'], {
    cwd: editorDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_E2E_BYPASS_AUTH: 'true' },
  });

  const cleanup = () => {
    try {
      wrangler.kill('SIGTERM');
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

main().catch((err) => {
  console.error('[start-editor-e2e-full]', err);
  process.exit(1);
});
