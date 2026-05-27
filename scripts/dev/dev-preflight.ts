#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type PreflightMode = 'assets' | 'exports';

type PreflightCacheRecord = {
  version: number;
  hash: string;
  generatedAt: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const CACHE_DIR = path.join(ROOT, '.temp', 'dev-preflight');
const CACHE_VERSION = 1;
const FORCE = process.argv.includes('--force') || process.env.OCENTRA_DEV_PREFLIGHT_FORCE === '1';

function readJson<T>(filePath: string): T | null {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8')) as T;
  } catch {
    return null;
  }
}

function collectFileStats(root: string, include: (filePath: string) => boolean): string[] {
  if (!existsSync(root)) {
    return [];
  }

  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== 'dist' && entry.name !== '.turbo') {
          walk(fullPath);
        }
        continue;
      }
      if (!include(fullPath)) {
        continue;
      }
      const stat = statSync(fullPath);
      out.push(`${path.relative(ROOT, fullPath).replace(/\\/g, '/')}|${stat.size}|${Math.trunc(stat.mtimeMs)}`);
    }
  };
  walk(root);
  return out;
}

function hashEntries(entries: readonly string[]): string {
  const hash = createHash('sha256');
  for (const entry of [...entries].sort((left, right) => left.localeCompare(right))) {
    hash.update(entry);
    hash.update('\n');
  }
  return hash.digest('hex');
}

function computeAssetHash(): string {
  return hashEntries([
    ...collectFileStats(path.join(ROOT, 'packages', 'asset-editor', 'Resources'), (filePath) =>
      filePath.endsWith('.asset')
    ),
    ...collectFileStats(path.join(ROOT, 'packages', 'game-asset-domain', 'src'), (filePath) =>
      filePath.endsWith('.ts')
    ),
    ...collectFileStats(path.join(ROOT, 'scripts'), (filePath) =>
      filePath.endsWith('validate-game-assets-strict.mjs')
    ),
  ]);
}

function computeExportsHash(): string {
  return hashEntries(
    collectFileStats(path.join(ROOT, 'packages'), (filePath) => path.basename(filePath) === 'package.json')
  );
}

function cachePath(mode: PreflightMode): string {
  return path.join(CACHE_DIR, `${mode}.json`);
}

function isCacheCurrent(mode: PreflightMode, hash: string, requiredOutput?: string): boolean {
  if (FORCE || (requiredOutput && !existsSync(requiredOutput))) {
    return false;
  }
  const record = readJson<PreflightCacheRecord>(cachePath(mode));
  return record?.version === CACHE_VERSION && record.hash === hash;
}

function writeCache(mode: PreflightMode, hash: string): void {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(
    cachePath(mode),
    JSON.stringify(
      {
        version: CACHE_VERSION,
        hash,
        generatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    'utf8'
  );
}

function runCommand(label: string, command: string): void {
  console.log(`[dev:preflight] ${label}`);
  execSync(command, {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

function runAssetPreflight(): void {
  const hash = computeAssetHash();
  if (isCacheCurrent('assets', hash)) {
    console.log('[dev:preflight] Game asset validation skipped (worktree cache hit).');
    return;
  }
  runCommand('Validating game assets.', 'node scripts/validate-game-assets-strict.mjs');
  writeCache('assets', hash);
}

function runExportsPreflight(): void {
  const hash = computeExportsHash();
  const outputPath = path.join(ROOT, 'exports-flattened.json');
  if (isCacheCurrent('exports', hash, outputPath)) {
    console.log('[dev:preflight] Export refresh skipped (worktree cache hit).');
    return;
  }
  runCommand('Refreshing generated exports.', 'npx tsx scripts/generate-exports-flattened.ts');
  writeCache('exports', hash);
}

const argv = process.argv.slice(2);
const runAssets = argv.includes('--assets') || argv.includes('--all') || argv.length === 0;
const runExports = argv.includes('--exports') || argv.includes('--all') || argv.length === 0;

if (runAssets) {
  runAssetPreflight();
}
if (runExports) {
  runExportsPreflight();
}
