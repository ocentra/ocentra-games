import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { StorageBucketName } from '@ocentra/boundary-domain/constants/buckets';
import { resolveAssetSourceRoot } from '../../../scripts/assets/assetSourceRoot';
import { buildAppAssetSlices } from '../../../scripts/assets/buildAppAssetSlices';

interface FileEntry {
  relativePath: string;
  fullPath: string;
  size: number;
  modifiedMs: number;
}

type HashMode = 'metadata' | 'generated-json';

interface SeedCacheFileRecord {
  size: number;
  modifiedMs: number;
  hash: string;
}

interface SeedCacheRecord {
  filesHash: string;
  fileHashes: Record<string, string>;
  fileRecords?: Record<string, SeedCacheFileRecord>;
  pendingFilesHash?: string;
}

interface BucketObjectSummary {
  key: string;
  etag: string;
  size: number;
}

const execAsync = promisify(exec);
const MAX_UPLOAD_RETRIES = 3;
const WORKER_ASSET_API_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_PARALLELISM = typeof os.availableParallelism === 'function'
  ? os.availableParallelism()
  : Math.max(1, os.cpus().length);
const DEFAULT_SEED_CONCURRENCY = Math.max(2, Math.min(8, Math.floor(DEFAULT_PARALLELISM / 3) || 2));

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldUseWorkerAssetApiForFile(useWorkerAssetApi: boolean, file: FileEntry): boolean {
  return useWorkerAssetApi && file.size < WORKER_ASSET_API_MAX_BYTES;
}

function describeUploadTransport(useWorkerAssetApi: boolean, files: FileEntry[]): string {
  if (!useWorkerAssetApi) {
    return 'wrangler R2 CLI';
  }

  const wranglerFallbackCount = files.filter((file) => !shouldUseWorkerAssetApiForFile(useWorkerAssetApi, file)).length;
  if (wranglerFallbackCount === 0) {
    return 'worker asset API';
  }

  return `worker asset API with wrangler R2 CLI fallback for ${wranglerFallbackCount} large file(s)`;
}

async function runWithConcurrency<TInput, TOutput>(
  items: readonly TInput[],
  concurrency: number,
  worker: (item: TInput, index: number) => Promise<TOutput>
): Promise<TOutput[]> {
  if (items.length === 0) {
    return [];
  }

  const limit = Math.max(1, Math.min(concurrency, items.length));
  const results = new Array<TOutput>(items.length);
  let nextIndex = 0;

  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (true) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        if (currentIndex >= items.length) {
          return;
        }
        results[currentIndex] = await worker(items[currentIndex], currentIndex);
      }
    })
  );

  return results;
}

