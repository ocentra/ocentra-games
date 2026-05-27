#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { createManagedProcessRegistry, ensureLocalCloudflareWorker, killManagedProcesses, spawnManaged, ROOT } from './cloudflare-dev-bootstrap';
import { ensureTurboDevPrep } from './turbo-dev-prep';
import { ensurePortFree } from './port-utils';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { OpenApiServer } from '@ocentra/endpoint-domain/constants/openapi';
import { applyLocalWorkerEnv } from './dev-port-config';

function hasFlag(flag: string): boolean {
  return process.argv.slice(2).includes(flag);
}

type RemoteAssetSyncEnv = 'development' | 'production';

function log(message: string): void {
  console.log(`[preview] ${message}`);
}

function applyDotenvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const parsed = dotenv.parse(fs.readFileSync(filePath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    const existing = process.env[key];
    if (existing === undefined || String(existing).trim().length === 0) {
      process.env[key] = value;
    }
  }
}

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, '');
}

function stripKnownAssetPath(value: string): string {
  const normalized = normalizeUrl(value);
  if (!normalized) return value;
  const suffixes = [
    ApiEndpoint.Assets.List,
    ApiEndpoint.Assets.Base,
  ].sort((a, b) => b.length - a.length);
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      return normalized.slice(0, -suffix.length);
    }
  }
  return normalized;
}

function isLocalWorkerUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.hostname === '127.0.0.1'
      || parsed.hostname === 'localhost'
      || parsed.hostname === '0.0.0.0'
      || parsed.hostname === '::1';
  } catch {
    return false;
  }
}

function firstEnvValue(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = normalizeUrl(process.env[key]);
    if (value) return value;
  }
  return undefined;
}

function parseRemoteAssetSyncEnv(): RemoteAssetSyncEnv | undefined {
  const raw = process.argv
    .slice(2)
    .find((arg) => arg.startsWith('--sync-assets='))
    ?.slice('--sync-assets='.length);
  if (raw === 'development' || raw === 'production') {
    return raw;
  }
  if (raw) {
    throw new Error(`Invalid --sync-assets value: ${raw}`);
  }
  return undefined;
}

function parseNumberArg(name: string, fallback: number): number {
  const raw = process.argv
    .slice(2)
    .find((arg) => arg.startsWith(`${name}=`))
    ?.slice(name.length + 1);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${name} value: ${raw}`);
  }
  return value;
}

function parseStringArg(name: string): string | undefined {
  return process.argv
    .slice(2)
    .find((arg) => arg.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function resolvePagesCompatibilityDate(): string {
  return process.env.CLOUDFLARE_PAGES_COMPATIBILITY_DATE?.trim()
    || process.env.PAGES_COMPATIBILITY_DATE?.trim()
    || '2026-05-07';
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTextWithTimeout(url: string, timeoutMs: number): Promise<{ status: number; text: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    return {
      status: response.status,
      text: await response.text(),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function assertAppShell(pathname: string, status: number, text: string): void {
  if (status !== 200) {
    throw new Error(`${pathname} returned HTTP ${status}`);
  }
  if (text.length <= 1000) {
    throw new Error(`${pathname} returned an empty or tiny HTML shell (${text.length} bytes)`);
  }
  if (!text.includes('<div id="root"')) {
    throw new Error(`${pathname} did not include #root`);
  }
}

async function smokePagesPreview(port: number, timeoutMs: number): Promise<void> {
  const baseUrl = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + timeoutMs;
  const paths = ['/', '/index.html'];
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      for (const pathname of paths) {
        const url = `${baseUrl}${pathname}`;
        const { status, text } = await fetchTextWithTimeout(url, 3000);
        log(`Smoke ${pathname}: status=${status} bytes=${text.length}`);
        assertAppShell(pathname, status, text);
      }
      return;
    } catch (error) {
      lastError = error;
      await delay(1000);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Pages preview smoke failed after ${timeoutMs}ms`);
}

async function runPagesRouteMatrix(port: number): Promise<void> {
  const baseUrl = `http://127.0.0.1:${port}`;
  const args = ['tsx', 'scripts/dev/pages-route-matrix.ts', `--base=${baseUrl}`, '--cache-check'];
  const compareBase = parseStringArg('--compare-base') ?? process.env.PAGES_ROUTE_MATRIX_COMPARE_BASE;
  if (compareBase?.trim()) {
    process.env.PAGES_ROUTE_MATRIX_COMPARE_BASE = compareBase.trim();
    args.push(`--compare-base=${compareBase.trim()}`);
  }
  log(`Running Pages route matrix for ${baseUrl}${compareBase ? ` against ${compareBase}` : ''}...`);
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('npx', args, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32',
      env: process.env,
    });
    proc.on('error', reject);
    proc.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`Pages route matrix failed with ${signal ? `signal ${signal}` : `exit code ${code ?? 'unknown'}`}`));
    });
  });
}

