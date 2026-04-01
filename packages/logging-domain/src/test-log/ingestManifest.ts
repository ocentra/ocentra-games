import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_DB_DIR, DEFAULT_DOMAIN, LOG_DB_DOMAIN_ENV } from '@/test-log/testLogDuckDb';

type FileEntry = { size: number; mtime: number; hash: string };
type Manifest = { files: Record<string, FileEntry>; lastIngest: number };

function fileHash(filePath: string): string {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

export function getManifestPath(domain?: string): string {
  const effective = domain ?? process.env[LOG_DB_DOMAIN_ENV] ?? DEFAULT_DOMAIN;
  const filename = `ingest-manifest-${effective}.json`;
  return path.join(DEFAULT_DB_DIR, filename);
}

export function loadManifest(domain?: string): Manifest {
  const p = getManifestPath(domain);
  if (!fs.existsSync(p)) {
    return { files: {}, lastIngest: 0 };
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf-8')) as Manifest;
  } catch {
    return { files: {}, lastIngest: 0 };
  }
}

export function saveManifest(manifest: Manifest, domain?: string): void {
  const p = getManifestPath(domain);
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(p, JSON.stringify(manifest, null, 2), 'utf-8');
}

function walkDir(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const files: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.resolve(path.join(dir, entry.name));
    if (entry.isDirectory()) {
      files.push(...walkDir(fullPath));
    } else if (entry.name.endsWith('.ndjson')) {
      files.push(fullPath);
    }
  }
  return files;
}

export function getChangedFiles(logsDir: string, domain?: string): { newFiles: string[]; changedFiles: string[]; manifest: Manifest } {
  const manifest = loadManifest(domain);
  const currentFiles = walkDir(path.resolve(logsDir));
  const newFiles: string[] = [];
  const changedFiles: string[] = [];

  for (const filePath of currentFiles) {
    const stat = fs.statSync(filePath);
    const key = path.resolve(filePath);
    const entry = manifest.files[key] ?? manifest.files[filePath];
    if (!entry) {
      newFiles.push(filePath);
      continue;
    }
    if (entry.size === stat.size && entry.mtime === stat.mtimeMs && entry.hash) {
      continue;
    }
    const currentHash = fileHash(filePath);
    if (entry.hash !== currentHash) {
      changedFiles.push(filePath);
    }
  }

  return { newFiles, changedFiles, manifest };
}

export function updateManifest(logsDir: string, domain?: string): Manifest {
  const manifest = loadManifest(domain);
  const currentFiles = walkDir(path.resolve(logsDir));

  for (const filePath of currentFiles) {
    const stat = fs.statSync(filePath);
    const hash = fileHash(filePath);
    manifest.files[path.resolve(filePath)] = { size: stat.size, mtime: stat.mtimeMs, hash };
  }
  manifest.lastIngest = Date.now();
  saveManifest(manifest, domain);
  return manifest;
}

export function needsIngest(logsDir: string, domain?: string): boolean {
  const { newFiles, changedFiles } = getChangedFiles(logsDir, domain);
  return newFiles.length > 0 || changedFiles.length > 0;
}