async function fetchBucketKeys(baseUrl: string): Promise<Set<string> | null> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const response = await fetch(`${normalizedBaseUrl}/api/v1/assets/list`);
  if (!response.ok) {
    throw new Error(`bucket list request failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as BucketObjectSummary[];
  if (!Array.isArray(payload)) {
    throw new Error('bucket list response was not an array');
  }

  return new Set(payload.map((entry) => entry.key));
}

function encodeKeyPathSegments(value: string): string {
  return value.split('/').map((segment) => encodeURIComponent(segment)).join('/');
}

async function collectFiles(root: string, current = root, out: FileEntry[] = []): Promise<FileEntry[]> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(root, fullPath, out);
      continue;
    }
    if (entry.name.endsWith('.meta')) {
      continue;
    }
    const stat = await fs.stat(fullPath);
    out.push({
      relativePath: path.relative(root, fullPath).replace(/\\/g, '/'),
      fullPath,
      size: stat.size,
      modifiedMs: stat.mtimeMs,
    });
  }
  return out;
}

function normalizeGeneratedJsonForHash(raw: string): string {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === 'object' && parsed !== null && 'generatedAt' in parsed) {
      const normalized = {
        ...(parsed as Record<string, unknown>),
        generatedAt: '__stable__',
      };
      return JSON.stringify(normalized);
    }
  } catch {
    // fall back to raw text
  }

  return raw;
}

async function appendFileHash(hash: ReturnType<typeof createHash>, file: FileEntry, mode: HashMode): Promise<void> {
  hash.update(file.relativePath);
  hash.update(':');

  if (mode === 'generated-json' && file.relativePath.endsWith('.json')) {
    const raw = await fs.readFile(file.fullPath, 'utf8');
    hash.update(normalizeGeneratedJsonForHash(raw));
    hash.update(';');
    return;
  }

  hash.update(String(file.size));
  hash.update(':');
  hash.update(String(Math.trunc(file.modifiedMs)));
  hash.update(';');
}

async function computeFileHash(file: FileEntry, mode: HashMode): Promise<string> {
  const hash = createHash('sha256');

  if (mode === 'generated-json' && file.relativePath.endsWith('.json')) {
    const raw = await fs.readFile(file.fullPath, 'utf8');
    hash.update(normalizeGeneratedJsonForHash(raw));
    return hash.digest('hex');
  }

  const raw = await fs.readFile(file.fullPath);
  hash.update(raw);
  return hash.digest('hex');
}

async function computeFilesHash(files: FileEntry[], mode: HashMode): Promise<string> {
  const hash = createHash('sha256');
  const normalized = [...files].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  for (const file of normalized) {
    await appendFileHash(hash, file, mode);
  }
  return hash.digest('hex');
}

async function runWranglerPut(
  bucketName: string,
  key: string,
  filePath: string,
  wranglerConfigPath: string,
  envName: string,
  localMode: boolean
): Promise<void> {
  const objectPath = `${bucketName}/${key}`;
  const quote = (value: string) => `"${value.replace(/"/g, '\\"')}"`;
  const commandParts = [
    'npx',
    'wrangler',
    'r2',
    'object',
    'put',
    quote(objectPath),
    '--file',
    quote(filePath),
    '--config',
    quote(wranglerConfigPath),
    '--env',
    quote(envName),
  ];

  if (localMode) {
    commandParts.push('--local');
  } else {
    commandParts.push('--remote');
  }

  const command = commandParts.join(' ');

  for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt += 1) {
    try {
      await execAsync(command, {
        cwd: path.dirname(wranglerConfigPath),
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      });
      return;
    } catch (error) {
      const stderr =
        typeof error === 'object' && error !== null && 'stderr' in error
          ? String((error as { stderr?: unknown }).stderr ?? '')
          : '';
      const stdout =
        typeof error === 'object' && error !== null && 'stdout' in error
          ? String((error as { stdout?: unknown }).stdout ?? '')
          : '';
      const baseMessage = error instanceof Error ? error.message : String(error);
      const message = [baseMessage, stdout, stderr].filter(Boolean).join('\n').trim();
      if (attempt >= MAX_UPLOAD_RETRIES) {
        throw new Error(`wrangler put failed for "${key}": ${message}`);
      }
      await sleep(250 * attempt);
    }
  }
}

async function runWranglerDelete(
  bucketName: string,
  key: string,
  wranglerConfigPath: string,
  envName: string,
  localMode: boolean
): Promise<void> {
  const objectPath = `${bucketName}/${key}`;
  const quote = (value: string) => `"${value.replace(/"/g, '\\"')}"`;
  const commandParts = [
    'npx',
    'wrangler',
    'r2',
    'object',
    'delete',
    quote(objectPath),
    '--config',
    quote(wranglerConfigPath),
    '--env',
    quote(envName),
  ];

  if (localMode) {
    commandParts.push('--local');
  } else {
    commandParts.push('--remote');
  }

  const command = commandParts.join(' ');

  for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt += 1) {
    try {
      await execAsync(command, {
        cwd: path.dirname(wranglerConfigPath),
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true,
      });
      return;
    } catch (error) {
      const stderr =
        typeof error === 'object' && error !== null && 'stderr' in error
          ? String((error as { stderr?: unknown }).stderr ?? '')
          : '';
      const stdout =
        typeof error === 'object' && error !== null && 'stdout' in error
          ? String((error as { stdout?: unknown }).stdout ?? '')
          : '';
      const baseMessage = error instanceof Error ? error.message : String(error);
      const message = [baseMessage, stdout, stderr].filter(Boolean).join('\n').trim();
      if (attempt >= MAX_UPLOAD_RETRIES) {
        throw new Error(`wrangler delete failed for "${key}": ${message}`);
      }
      await sleep(250 * attempt);
    }
  }
}

