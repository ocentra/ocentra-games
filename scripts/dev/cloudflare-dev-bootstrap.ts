#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import type { ChildProcess } from 'child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensurePortFree, getPortOccupants } from './port-utils';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '../..');
export const GAME_WORKER_DIR = path.join(ROOT, 'infra/cloudflare');
export const GAME_WORKER_PORT = parseInt(process.env.WORKER_PORT ?? '8787', 10);
export const GAME_WORKER_BASE = `http://127.0.0.1:${GAME_WORKER_PORT}`;
export const STARTUP_TIMEOUT_MS = 300_000;

const PRODUCT_SEED_CACHE_FILE = path.join(GAME_WORKER_DIR, '.dev-seed-hash');
const WORKER_DEV_VARS_FILE = path.join(GAME_WORKER_DIR, '.dev.vars');
const GENERATED_DEV_ENV_FILE = path.join(GAME_WORKER_DIR, '.wrangler', 'dev-firebase.env');
const PRODUCT_SEED_SOURCE_FILES = [
  path.join(GAME_WORKER_DIR, 'scripts/seed-products-local.ts'),
  path.join(GAME_WORKER_DIR, 'src/config/dev-seed-products.ts'),
  path.join(GAME_WORKER_DIR, 'src/data/ai-catalog.ts'),
] as const;

const isWindows = process.platform === 'win32';

export type ManagedProcessRegistry = {
  processes: ChildProcess[];
};

type EnsureLocalCloudflareWorkerOptions = {
  skipDependencyPrep?: boolean;
};

export function createManagedProcessRegistry(): ManagedProcessRegistry {
  return { processes: [] };
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
    env: { ...process.env, ...envOverrides },
  });

  proc.stdout?.on('data', (data: Buffer) => process.stdout.write(`[${label}] ${data}`));
  proc.stderr?.on('data', (data: Buffer) => process.stderr.write(`[${label}] ${data}`));
  proc.on('exit', (code) => {
    if (code && code !== 0) {
      console.log(`[${label}] exited with code ${code}`);
    }
  });

  registry.processes.push(proc);
  return proc;
}

