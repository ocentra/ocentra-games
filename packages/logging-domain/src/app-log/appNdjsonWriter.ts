import { DEFAULT_DB_DIR } from '../core/constants';
import type { LogEntry } from '../types/logEntry';


// Helper to get Node modules safely in Vite/Browser environments
function getNodeModule<T>(name: string): T | null {
  if (typeof process === 'undefined' || !process.versions?.node) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(name);
  } catch {
    return null;
  }
}

const fs = getNodeModule<typeof import('fs')>('fs');
const path = getNodeModule<typeof import('path')>('path');

export function getAppNdjsonDir(scope: string, dbDir?: string): string {
  if (!path || !fs) return '';
  const base = dbDir ?? DEFAULT_DB_DIR;
  const dir = path.join(base, 'ndjson', scope);

  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
      console.warn(`[AppNdjsonWriter] Failed to create directory ${dir}:`, err);
    }
  }
  return dir;
}

export function getCurrentNdjsonPath(scope: string, dbDir?: string): string {
  if (!path) return '';
  const dir = getAppNdjsonDir(scope, dbDir);
  const dateStr = new Date().toISOString().slice(0, 10);
  return path.join(dir, `app-logs-${dateStr}.ndjson`);
}

export function appendLogEntries(scope: string, entries: LogEntry[], dbDir?: string): void {
  if (entries.length === 0) return;
  if (!fs) return;

  const filePath = getCurrentNdjsonPath(scope, dbDir);
  const lines = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
  try {
    fs.appendFileSync(filePath, lines, 'utf-8');
  } catch (err) {
    console.error(`[AppNdjsonWriter] Failed to append to ${filePath}:`, err);
  }
}

export function listAppNdjsonFiles(scope: string, dbDir?: string): string[] {
  if (!path || !fs) return [];
  const base = dbDir ?? DEFAULT_DB_DIR;
  const dir = path.join(base, 'ndjson', scope);
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir).filter((n: string) => n.endsWith('.ndjson'));
  names.sort();
  return names.map((n: string) => path.join(dir, n));
}

export function readAppNdjsonFile(filePath: string): LogEntry[] {
  if (!fs || !fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line: string) => line.trim());
  const result: LogEntry[] = [];
  for (const line of lines) {
    try {
      result.push(JSON.parse(line) as LogEntry);
    } catch {
      // skip malformed lines
    }
  }
  return result;
}

/**
 * Deletes NDJSON log files for a scope, keeping only the most recent N files.
 */
export function deleteAppNdjsonFiles(scope: string, keepCount: number = 0, dbDir?: string): void {
  if (!fs) return;

  const files = listAppNdjsonFiles(scope, dbDir);
  const toDelete = files.slice(0, Math.max(0, files.length - keepCount));

  for (const filePath of toDelete) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.warn(`[AppNdjsonWriter] Failed to delete ${filePath}:`, err);
    }
  }
}