async function runWorkerPut(
  baseUrl: string,
  key: string,
  filePath: string
): Promise<void> {
  const body = await fs.readFile(filePath);
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');

  const contentType = key.endsWith('.json')
    ? 'application/json'
    : key.endsWith('.png')
      ? 'image/png'
      : key.endsWith('.jpg') || key.endsWith('.jpeg')
        ? 'image/jpeg'
        : key.endsWith('.webp')
          ? 'image/webp'
          : key.endsWith('.asset')
            ? 'application/json'
            : 'application/octet-stream';

  for (let attempt = 1; attempt <= MAX_UPLOAD_RETRIES; attempt += 1) {
    try {
      const response = await fetch(
        `${normalizedBaseUrl}/api/v1/assets/resource/${key.split('/').map(encodeURIComponent).join('/')}`,
        {
          method: 'PUT',
          headers: {
            authorization: 'Bearer test-token:seed-assets-local:admin',
            'content-type': contentType,
          },
          body,
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(
          `worker put failed for "${key}": ${response.status} ${response.statusText} ${text}`.trim()
        );
      }

      return;
    } catch (error) {
      if (attempt >= MAX_UPLOAD_RETRIES) {
        throw error;
      }
      await sleep(250 * attempt);
    }
  }
}

async function runWorkerDelete(
  baseUrl: string,
  key: string
): Promise<void> {
  const normalizedBaseUrl = baseUrl.replace(/\/$/, '');
  const response = await fetch(
    `${normalizedBaseUrl}/api/v1/assets/resource/${key.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'DELETE',
      headers: {
        authorization: 'Bearer test-token:seed-assets-local:admin',
      },
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`worker delete failed for "${key}": ${response.status} ${response.statusText} ${text}`.trim());
  }
}

async function main(): Promise<void> {
  const scriptFile = fileURLToPath(import.meta.url);
  const scriptDir = path.dirname(scriptFile);
  const workerRoot = path.resolve(scriptDir, '..');
  const repoRoot = path.resolve(workerRoot, '../..');
  const resourcesDir = resolveAssetSourceRoot(repoRoot);
  const generatedSlicesDir = path.join(workerRoot, '.generated', 'app-slices');
  const reportDir = path.join(workerRoot, '.wrangler');
  const remoteMode = process.argv.includes('--remote');
  const localMode = !remoteMode;
  const modeLabel = localMode ? 'local' : 'remote';
  const reportFile = path.join(reportDir, `seed-assets-${modeLabel}-report.json`);
  const cacheFile = path.join(reportDir, `seed-assets-${modeLabel}-cache.json`);
  const legacyCacheFile = path.join(reportDir, `seed-assets-${modeLabel}-hash.txt`);
  const wranglerConfigPath = path.join(workerRoot, 'wrangler.toml');
  const envName = process.env.ASSETS_WORKER_ENV || 'development';
  const bucketName = process.env.ASSETS_BUCKET_LOCAL || `${StorageBucketName.DefaultAssets}-test`;
  const dryRun = process.argv.includes('--dry-run');
  const force = process.argv.includes('--force');
  const continueOnError = process.argv.includes('--continue-on-error') || process.env.SEED_ASSETS_CONTINUE_ON_ERROR === '1';
  const allowDelete = process.argv.includes('--allow-delete') || process.env.SEED_ASSETS_ALLOW_DELETE === '1';
  const uploadConcurrency = Math.max(1, Number(process.env.SEED_LOCAL_CONCURRENCY || DEFAULT_SEED_CONCURRENCY));
  const verifyBaseUrl = localMode ? (process.env.ASSETS_VERIFY_BASE_URL || '').trim() : '';
  const useWorkerAssetApiEnv = (process.env.ASSETS_USE_WORKER_PUT || '').trim();
  const useWorkerAssetApi = localMode && verifyBaseUrl.length > 0 && useWorkerAssetApiEnv !== '0';
  const requireVerify = localMode && process.env.SEED_ASSETS_REQUIRE_VERIFY === '1';

  await buildAppAssetSlices({
    repoRoot,
    resourcesDir,
    outDir: generatedSlicesDir,
  });

  const resourceFiles = await collectFiles(resourcesDir);
  const generatedSliceFiles = await collectFiles(generatedSlicesDir);
  const files = [...resourceFiles, ...generatedSliceFiles];
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  const resourceHash = await computeFilesHash(resourceFiles, 'metadata');
  const generatedSlicesHash = await computeFilesHash(generatedSliceFiles, 'generated-json');
  const filesHash = createHash('sha256').update(resourceHash).update(':').update(generatedSlicesHash).digest('hex');
  let uploadedFiles = 0;
  let deletedFiles = 0;
  let cacheHit = false;
  let filesToUpload = files;
  const fatalErrors: string[] = [];

  await fs.mkdir(reportDir, { recursive: true });
  let cachedRecord: SeedCacheRecord | null = null;
  try {
    cachedRecord = JSON.parse(await fs.readFile(cacheFile, 'utf8')) as SeedCacheRecord;
  } catch {
    cachedRecord = null;
  }

  if (!cachedRecord) {
    try {
      const legacyHash = (await fs.readFile(legacyCacheFile, 'utf8')).trim();
      if (legacyHash) {
        cachedRecord = {
          filesHash: legacyHash,
          fileHashes: {},
        };
      }
    } catch {
      cachedRecord = null;
    }
  }

  const previousFileRecords = cachedRecord?.fileRecords ?? {};
  const previousFileHashes = cachedRecord?.fileHashes ?? {};
  const previousHashByPath: Record<string, string> = { ...previousFileHashes };
  for (const [relativePath, record] of Object.entries(previousFileRecords)) {
    if (!(relativePath in previousHashByPath) && typeof record.hash === 'string' && record.hash.length > 0) {
      previousHashByPath[relativePath] = record.hash;
    }
  }
  const cacheHashMatchesCurrent = cachedRecord?.filesHash === filesHash;
  const resumeHashMatchesCurrent = cachedRecord?.pendingFilesHash === filesHash;
  const resumeActive = resumeHashMatchesCurrent && Object.keys(previousHashByPath).length > 0;
  const effectivePreviousFileHashes = previousHashByPath;

  const computeCurrentFileRecord = async (file: FileEntry, mode: HashMode): Promise<SeedCacheFileRecord> => {
    const previousRecord = previousFileRecords[file.relativePath];
    if (
      previousRecord &&
      previousRecord.size === file.size &&
      previousRecord.modifiedMs === file.modifiedMs
    ) {
      return previousRecord;
    }

    const previousHash = effectivePreviousFileHashes[file.relativePath];
    if (
      previousHash &&
      !previousRecord &&
      mode === 'metadata'
    ) {
      return {
        size: file.size,
        modifiedMs: file.modifiedMs,
        hash: previousHash,
      };
    }

    return {
      size: file.size,
      modifiedMs: file.modifiedMs,
      hash: await computeFileHash(file, mode),
    };
  };

  const resourceFileRecords = Object.fromEntries(
    await runWithConcurrency(resourceFiles, uploadConcurrency, async (file) =>
      [file.relativePath, await computeCurrentFileRecord(file, 'metadata')] as const
    )
  );
  const generatedFileRecords = Object.fromEntries(
    await runWithConcurrency(generatedSliceFiles, uploadConcurrency, async (file) =>
      [file.relativePath, await computeCurrentFileRecord(file, 'generated-json')] as const
    )
  );
  const fileRecords = { ...resourceFileRecords, ...generatedFileRecords };
  const fileHashes = Object.fromEntries(
    Object.entries(fileRecords).map(([relativePath, record]) => [relativePath, record.hash])
  );
  const expectedKeys = new Set(files.map((file) => file.relativePath));
  let missingBucketKeys = new Set<string>();
  let encodedKeyOnlyCount = 0;

  if (!dryRun && !force && verifyBaseUrl) {
    try {
      const bucketKeys = await fetchBucketKeys(verifyBaseUrl);
      if (bucketKeys) {
        encodedKeyOnlyCount = Array.from(expectedKeys).filter(
          (key) => !bucketKeys.has(key) && bucketKeys.has(encodeKeyPathSegments(key))
        ).length;
        if (encodedKeyOnlyCount > 0) {
          console.warn(
            `[seed-assets-${modeLabel}] detected ${encodedKeyOnlyCount} key(s) present only as URL-encoded variants in bucket.`
          );
        }
        missingBucketKeys = new Set(
          Array.from(expectedKeys).filter((key) => !bucketKeys.has(key))
        );
        if (missingBucketKeys.size > 0) {
          console.log(
            `[seed-assets-${modeLabel}] detected ${missingBucketKeys.size} missing bucket file(s); repairing local bucket drift.`
          );
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (requireVerify) {
        throw new Error(`bucket verification failed: ${message}`);
      }
      console.warn(`[seed-assets-${modeLabel}] bucket verification skipped: ${message}`);
    }
  }

  if (!dryRun && !force && cacheHashMatchesCurrent && missingBucketKeys.size === 0) {
    cacheHit = true;
    if (Object.keys(previousFileRecords).length === 0 || Object.keys(previousFileHashes).length === 0) {
      await fs.writeFile(
        cacheFile,
        JSON.stringify(
          {
            filesHash,
            fileHashes,
            fileRecords,
          },
          null,
          2
        ),
        'utf8'
      );
    }
    console.log(`[seed-assets-${modeLabel}] cache hit, skipping uploads (resources unchanged).`);
  } else if (!dryRun) {
    if (!force && cachedRecord) {
      filesToUpload = files.filter(
        (file) =>
          effectivePreviousFileHashes[file.relativePath] !== fileHashes[file.relativePath] ||
          missingBucketKeys.has(file.relativePath)
      );
      if (filesToUpload.length > 0) {
        if (resumeActive) {
          console.log(`[seed-assets-${modeLabel}] resuming pending seed with ${filesToUpload.length} remaining file(s).`);
        } else {
          console.log(`[seed-assets-${modeLabel}] detected ${filesToUpload.length} changed file(s); uploading incrementally.`);
        }
        console.log(`[seed-assets-${modeLabel}] upload transport: ${describeUploadTransport(useWorkerAssetApi, filesToUpload)}.`);
      }
    } else if (missingBucketKeys.size > 0) {
      filesToUpload = files.filter((file) => missingBucketKeys.has(file.relativePath));
      console.log(`[seed-assets-${modeLabel}] upload transport: ${describeUploadTransport(useWorkerAssetApi, filesToUpload)}.`);
    }

    const progressFileHashes: Record<string, string> = { ...effectivePreviousFileHashes };
    const progressFileRecords: Record<string, SeedCacheFileRecord> = {
      ...previousFileRecords,
    };
    let pendingWriteCount = 0;
    const persistProgress = async (): Promise<void> => {
      await fs.writeFile(
        cacheFile,
        JSON.stringify(
          {
            filesHash: cachedRecord?.filesHash ?? '',
            pendingFilesHash: filesHash,
            fileHashes: progressFileHashes,
            fileRecords: progressFileRecords,
          },
          null,
          2
        ),
        'utf8'
      );
    };

    await runWithConcurrency(filesToUpload, uploadConcurrency, async (file) => {
      try {
        if (shouldUseWorkerAssetApiForFile(useWorkerAssetApi, file)) {
          await runWorkerPut(verifyBaseUrl, file.relativePath, file.fullPath);
        } else {
          await runWranglerPut(
            bucketName,
            file.relativePath,
            file.fullPath,
            wranglerConfigPath,
            envName,
            localMode
          );
        }
        uploadedFiles += 1;
        progressFileHashes[file.relativePath] = fileHashes[file.relativePath];
        progressFileRecords[file.relativePath] = fileRecords[file.relativePath];
        pendingWriteCount += 1;
        if (pendingWriteCount >= 50) {
          await persistProgress();
          pendingWriteCount = 0;
        }
        if (uploadedFiles % 50 === 0) {
          console.log(`[seed-assets-${modeLabel}] uploaded ${uploadedFiles}/${filesToUpload.length}`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        fatalErrors.push(message);
        if (!continueOnError) {
          throw error;
        }
        console.warn(`[seed-assets-${modeLabel}] upload failed (continuing): ${message.split('\n')[0]}`);
      }
    });

    if (cachedRecord && !force && allowDelete && !resumeActive) {
      const deletedKeys = Object.keys(previousFileHashes).filter((relativePath) => !(relativePath in fileHashes));
      if (deletedKeys.length > 0) {
        console.log(`[seed-assets-${modeLabel}] deleting ${deletedKeys.length} removed file(s) from bucket.`);
      }
      await runWithConcurrency(deletedKeys, uploadConcurrency, async (relativePath) => {
        try {
          if (useWorkerAssetApi) {
            await runWorkerDelete(verifyBaseUrl, relativePath);
          } else {
            await runWranglerDelete(bucketName, relativePath, wranglerConfigPath, envName, localMode);
          }
          deletedFiles += 1;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          fatalErrors.push(message);
          if (!continueOnError) {
            throw error;
          }
          console.warn(`[seed-assets-${modeLabel}] delete failed (continuing): ${message.split('\n')[0]}`);
        }
      });
    if (pendingWriteCount > 0) {
      await persistProgress();
    }
    } else if (cachedRecord && !force && !allowDelete && !resumeActive) {
      const deletedKeys = Object.keys(previousFileHashes).filter((relativePath) => !(relativePath in fileHashes));
      if (deletedKeys.length > 0) {
        console.log(`[seed-assets-${modeLabel}] delete pass skipped (${deletedKeys.length} stale key(s)); enable with --allow-delete.`);
      }
      if (pendingWriteCount > 0) {
        await persistProgress();
      }
    } else if (pendingWriteCount > 0) {
      await persistProgress();
    }

    await fs.writeFile(
      cacheFile,
      JSON.stringify(
        {
          filesHash,
          pendingFilesHash: undefined,
          fileHashes,
          fileRecords,
        },
        null,
        2
      ),
      'utf8'
    );
  }

  await fs.writeFile(
    reportFile,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        resourcesDir,
        generatedSlicesDir,
        files: files.length,
        changedFiles: cacheHit ? 0 : filesToUpload.length,
        deletedFiles,
        totalBytes,
        bucketName,
        envName,
        mode: dryRun ? 'dry-run' : cacheHit ? 'cache-hit' : `${modeLabel}-upload`,
        uploadedFiles,
        filesHash,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`[seed-assets-${modeLabel}] scanned ${files.length} files (${totalBytes} bytes) from ${resourcesDir}`);
  if (dryRun) {
    console.log(`[seed-assets-${modeLabel}] dry-run mode, no uploads executed.`);
  } else {
    console.log(
      `[seed-assets-${modeLabel}] uploaded ${uploadedFiles} files to ${localMode ? 'local' : 'remote'} R2 bucket "${bucketName}".`
    );
  }
  console.log(`[seed-assets-${modeLabel}] wrote report ${reportFile}`);
  console.log(`[seed-assets-${modeLabel}] ${modeLabel} seeding completed.`);

  if (fatalErrors.length > 0) {
    console.warn(`[seed-assets-${modeLabel}] ${fatalErrors.length} operation(s) failed.`);
    if (!continueOnError) {
      throw new Error('Seed assets failed with one or more errors.');
    }
  }
}

main().catch((error) => {
  console.error(`[seed-assets-${process.argv.includes('--remote') ? 'remote' : 'local'}] failed`, error);
  process.exit(1);
});