export function killManagedProcesses(registry: ManagedProcessRegistry): void {
  for (const proc of registry.processes) {
    try {
      proc.kill('SIGTERM');
    } catch {
      // ignore
    }
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

async function waitForPort(port: number, timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ port, host: '127.0.0.1' });
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

export async function waitForWorkerHealth(baseUrl: string, label: string, log: (message: string) => void): Promise<boolean> {
  const healthUrls = [`${baseUrl}/health`, `${baseUrl}/api/v1/health`];
  for (let attempt = 0; attempt < 15; attempt += 1) {
    for (const url of healthUrls) {
      try {
        const response = await fetch(url);
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
      const response = await fetch(url);
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

function isManagedWorkerOccupant(occupant: { name: string; commandLine: string }): boolean {
  const lowerName = occupant.name.toLowerCase();
  const lowerCommand = occupant.commandLine.toLowerCase();
  const workerDir = GAME_WORKER_DIR.toLowerCase().replace(/\\/g, '/');
  const normalizedCommand = lowerCommand.replace(/\\/g, '/');

  const looksLikeWorkerProcess =
    lowerName.includes('wrangler') ||
    lowerName.includes('workerd') ||
    normalizedCommand.includes('wrangler') ||
    normalizedCommand.includes('workerd');

  const pointsAtWorkerDir =
    normalizedCommand.includes(workerDir) ||
    normalizedCommand.includes('infra/cloudflare');

  return looksLikeWorkerProcess && pointsAtWorkerDir;
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
    execSync(`npx tsx scripts/seed-ai-catalog.ts "${outFile}"`, {
      cwd: GAME_WORKER_DIR,
      stdio: 'pipe',
    });
    execSync(
      'npx wrangler kv key put "catalog" --path="ai-catalog-seed.json" --namespace-id=0000000000000000000000000000000c --local',
      { cwd: GAME_WORKER_DIR, stdio: 'pipe' }
    );
    log('AI_CATALOG_KV seeded.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`AI_CATALOG_KV seed failed (non-fatal): ${message.split('\n')[0]}`);
  }
}

async function seedProductsViaWorker(baseUrl: string, log: (message: string) => void): Promise<void> {
  const seedUrl = `${baseUrl}/api/v1/test/seed-products`;
  try {
    const response = await fetch(seedUrl, { method: 'POST' });
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

async function ensureSeeds(
  baseUrl: string,
  log: (message: string) => void,
  registry: ManagedProcessRegistry
): Promise<void> {
  const startedAt = Date.now();
  log('Starting asset seeding in background (Vite will start in parallel).');
  spawnManaged(
    registry,
    'npx',
    ['tsx', 'scripts/seed-assets-local.ts'],
    GAME_WORKER_DIR,
    'seed-assets-local',
    {
      ASSETS_VERIFY_BASE_URL: baseUrl,
      SEED_ASSETS_CONTINUE_ON_ERROR: '1',
    }
  );

  if (isProductSeedCacheValid()) {
    log('Product/KV seed skipped (cache hit).');
    log(`Local seeding stage completed in ${formatDurationMs(Date.now() - startedAt)}.`);
    return;
  }

  runCommand('npx tsx scripts/seed-products-local.ts', GAME_WORKER_DIR, log, 'Seeding PRODUCT_KV...');
  seedAiCatalog(log);
  await seedProductsViaWorker(baseUrl, log);
  writeProductSeedCache();
  log(`Local seeding stage completed in ${formatDurationMs(Date.now() - startedAt)}.`);
}

export async function ensureLocalCloudflareWorker(
  registry: ManagedProcessRegistry,
  log: (message: string) => void,
  options: EnsureLocalCloudflareWorkerOptions = {}
): Promise<{ workerBase: string; reused: boolean }> {
  const startedAt = Date.now();
  const existingHealthy = await isWorkerHealthy(GAME_WORKER_BASE);
  if (existingHealthy) {
    log(`Reusing existing claim-storage worker on port ${GAME_WORKER_PORT}.`);
    await ensureSeeds(GAME_WORKER_BASE, log, registry);
    log(`Cloudflare worker stage completed in ${formatDurationMs(Date.now() - startedAt)}.`);
    return { workerBase: GAME_WORKER_BASE, reused: true };
  }

  if (await isPortOpen(GAME_WORKER_PORT)) {
    for (let retry = 0; retry < 3; retry += 1) {
      const healthy = await isWorkerHealthy(GAME_WORKER_BASE);
      if (healthy) {
        log(`Reusing existing claim-storage worker on port ${GAME_WORKER_PORT} (health confirmed after port check).`);
        await ensureSeeds(GAME_WORKER_BASE, log, registry);
        log(`Cloudflare worker stage completed in ${formatDurationMs(Date.now() - startedAt)}.`);
        return { workerBase: GAME_WORKER_BASE, reused: true };
      }
      if (retry < 2) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    const occupants = await getPortOccupants(GAME_WORKER_PORT);
    const occupantSummary =
      occupants.length > 0
        ? occupants.map((occupant) => `${occupant.name || 'unknown'}:${occupant.pid}`).join(', ')
        : 'unknown process';

    if (occupants.length > 0 && occupants.every(isManagedWorkerOccupant)) {
      log(
        `Port ${GAME_WORKER_PORT} is held by stale worker process(es): ${occupantSummary}. Reclaiming it...`
      );
      const freed = await ensurePortFree(
        GAME_WORKER_PORT,
        (occupant) => isManagedWorkerOccupant(occupant),
        log,
        5
      );
      if (!freed) {
        throw new Error(`Failed to reclaim stale claim-storage worker on port ${GAME_WORKER_PORT}.`);
      }
    } else {
      throw new Error(
        `Port ${GAME_WORKER_PORT} is already in use by ${occupantSummary}, and it is not a healthy claim-storage worker.`
      );
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

  log(`Starting claim-storage worker on fixed port ${GAME_WORKER_PORT}...`);
  const generatedWorkerEnvFile = writeGeneratedWorkerEnvFile();
  const wranglerArgs = ['wrangler', 'dev', '--env', 'development', '--ip', '127.0.0.1', '--port', String(GAME_WORKER_PORT)];
  if (generatedWorkerEnvFile) {
    wranglerArgs.push('--env-file', generatedWorkerEnvFile);
  }
  spawnManaged(
    registry,
    'npx',
    wranglerArgs,
    GAME_WORKER_DIR,
    'game-worker'
  );

  await waitForPort(GAME_WORKER_PORT, STARTUP_TIMEOUT_MS);
  log(`Worker port ${GAME_WORKER_PORT} is open.`);

  const healthy = await waitForWorkerHealth(GAME_WORKER_BASE, 'Claim-storage worker', log);
  if (!healthy) {
    throw new Error('Claim-storage worker did not become healthy in time.');
  }

  await ensureSeeds(GAME_WORKER_BASE, log, registry);

  log(`Cloudflare worker stage completed in ${formatDurationMs(Date.now() - startedAt)}.`);
  return { workerBase: GAME_WORKER_BASE, reused: false };
}
