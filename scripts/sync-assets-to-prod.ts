#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { StorageBucketName } from '@ocentra/boundary-domain/constants/buckets';
import { resolveAssetSourceRoot } from './assets/assetSourceRoot';
import { buildAppAssetSlices } from './assets/buildAppAssetSlices';

type SyncEnv = 'development' | 'production';

interface SyncConfig {
  env: SyncEnv;
  bucketName: string;
  workerUrl: string;
  workerToken: string;
  dryRun: boolean;
  prune: boolean;
  wipe: boolean;
  useHashCache: boolean;
  concurrency: number;
  resourcesDir: string;
}

interface FileHashCacheEntry {
  mtimeMs: number;
  size: number;
  md5: string;
  sha256: string;
}

interface LocalFile {
  key: string;
  fullPath: string;
  size: number;
  md5: string;
  sha256: string;
}

interface RemoteObject {
  key: string;
  etag: string;
  md5?: string;
  size: number;
}

interface DiffResult {
  upload: LocalFile[];
  unchanged: LocalFile[];
  delete: RemoteObject[];
}

function getSyncConfig(args: string[]): SyncConfig {
  const env: SyncEnv = process.env.SYNC_ENV === 'development' ? 'development' : 'production';
  const apply = args.includes('--apply');
  const dryRun = !apply || args.includes('--dry-run');
  const prune = args.includes('--prune');
  const wipe = args.includes('--wipe');
  const useHashCache =
    !args.includes('--no-hash-cache') && process.env.SYNC_SKIP_HASH_CACHE !== '1';
  const concurrency = Math.max(1, Number(process.env.SYNC_CONCURRENCY || 4));
  const resourcesArg = args.find((arg) => arg.startsWith('--resources-dir='));
  const resourcesDir = resourcesArg
    ? resourcesArg.slice('--resources-dir='.length)
    : (process.env.ASSET_SYNC_ROOT || '');
  const bucketName = env === 'development' ? `${StorageBucketName.DefaultAssets}-test` : StorageBucketName.DefaultAssets;
  const workerUrl = env === 'development'
    ? (
      process.env.CLAIM_STORAGE_ASSETS_URL_DEV ||
      process.env.CLAIM_STORAGE_ASSETS_URL ||
      process.env.ASSETS_WORKER_URL_DEV ||
      process.env.ASSETS_WORKER_URL ||
      'http://127.0.0.1:8787'
    )
    : (
      process.env.CLAIM_STORAGE_ASSETS_URL_PROD ||
      process.env.CLAIM_STORAGE_ASSETS_URL ||
      process.env.ASSETS_WORKER_URL_PROD ||
      process.env.ASSETS_WORKER_URL ||
      ''
    );
  const workerToken = env === 'development'
    ? (
      process.env.CLAIM_STORAGE_ASSETS_TOKEN_DEV ||
      process.env.CLAIM_STORAGE_ASSETS_TOKEN ||
      process.env.ASSETS_WORKER_TOKEN_DEV ||
      process.env.ASSETS_WORKER_TOKEN ||
      ''
    )
    : (
      process.env.CLAIM_STORAGE_ASSETS_TOKEN_PROD ||
      process.env.CLAIM_STORAGE_ASSETS_TOKEN ||
      process.env.ASSETS_WORKER_TOKEN_PROD ||
      process.env.ASSETS_WORKER_TOKEN ||
      ''
    );
  return {
    env,
    bucketName,
    workerUrl,
    workerToken,
    dryRun,
    prune,
    wipe,
    useHashCache,
    concurrency,
    resourcesDir,
  };
}

