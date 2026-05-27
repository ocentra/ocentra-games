#!/usr/bin/env node

import { spawn, execFileSync, execSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';
import { ensurePortFree, getPortOccupants } from './port-utils';
import type { PortOccupant } from './port-utils';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { CloudflareLocalConfig } from '@ocentra/endpoint-domain/constants/local';
import { resolveWorkerBaseUrl, resolveWorkerPort } from './dev-port-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '../..');
export const GAME_WORKER_DIR = path.join(ROOT, 'infra/cloudflare');
const WRANGLER_ENTRYPOINT = path.join(ROOT, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const NODE_EXECUTABLE = process.platform === 'win32' ? 'node' : process.execPath;
export const GAME_WORKER_PORT = resolveWorkerPort();
export const GAME_WORKER_HOST = CloudflareLocalConfig.Host;
export const GAME_WORKER_BASE = resolveWorkerBaseUrl(GAME_WORKER_PORT);
export const STARTUP_TIMEOUT_MS = 300_000;
const HEALTH_FETCH_TIMEOUT_MS = 2500;

const PRODUCT_SEED_CACHE_FILE = path.join(GAME_WORKER_DIR, '.dev-seed-hash');
const ASSET_SEED_CACHE_FILE = path.join(GAME_WORKER_DIR, '.wrangler', 'seed-assets-local-cache.json');
const ASSET_SEED_REPORT_FILE = path.join(GAME_WORKER_DIR, '.wrangler', 'seed-assets-local-report.json');
const WORKER_DEV_VARS_FILE = path.join(GAME_WORKER_DIR, '.dev.vars');
const GENERATED_DEV_ENV_FILE = path.join(GAME_WORKER_DIR, '.wrangler', 'dev-firebase.env');
const PRODUCT_SEED_SOURCE_FILES = [
  path.join(GAME_WORKER_DIR, 'scripts/seed-products-local.ts'),
  path.join(GAME_WORKER_DIR, 'src/config/dev-seed-products.ts'),
  path.join(GAME_WORKER_DIR, 'src/data/ai-catalog.ts'),
] as const;
const ASSET_SEED_CRITICAL_KEYS = [
  'catalog/index.json',
  'GameCatalog/index.json',
  'Pages/HomePageLayout.asset',
] as const;

type AssetSeedCacheRecord = {
  filesHash?: string;
  fileHashes?: Record<string, string>;
  fileRecords?: Record<string, unknown>;
};

type AssetSeedReport = {
  filesHash?: string;
  files?: number;
  mode?: string;
};

const isWindows = process.platform === 'win32';
const ANSI_ESCAPE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

export type ManagedProcessRegistry = {
  processes: ChildProcess[];
};

type EnsureLocalCloudflareWorkerOptions = {
  skipDependencyPrep?: boolean;
  waitForAssetSeed?: boolean;
  requireAssetVerify?: boolean;
};

export function createManagedProcessRegistry(): ManagedProcessRegistry {
  return { processes: [] };
}

class LogDeduplicator {
  private lastNormalized = '';
  private repeatCount = 0;
  private lastFlushTime = Date.now();
  private readonly flushThresholdMs = 10000;

  private label: string;

  constructor(label: string) {
    this.label = label;
  }

  private normalize(line: string): string {

    return line
      .replace(ANSI_ESCAPE_PATTERN, '')
      .replace(/\[\d{4}-\d{2}-\d{2}\]\[\d{2}:\d{2}:\d{2}\]/g, '[TIMESTAMP]')
      .replace(/\(\d+ms\)/g, '(DURATION)')
      .replace(/\d+\.\d+s/g, 'DURATION')
      .trim();
  }

  public handleLine(line: string): void {
    const normalized = this.normalize(line);

    if (normalized === this.lastNormalized && normalized !== '') {
      this.repeatCount++;
      if (Date.now() - this.lastFlushTime > this.flushThresholdMs) {
        this.flush();
      }
    } else {
      this.flush();
      process.stdout.write(`[${this.label}] ${line}\n`);
      this.lastNormalized = normalized;
      this.repeatCount = 0;
      this.lastFlushTime = Date.now();
    }
  }

  public flush(): void {
    if (this.repeatCount > 0) {
      process.stdout.write(`[${this.label}] (repeated ${this.repeatCount}x)\n`);
      this.repeatCount = 0;
      this.lastFlushTime = Date.now();
    }
  }
}

export function spawnManaged(
  registry: ManagedProcessRegistry,
  command: string,
  args: string[],
  cwd: string,
  label: string,
  envOverrides: Record<string, string> = {}
): ChildProcess {
  const proc = spawn(command, args, {
    cwd,
    stdio: 'pipe',
    shell: isWindows,
    detached: !isWindows,
    env: { ...process.env, ...envOverrides },
  });

  const outDeduplicator = new LogDeduplicator(label);
  const errDeduplicator = new LogDeduplicator(`${label}:err`);

  if (proc.stdout) {
    const rlOut = readline.createInterface({ input: proc.stdout, terminal: false });
    rlOut.on('line', (line) => outDeduplicator.handleLine(line));
  }

  if (proc.stderr) {
    const rlErr = readline.createInterface({ input: proc.stderr, terminal: false });
    rlErr.on('line', (line) => errDeduplicator.handleLine(line));
  }

  proc.on('exit', (code) => {
    outDeduplicator.flush();
    errDeduplicator.flush();
    if (code && code !== 0) {
      console.log(`[${label}] exited with code ${code}`);
    }
  });

  registry.processes.push(proc);
  return proc;
}

export function killManagedProcesses(registry: ManagedProcessRegistry): void {
  for (const proc of registry.processes) {
    proc.stdout?.destroy();
    proc.stderr?.destroy();
    proc.stdin?.destroy();

    try {
      if (isWindows && proc.pid) {
        execSync(`taskkill /PID ${proc.pid} /T /F`, { stdio: 'ignore' });
      } else if (proc.pid) {
        try {
          process.kill(-proc.pid, 'SIGTERM');
        } catch {
          proc.kill('SIGTERM');
        }
      } else {
        proc.kill('SIGTERM');
      }
    } catch {
      // ignore
    }

    proc.unref();
  }
}

function computeProductSeedHash(): string {
  const hash = createHash('sha256');
  for (const filePath of PRODUCT_SEED_SOURCE_FILES) {
    if (existsSync(filePath)) {
      hash.update(readFileSync(filePath, 'utf8'));
    }
  }
  return hash.digest('hex');
}

function formatDurationMs(ms: number): string {
  if (ms >= 60_000) {
    return `${(ms / 60_000).toFixed(2)}m`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
}

function parseEnvFile(filePath: string): Record<string, string> {
  if (!existsSync(filePath)) {
    return {};
  }

  const parsed: Record<string, string> = {};
  const raw = readFileSync(filePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key) {
      parsed[key] = value;
    }
  }
  return parsed;
}

function resolveWorkerFirebaseServiceAccountJson(): string | null {
  const localWorkerEnv = parseEnvFile(WORKER_DEV_VARS_FILE);
  const inlineJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() || localWorkerEnv.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (inlineJson) {
    return inlineJson;
  }

  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_PATH?.trim() || localWorkerEnv.FIREBASE_SERVICE_ACCOUNT_JSON_PATH?.trim();
  if (!serviceAccountPath) {
    return null;
  }

  const resolvedPath = path.resolve(serviceAccountPath);
  if (!existsSync(resolvedPath)) {
    throw new Error(`FIREBASE_SERVICE_ACCOUNT_JSON_PATH does not exist: ${resolvedPath}`);
  }

  return readFileSync(resolvedPath, 'utf8');
}

function writeGeneratedWorkerEnvFile(): string | null {
  const rawJson = resolveWorkerFirebaseServiceAccountJson();
  if (!rawJson) {
    return null;
  }

  const minifiedJson = JSON.stringify(JSON.parse(rawJson));
  mkdirSync(path.dirname(GENERATED_DEV_ENV_FILE), { recursive: true });
  writeFileSync(GENERATED_DEV_ENV_FILE, `FIREBASE_SERVICE_ACCOUNT_JSON=${minifiedJson}\n`, 'utf8');
  return GENERATED_DEV_ENV_FILE;
}

function isProductSeedCacheValid(): boolean {
  if (!existsSync(PRODUCT_SEED_CACHE_FILE)) {
    return false;
  }
  try {
    const stored = readFileSync(PRODUCT_SEED_CACHE_FILE, 'utf8').trim();
    return stored === computeProductSeedHash();
  } catch {
    return false;
  }
}

function writeProductSeedCache(): void {
  try {
    mkdirSync(path.dirname(PRODUCT_SEED_CACHE_FILE), { recursive: true });
    writeFileSync(PRODUCT_SEED_CACHE_FILE, computeProductSeedHash(), 'utf8');
  } catch {
    // non-fatal
  }
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ port, host: GAME_WORKER_HOST });
      socket.once('connect', () => {
        socket.destroy();
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Port ${port} not open after ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 500);
        }
      });
    };
    attempt();
  });
}