function resolveRemoteWorkerUrl(syncEnv: RemoteAssetSyncEnv): string {
  const configured = syncEnv === 'development'
    ? firstEnvValue([
      'CLAIM_STORAGE_WORKER_URL_DEV',
      'CLAIM_STORAGE_ASSETS_URL_DEV',
      'ASSETS_WORKER_URL_DEV',
      'VITE_CLAIM_STORAGE_URL_DEV',
      'VITE_ASSETS_WORKER_URL_DEV',
      'VITE_MAIN_DEV_CLAIM_STORAGE_URL',
      'VITE_MAIN_DEV_ASSETS_WORKER_URL',
    ])
    : firstEnvValue([
      'CLAIM_STORAGE_WORKER_URL_PROD',
      'CLAIM_STORAGE_ASSETS_URL_PROD',
      'ASSETS_WORKER_URL_PROD',
      'VITE_CLAIM_STORAGE_URL_PROD',
      'VITE_ASSETS_WORKER_URL_PROD',
      'VITE_MAIN_PROD_CLAIM_STORAGE_URL',
      'VITE_MAIN_PROD_ASSETS_WORKER_URL',
    ]);
  const url = stripKnownAssetPath(
    configured ?? (syncEnv === 'development' ? OpenApiServer.Development : OpenApiServer.Production)
  );

  if (!url) {
    throw new Error(`Missing ${syncEnv} worker URL for Cloudflare Pages parity preview.`);
  }
  if (isLocalWorkerUrl(url)) {
    throw new Error(`Refusing to use local URL for ${syncEnv} Cloudflare Pages parity preview: ${url}`);
  }
  return url;
}

function setDefaultEnv(name: string, value: string): void {
  if (!process.env[name]?.trim()) {
    process.env[name] = value;
  }
}

function configureLocalWorkerBuildEnv(workerBase: string): void {
  const normalizedWorkerBase = workerBase.replace(/\/$/, '');
  applyLocalWorkerEnv(process.env);
  process.env.VITE_CLAIM_STORAGE_URL = workerBase;
  process.env.VITE_R2_WORKER_URL = workerBase;
  process.env.VITE_ASSETS_WORKER_URL = workerBase;
  process.env.VITE_ASSETS_PUBLIC_URL = `${normalizedWorkerBase}${ApiEndpoint.Assets.Base}`;
  process.env.VITE_MAIN_LOCAL_CLAIM_STORAGE_URL = workerBase;
  process.env.VITE_MAIN_LOCAL_WORKER_URL = workerBase;
  process.env.VITE_MAIN_LOCAL_ASSETS_PUBLIC_URL = `${normalizedWorkerBase}${ApiEndpoint.Assets.Base}`;
  process.env.VITE_MAIN_REAL_CLAIM_STORAGE_URL = workerBase;
  process.env.VITE_MAIN_REAL_ASSETS_PUBLIC_URL = `${normalizedWorkerBase}${ApiEndpoint.Assets.Base}`;
  process.env.VITE_MAIN_ASSET_TARGET_FORCE = 'local-dev';
}

function configureRemoteBuildEnv(syncEnv: RemoteAssetSyncEnv): void {
  const workerUrl = resolveRemoteWorkerUrl(syncEnv);
  const assetsListUrl = `${workerUrl}${ApiEndpoint.Assets.List}`;
  process.env.VITE_CLAIM_STORAGE_URL = workerUrl;
  process.env.VITE_R2_WORKER_URL = workerUrl;
  process.env.VITE_ASSETS_WORKER_URL = workerUrl;
  process.env.VITE_ASSETS_PUBLIC_URL = `${workerUrl}${ApiEndpoint.Assets.Base}`;
  process.env.VITE_MAIN_REAL_CLAIM_STORAGE_URL = workerUrl;
  process.env.VITE_MAIN_REAL_ASSETS_PUBLIC_URL = `${workerUrl}${ApiEndpoint.Assets.Base}`;
  process.env.VITE_MAIN_ASSET_TARGET_DEFAULT = 'real-cloud';
  process.env.VITE_MAIN_ASSET_TARGET_FORCE = 'real-cloud';
  if (syncEnv === 'development') {
    setDefaultEnv('CLAIM_STORAGE_WORKER_URL_DEV', workerUrl);
    setDefaultEnv('CLAIM_STORAGE_ASSETS_URL_DEV', assetsListUrl);
    setDefaultEnv('ASSETS_WORKER_URL_DEV', assetsListUrl);
  } else {
    setDefaultEnv('CLAIM_STORAGE_WORKER_URL_PROD', workerUrl);
    setDefaultEnv('CLAIM_STORAGE_ASSETS_URL_PROD', assetsListUrl);
    setDefaultEnv('ASSETS_WORKER_URL_PROD', assetsListUrl);
  }
  log(`Using ${syncEnv} Cloudflare asset worker: ${workerUrl}`);
}