function normalizeEtag(input: string | null | undefined): string {
  let s = (input || '').trim();
  if (s.length >= 2 && s.slice(0, 2).toLowerCase() === 'w/') {
    s = s.slice(2).trim();
  }
  s = s.replace(/^"+|"+$/g, '').replace(/"/g, '').toLowerCase();
  return s;
}

function parseRemoteMd5Hex(input: string | null | undefined): string | undefined {
  if (typeof input !== 'string') {
    return undefined;
  }
  const t = input.trim().toLowerCase();
  return /^[0-9a-f]{32}$/.test(t) ? t : undefined;
}

function remoteContentDigestMatchesLocalMd5(remote: RemoteObject, localMd5: string): boolean {
  const fromChecksum = parseRemoteMd5Hex(remote.md5);
  if (fromChecksum === localMd5) {
    return true;
  }
  const fromEtag = normalizeEtag(remote.etag);
  if (fromEtag === localMd5) {
    return true;
  }
  return false;
}

function hashCachePath(): string {
  return join(process.cwd(), 'infra', 'cloudflare', '.wrangler', 'asset-hash-cache.json');
}

async function loadHashCache(enabled: boolean): Promise<Map<string, FileHashCacheEntry>> {
  if (!enabled) {
    return new Map();
  }
  try {
    const raw = await readFile(hashCachePath(), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, FileHashCacheEntry>;
    const map = new Map<string, FileHashCacheEntry>();
    for (const [k, v] of Object.entries(parsed)) {
      if (
        v &&
        typeof v.mtimeMs === 'number' &&
        typeof v.size === 'number' &&
        typeof v.md5 === 'string' &&
        typeof v.sha256 === 'string'
      ) {
        map.set(k, v);
      }
    }
    return map;
  } catch {
    return new Map();
  }
}

async function saveHashCache(enabled: boolean, map: Map<string, FileHashCacheEntry>): Promise<void> {
  if (!enabled) {
    return;
  }
  const path = hashCachePath();
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(Object.fromEntries(map), null, 0), 'utf8');
}

async function listLocalFiles(
  root: string,
  hashCache: Map<string, FileHashCacheEntry>,
  useHashCache: boolean,
  stats: { hits: number; misses: number }
): Promise<LocalFile[]> {
  const files: LocalFile[] = [];
  const cacheKey = (fullPath: string) => fullPath.replace(/\\/g, '/');

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      const fileStat = await stat(fullPath);
      if (!fileStat.isFile()) {
        continue;
      }

      const key = relative(root, fullPath).replace(/\\/g, '/');
      const ck = cacheKey(fullPath);
      let md5: string;
      let sha256: string;

      if (useHashCache) {
        const hit = hashCache.get(ck);
        const mtimeMs = typeof fileStat.mtimeMs === 'number' ? fileStat.mtimeMs : fileStat.mtime.getTime();
        if (hit && hit.mtimeMs === mtimeMs && hit.size === fileStat.size) {
          md5 = hit.md5;
          sha256 = hit.sha256;
          stats.hits += 1;
        } else {
          const bytes = await readFile(fullPath);
          md5 = createHash('md5').update(bytes).digest('hex');
          sha256 = createHash('sha256').update(bytes).digest('hex');
          hashCache.set(ck, {
            mtimeMs,
            size: fileStat.size,
            md5,
            sha256,
          });
          stats.misses += 1;
        }
      } else {
        const bytes = await readFile(fullPath);
        md5 = createHash('md5').update(bytes).digest('hex');
        sha256 = createHash('sha256').update(bytes).digest('hex');
        stats.misses += 1;
      }

      files.push({
        key,
        fullPath,
        size: fileStat.size,
        md5,
        sha256,
      });
    }
  }

  await walk(root);
  files.sort((a, b) => a.key.localeCompare(b.key));
  return files;
}