async function isPortOpen(port: number): Promise<boolean> {
  try {
    await waitForPort(port, 1500);
    return true;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, init: Parameters<typeof fetch>[1] = {}, timeoutMs = HEALTH_FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function waitForWorkerHealth(baseUrl: string, label: string, log: (message: string) => void): Promise<boolean> {
  const healthUrls = [`${baseUrl}/health`, `${baseUrl}/api/v1/health`];
  for (let attempt = 0; attempt < 15; attempt += 1) {
    for (const url of healthUrls) {
      try {
        const response = await fetchWithTimeout(url);
        await response.text().catch(() => undefined);
        if (response.ok) {
          log(`${label} ready via ${url}`);
          return true;
        }
      } catch {
        // retry
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  log(`${label} health check did not respond in time.`);
  return false;
}

async function isWorkerHealthy(baseUrl: string): Promise<boolean> {
  const healthUrls = [`${baseUrl}/health`, `${baseUrl}/api/v1/health`];
  for (const url of healthUrls) {
    try {
      const response = await fetchWithTimeout(url);
      await response.text().catch(() => undefined);
      if (response.ok) {
        return true;
      }
    } catch {
      // ignore
    }
  }
  return false;
}

function normalizeCommandValue(value: string): string {
  return value.toLowerCase().replace(/\\/g, '/');
}

function summarizePortOccupants(occupants: PortOccupant[]): string {
  return occupants.length > 0
    ? occupants.map((occupant) => `${occupant.name || 'unknown'}:${occupant.pid}`).join(', ')
    : 'unknown process';
}

function isWorkerProcess(occupant: PortOccupant): boolean {
  const lowerName = occupant.name.toLowerCase();
  const normalizedCommand = normalizeCommandValue(occupant.commandLine);

  return (
    lowerName.includes('wrangler') ||
    lowerName.includes('workerd') ||
    normalizedCommand.includes('wrangler') ||
    normalizedCommand.includes('workerd')
  );
}

function isCurrentWorkerOccupant(occupant: PortOccupant): boolean {
  const workerDir = normalizeCommandValue(GAME_WORKER_DIR);
  const rootDir = normalizeCommandValue(ROOT);
  const normalizedCommand = normalizeCommandValue(occupant.commandLine);
  return (
    isWorkerProcess(occupant) &&
    (normalizedCommand.includes(workerDir) || normalizedCommand.includes(rootDir))
  );
}

function isOcentraWorkerOccupant(occupant: PortOccupant): boolean {
  const normalizedCommand = normalizeCommandValue(occupant.commandLine);
  return (
    isWorkerProcess(occupant) &&
    (normalizedCommand.includes('infra/cloudflare') || normalizedCommand.includes('ocentra-games'))
  );
}

function runCommand(
  command: string,
  cwd: string,
  log: (message: string) => void,
  description: string,
  envOverrides: Record<string, string> = {}
): void {
  const startedAt = Date.now();
  log(description);
  execSync(command, {
    cwd,
    stdio: 'inherit',
    env: {
      ...process.env,
      ...envOverrides,
    },
  });
  log(`${description} completed in ${formatDurationMs(Date.now() - startedAt)}.`);
}

function seedAiCatalog(log: (message: string) => void): void {
  log('Seeding AI_CATALOG_KV...');
  try {
    const outFile = path.join(GAME_WORKER_DIR, 'ai-catalog-seed.json');
    execFileSync(NODE_EXECUTABLE, ['--import', 'tsx', 'scripts/seed-ai-catalog.ts', outFile], {
      cwd: GAME_WORKER_DIR,
      stdio: 'pipe',
    });
    execFileSync(process.execPath, [
      WRANGLER_ENTRYPOINT,
      'kv',
      'key',
      'put',
      'catalog',
      '--path=ai-catalog-seed.json',
      '--namespace-id=0000000000000000000000000000000c',
      '--local',
    ], { cwd: GAME_WORKER_DIR, stdio: 'pipe' });
    log('AI_CATALOG_KV seeded.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`AI_CATALOG_KV seed failed (non-fatal): ${message.split('\n')[0]}`);
  }
}

async function seedProductsViaWorker(baseUrl: string, log: (message: string) => void): Promise<void> {
  const seedUrl = `${baseUrl}${ApiEndpoint.Test.SeedProducts}`;
  try {
    const response = await fetchWithTimeout(seedUrl, { method: 'POST' }, 10000);
    await response.text().catch(() => undefined);
    if (response.ok) {
      log('Seeded PRODUCT_KV via game worker endpoint.');
      return;
    }
    log(`Game worker seed endpoint failed: ${response.status} ${response.statusText}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Game worker seed endpoint failed: ${message}`);
  }
}

async function isLocalAssetSeedCurrent(
  baseUrl: string,
  log: (message: string) => void,
  requireAssetVerify?: boolean
): Promise<boolean> {
  if (
    requireAssetVerify ||
    process.env.SEED_ASSETS_ON_BOOT === '1' ||
    process.env.SEED_ASSETS_FORCE_ON_BOOT === '1'
  ) {
    return false;
  }

  const cache = readJsonFile<AssetSeedCacheRecord>(ASSET_SEED_CACHE_FILE);
  const report = readJsonFile<AssetSeedReport>(ASSET_SEED_REPORT_FILE);
  const cacheKeys = Object.keys(cache?.fileHashes ?? cache?.fileRecords ?? {});
  if (
    !cache?.filesHash ||
    !report?.filesHash ||
    cache.filesHash !== report.filesHash ||
    cacheKeys.length === 0 ||
    !report.files ||
    report.files < 1
  ) {
    return false;
  }

  try {
    const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
    const response = await fetchWithTimeout(`${normalizedBaseUrl}${ApiEndpoint.Assets.List}`, {}, 10000);
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as Array<{ key?: string }>;
    if (!Array.isArray(payload) || payload.length < report.files) {
      return false;
    }
    const bucketKeys = new Set(payload.map((entry) => entry.key).filter((key): key is string => Boolean(key)));
    const missingCriticalKey = ASSET_SEED_CRITICAL_KEYS.some(
      (key) => cacheKeys.includes(key) && !bucketKeys.has(key)
    );
    if (missingCriticalKey) {
      return false;
    }
    log('Asset seed skipped (local R2 cache already current for this worktree).');
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Asset seed cache check failed; seeding will run: ${message.split('\n')[0]}`);
    return false;
  }
}

async function ensureSeeds(
  baseUrl: string,
  log: (message: string) => void,
  registry: ManagedProcessRegistry,
  options: Pick<EnsureLocalCloudflareWorkerOptions, 'waitForAssetSeed' | 'requireAssetVerify'> = {}
): Promise<void> {
  const startedAt = Date.now();
  const skipAssetSeed = await isLocalAssetSeedCurrent(baseUrl, log, options.requireAssetVerify);
  let assetSeedExit: Promise<void> | null = null;

  if (!skipAssetSeed) {
    log('Starting asset seeding in background (Vite will start in parallel).');
    const assetSeedEnv: Record<string, string> = {
      ASSETS_VERIFY_BASE_URL: baseUrl,
      SEED_ASSETS_CONTINUE_ON_ERROR: options.requireAssetVerify ? '0' : '1',
    };
    if (options.requireAssetVerify) {
      assetSeedEnv.SEED_ASSETS_REQUIRE_VERIFY = '1';
    }
    const assetSeed = spawnManaged(
      registry,
      'npx',
      ['tsx', 'scripts/seed-assets-local.ts'],
      GAME_WORKER_DIR,
      'seed-assets-local',
      assetSeedEnv
    );
    assetSeedExit = new Promise<void>((resolve, reject) => {
      assetSeed.once('error', reject);
      assetSeed.once('exit', (code) => {
        if (code === 0 || code === null) {
          resolve();
        } else {
          reject(new Error(`Asset seed exited with code ${code}.`));
        }
      });
    });
    if (!options.waitForAssetSeed) {
      assetSeedExit.catch(() => undefined);
    }
  }

  if (isProductSeedCacheValid()) {
    log('Product/KV seed skipped (cache hit).');
    if (options.waitForAssetSeed && assetSeedExit) {
      await assetSeedExit;
    }
    log(`Local seeding stage completed in ${formatDurationMs(Date.now() - startedAt)}.`);
    return;
  }

  runCommand('npx tsx scripts/seed-products-local.ts', GAME_WORKER_DIR, log, 'Seeding PRODUCT_KV...');
  seedAiCatalog(log);
  await seedProductsViaWorker(baseUrl, log);
  writeProductSeedCache();
  if (options.waitForAssetSeed && assetSeedExit) {
    await assetSeedExit;
  }
  log(`Local seeding stage completed in ${formatDurationMs(Date.now() - startedAt)}.`);
}

export async function ensureLocalCloudflareWorker(
  registry: ManagedProcessRegistry,
  log: (message: string) => void,
  options: EnsureLocalCloudflareWorkerOptions = {}
): Promise<{ workerBase: string; reused: boolean }> {
  const startedAt = Date.now();
  const initialOccupants = await getPortOccupants(GAME_WORKER_PORT);

  if (initialOccupants.length > 0 || await isPortOpen(GAME_WORKER_PORT)) {
    let reclaimedWorkerPort = false;
    for (let retry = 0; retry < 3; retry += 1) {
      const healthy = await isWorkerHealthy(GAME_WORKER_BASE);
      const occupants = retry === 0 ? initialOccupants : await getPortOccupants(GAME_WORKER_PORT);
      if (healthy && (occupants.length === 0 || occupants.every(isCurrentWorkerOccupant))) {
        log(`Reusing existing claim-storage worker on port ${GAME_WORKER_PORT}.`);
        await ensureSeeds(GAME_WORKER_BASE, log, registry, options);
        log(`Cloudflare worker stage completed in ${formatDurationMs(Date.now() - startedAt)}.`);
        return { workerBase: GAME_WORKER_BASE, reused: true };
      }
      if (occupants.length > 0 && occupants.every(isOcentraWorkerOccupant)) {
        const occupantSummary = summarizePortOccupants(occupants);
        log(`Port ${GAME_WORKER_PORT} is held by worker process(es) outside this worktree: ${occupantSummary}. Reclaiming it...`);
        const freed = await ensurePortFree(
          GAME_WORKER_PORT,
          (occupant) => isOcentraWorkerOccupant(occupant),
          log,
          5
        );
        if (!freed) {
          throw new Error(`Failed to reclaim stale claim-storage worker on port ${GAME_WORKER_PORT}.`);
        }
        reclaimedWorkerPort = true;
        break;
      }
      if (retry < 2) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (!reclaimedWorkerPort) {
      const occupants = await getPortOccupants(GAME_WORKER_PORT);
      const occupantSummary = summarizePortOccupants(occupants);

      if (occupants.length > 0 && occupants.every(isOcentraWorkerOccupant)) {
        log(`Port ${GAME_WORKER_PORT} is held by stale worker process(es): ${occupantSummary}. Reclaiming it...`);
        const freed = await ensurePortFree(
          GAME_WORKER_PORT,
          (occupant) => isOcentraWorkerOccupant(occupant),
          log,
          5
        );
        if (!freed) {
          throw new Error(`Failed to reclaim stale claim-storage worker on port ${GAME_WORKER_PORT}.`);
        }
      } else {
        throw new Error(
          `Port ${GAME_WORKER_PORT} is already in use by ${occupantSummary}, and it is not a healthy claim-storage worker for this worktree.`
        );
      }
    }
  }

  if (options.skipDependencyPrep) {
    runCommand(
      'npx tsx scripts/generate-log-modules.ts',
      GAME_WORKER_DIR,
      log,
      'Refreshing Cloudflare worker generated log modules...'
    );
  } else {
    runCommand('npm run predev', GAME_WORKER_DIR, log, 'Preparing Cloudflare worker dependencies...');
  }

  log(`Starting claim-storage worker on port ${GAME_WORKER_PORT}...`);
  const generatedWorkerEnvFile = writeGeneratedWorkerEnvFile();
  const wranglerArgs = ['dev', '--env', 'development', '--ip', GAME_WORKER_HOST, '--port', String(GAME_WORKER_PORT)];
  if (generatedWorkerEnvFile) {
    wranglerArgs.push('--env-file', generatedWorkerEnvFile);
  }
  spawnManaged(
    registry,
    NODE_EXECUTABLE,
    [WRANGLER_ENTRYPOINT, ...wranglerArgs],
    GAME_WORKER_DIR,
    'game-worker'
  );

  await waitForPort(GAME_WORKER_PORT, STARTUP_TIMEOUT_MS);
  log(`Worker port ${GAME_WORKER_PORT} is open.`);

  const healthy = await waitForWorkerHealth(GAME_WORKER_BASE, 'Claim-storage worker', log);
  if (!healthy) {
    throw new Error('Claim-storage worker did not become healthy in time.');
  }

  await ensureSeeds(GAME_WORKER_BASE, log, registry, options);

  log(`Cloudflare worker stage completed in ${formatDurationMs(Date.now() - startedAt)}.`);
  return { workerBase: GAME_WORKER_BASE, reused: false };
}