function syncRemoteAssets(syncEnv: RemoteAssetSyncEnv): void {
  const script = syncEnv === 'development' ? 'sync:assets:dev' : 'sync:assets:prod';
  log(`Syncing assets to Cloudflare ${syncEnv} R2...`);
  execSync(`npm run ${script} -- --apply --prune`, {
    cwd: ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      SYNC_ENV: syncEnv,
    },
  });
}

function isLikelyOurs(occupant: { name: string; commandLine: string }): boolean {
  const name = occupant.name.toLowerCase();
  const cmd = occupant.commandLine.toLowerCase();
  return (
    name.includes('node') ||
    name.includes('vite') ||
    name.includes('wrangler') ||
    name.includes('workerd') ||
    cmd.includes('vite') ||
    cmd.includes('wrangler') ||
    cmd.includes('workerd') ||
    cmd.includes('tsx') ||
    cmd.includes('node')
  );
}

async function main(): Promise<void> {
  const registry = createManagedProcessRegistry();
  const shutdown = () => {
    killManagedProcesses(registry);
    process.exit(0);
  };

  applyDotenvFile(path.join(ROOT, '.env'));
  applyDotenvFile(path.join(ROOT, '.env.local'));
  applyDotenvFile(path.join(ROOT, 'infra', 'cloudflare', '.env'));
  applyDotenvFile(path.join(ROOT, 'infra', 'cloudflare', '.dev.vars'));

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  try {
    const pagesParity = hasFlag('--pages');
    const withWorker = hasFlag('--with-worker');
    const syncEnv = parseRemoteAssetSyncEnv();

    if (withWorker) {
      log('Preparing workspace dependencies with Turbo...');
      ensureTurboDevPrep('main', (message) => log(message));

      log('Starting local Cloudflare worker + seed...');
      const { workerBase } = await ensureLocalCloudflareWorker(registry, (message) => log(message), {
        skipDependencyPrep: true,
        waitForAssetSeed: pagesParity,
        requireAssetVerify: pagesParity,
      });
      configureLocalWorkerBuildEnv(workerBase);
    }

    if (syncEnv) {
      configureRemoteBuildEnv(syncEnv);
      syncRemoteAssets(syncEnv);
    }

    if (hasFlag('--skip-build')) {
      log('Skipping production build; using existing dist/.');
    } else {
      log('Running production build (vite build)...');
      execSync('npm run build', {
        cwd: ROOT,
        stdio: 'inherit',
        env: process.env,
      });
    }

    if (withWorker && pagesParity) {
      log('Rechecking local Cloudflare worker after production build...');
      const { workerBase } = await ensureLocalCloudflareWorker(registry, (message) => log(message), {
        skipDependencyPrep: true,
        waitForAssetSeed: true,
        requireAssetVerify: true,
      });
      configureLocalWorkerBuildEnv(workerBase);
    }

    const portRaw = pagesParity
      ? process.env.PAGES_PREVIEW_PORT || process.env.CF_PAGES_PREVIEW_PORT || process.env.PREVIEW_PORT || '4173'
      : process.env.VITE_PREVIEW_PORT || process.env.PREVIEW_PORT || '4173';
    const port = parseInt(portRaw, 10);
    if (!Number.isFinite(port)) {
      throw new Error(`Invalid preview port: ${portRaw}`);
    }
    log(`Ensuring preview port ${port} is free...`);
    await ensurePortFree(port, isLikelyOurs, log, 8);
    const commandArgs = pagesParity
      ? [
        'wrangler',
        'pages',
        'dev',
        'dist',
        '--ip',
        '127.0.0.1',
        '--port',
        String(port),
        '--local-protocol',
        'http',
        '--compatibility-date',
        resolvePagesCompatibilityDate(),
      ]
      : ['vite', 'preview', '--port', String(port), '--strictPort'];
    log(`Starting ${pagesParity ? 'Cloudflare Pages parity preview' : 'Vite preview'} on port ${port}...`);
    const preview = spawnManaged(
      registry,
      'npx',
      commandArgs,
      ROOT,
      pagesParity ? 'pages-preview' : 'preview'
    );

    const routeMatrix = hasFlag('--route-matrix');
    if (hasFlag('--smoke') || routeMatrix) {
      const smokeTimeoutMs = parseNumberArg('--smoke-timeout-ms', 90_000);
      await smokePagesPreview(port, smokeTimeoutMs);
      log('Pages preview smoke passed.');
      if (routeMatrix) {
        const routeMatrixSettleMs = parseNumberArg('--route-matrix-settle-ms', 10_000);
        log(`Waiting ${routeMatrixSettleMs}ms before route matrix...`);
        await delay(routeMatrixSettleMs);
        await runPagesRouteMatrix(port);
        log('Pages route matrix passed.');
      }
      killManagedProcesses(registry);
      return;
    }

    await new Promise<void>((resolve) => {
      preview.on('exit', () => resolve());
    });
  } finally {
    killManagedProcesses(registry);
  }
}

main().catch((error) => {
  console.error('[preview] Fatal:', error);
  process.exit(1);
});