async function listRemoteObjects(workerUrl: string): Promise<RemoteObject[]> {
  if (!workerUrl) {
    throw new Error('Claim-storage asset endpoint URL is required for remote diff.');
  }

  const endpoint = `${workerUrl.replace(/\/$/, '')}/api/v1/assets/list`;
  const response = await fetch(endpoint);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`remote list failed (${response.status}): ${body}`);
  }

  const parsed = await response.json() as Array<{ key?: string; etag?: string; md5?: string; size?: number }>;
  return parsed
    .filter((entry): entry is { key: string; etag?: string; md5?: string; size?: number } => typeof entry.key === 'string' && entry.key.length > 0)
    .map((entry) => ({
      key: entry.key,
      etag: normalizeEtag(entry.etag),
      md5: parseRemoteMd5Hex(entry.md5),
      size: typeof entry.size === 'number' ? entry.size : 0,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

function buildDiff(localFiles: LocalFile[], remoteObjects: RemoteObject[], prune: boolean): DiffResult {
  const remoteByKey = new Map(remoteObjects.map((object) => [object.key, object]));
  const upload: LocalFile[] = [];
  const unchanged: LocalFile[] = [];

  for (const file of localFiles) {
    const remote = remoteByKey.get(file.key);
    if (!remote) {
      upload.push(file);
      continue;
    }

    if (remoteContentDigestMatchesLocalMd5(remote, file.md5)) {
      unchanged.push(file);
    } else {
      upload.push(file);
    }
  }

  const localKeys = new Set(localFiles.map((file) => file.key));
  const deleteList = prune
    ? remoteObjects.filter((object) => !localKeys.has(object.key))
    : [];

  return { upload, unchanged, delete: deleteList };
}

function runWranglerCommand(args: string[]): void {
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const result = spawnSync(command, ['wrangler', ...args], { stdio: 'inherit', shell: false });
  if (result.status !== 0) {
    throw new Error(`wrangler command failed: ${args.join(' ')}`);
  }
}

function runWranglerPut(bucketName: string, file: LocalFile, env: SyncEnv): void {
  runWranglerCommand([
    'r2',
    'object',
    'put',
    `${bucketName}/${file.key}`,
    '--file',
    file.fullPath,
    '--remote',
    '--config',
    'infra/cloudflare/wrangler.toml',
    '--env',
    env,
  ]);
}

function runWranglerDelete(bucketName: string, key: string, env: SyncEnv): void {
  runWranglerCommand([
    'r2',
    'object',
    'delete',
    `${bucketName}/${key}`,
    '--remote',
    '--config',
    'infra/cloudflare/wrangler.toml',
    '--env',
    env,
  ]);
}

async function runInBatches<T>(items: T[], concurrency: number, runner: (item: T, index: number) => Promise<void>): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (!item) {
        return;
      }
      await runner(item, index);
    }
  });
  await Promise.all(workers);
}

async function writeReport(
  config: SyncConfig,
  localFiles: LocalFile[],
  remoteObjects: RemoteObject[],
  diff: DiffResult,
  hashStats: { hits: number; misses: number }
): Promise<void> {
  const reportDir = join(process.cwd(), 'infra', 'cloudflare', '.wrangler');
  const reportPath = join(reportDir, `sync-assets-report-${config.env}.json`);
  await mkdir(reportDir, { recursive: true });
  await writeFile(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        env: config.env,
        bucketName: config.bucketName,
        workerUrl: config.workerUrl,
        dryRun: config.dryRun,
        prune: config.prune,
        wipe: config.wipe,
        useHashCache: config.useHashCache,
        hashCacheHits: hashStats.hits,
        hashCacheMisses: hashStats.misses,
        localFiles: localFiles.length,
        remoteObjects: remoteObjects.length,
        upload: diff.upload.map((file) => ({ key: file.key, size: file.size, md5: file.md5, sha256: file.sha256 })),
        delete: diff.delete.map((object) => ({ key: object.key, size: object.size, etag: object.etag })),
        unchanged: diff.unchanged.length,
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`[sync-assets] report written: ${reportPath}`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const config = getSyncConfig(args);
  const resourcesDir = resolveAssetSourceRoot(process.cwd(), config.resourcesDir);
  const generatedSlicesDir = join(process.cwd(), 'infra', 'cloudflare', '.generated', 'app-slices');

  if (!existsSync(resourcesDir)) {
    throw new Error(`Resources directory not found: ${resourcesDir}`);
  }
  if (!config.workerUrl) {
    throw new Error(
      'Missing claim-storage asset endpoint URL. Set CLAIM_STORAGE_ASSETS_URL[_PROD|_DEV] or use the deprecated ASSETS_WORKER_URL aliases.'
    );
  }

  await buildAppAssetSlices({
    repoRoot: process.cwd(),
    resourcesDir,
    outDir: generatedSlicesDir,
  });

  const hashCache = await loadHashCache(config.useHashCache);
  const hashStats = { hits: 0, misses: 0 };
  const localFiles = [
    ...await listLocalFiles(resourcesDir, hashCache, config.useHashCache, hashStats),
    ...await listLocalFiles(generatedSlicesDir, hashCache, config.useHashCache, hashStats),
  ];
  await saveHashCache(config.useHashCache, hashCache);
  if (config.useHashCache) {
    console.log(
      `[sync-assets] local hash cache: hits=${hashStats.hits} misses=${hashStats.misses} (mtime+size; --no-hash-cache or SYNC_SKIP_HASH_CACHE=1 to disable)`
    );
  }
  if (localFiles.length === 0) {
    console.log('[sync-assets] no local files found, nothing to sync.');
    return;
  }

  const remoteListed = await listRemoteObjects(config.workerUrl);
  let remoteObjects = remoteListed;

  if (config.wipe) {
    if (config.dryRun) {
      console.log(
        `[sync-assets] --wipe (dry-run): would delete ${remoteListed.length} remote object(s), then upload ${localFiles.length} file(s).`
      );
      remoteObjects = [];
    } else {
      console.log(`[sync-assets] --wipe: deleting ${remoteListed.length} remote object(s) before upload.`);
      let removed = 0;
      await runInBatches(remoteListed, config.concurrency, async (object) => {
        runWranglerDelete(config.bucketName, object.key, config.env);
        removed += 1;
        if (removed % 25 === 0 || removed === remoteListed.length) {
          console.log(`[sync-assets] wiped ${removed}/${remoteListed.length}`);
        }
      });
      remoteObjects = [];
    }
  }

  const diff = buildDiff(localFiles, remoteObjects, config.prune);

  console.log(`[sync-assets] env=${config.env} bucket=${config.bucketName}`);
  console.log(`[sync-assets] local=${localFiles.length} remote=${remoteListed.length} (listed)`);
  console.log(`[sync-assets] upload=${diff.upload.length} unchanged=${diff.unchanged.length} delete=${diff.delete.length}`);
  if (!config.dryRun) {
    console.log(
      `[sync-assets] apply mode enabled (concurrency=${config.concurrency}, prune=${config.prune}, wipe=${config.wipe})`
    );
  } else {
    console.log('[sync-assets] dry-run mode (use --apply to execute changes).');
  }

  await writeReport(config, localFiles, remoteListed, diff, hashStats);

  if (config.dryRun) {
    return;
  }

  let uploaded = 0;
  await runInBatches(diff.upload, config.concurrency, async (file) => {
    runWranglerPut(config.bucketName, file, config.env);
    uploaded += 1;
    if (uploaded % 25 === 0 || uploaded === diff.upload.length) {
      console.log(`[sync-assets] uploaded ${uploaded}/${diff.upload.length}`);
    }
  });

  let deleted = 0;
  await runInBatches(diff.delete, config.concurrency, async (object) => {
    runWranglerDelete(config.bucketName, object.key, config.env);
    deleted += 1;
    if (deleted % 25 === 0 || deleted === diff.delete.length) {
      console.log(`[sync-assets] deleted ${deleted}/${diff.delete.length}`);
    }
  });

}

main().catch((error) => {
  console.error('[sync-assets] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
