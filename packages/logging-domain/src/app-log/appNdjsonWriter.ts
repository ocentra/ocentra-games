import * as fs from 'fs';
import * as path from 'path';
import { DEFAULT_DB_DIR } from '../test-log/testLogDuckDb';
import type { LogEntry } from '../types/logEntry';

export function getAppNdjsonDir(scope: string, dbDir?: string): string {
  const base = dbDir ?? DEFAULT_DB_DIR;
  const dir = path.join(base, 'ndjson', scope);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function getCurrentNdjsonPath(scope: string, dbDir?: string): string {
  const dir = getAppNdjsonDir(scope, dbDir);
  const dateStr = new Date().toISOString().slice(0, 10);
  return path.join(dir, `app-logs-${dateStr}.ndjson`);
}

export function appendLogEntries(scope: string, entries: LogEntry[], dbDir?: string): void {
  if (entries.length === 0) return;
  const filePath = getCurrentNdjsonPath(scope, dbDir);
  const lines = entries.map((e) => JSON.stringify(e)).join('\n') + '\n';
  fs.appendFileSync(filePath, lines, 'utf-8');
}

export function listAppNdjsonFiles(scope: string, dbDir?: string): string[] {
  const base = dbDir ?? DEFAULT_DB_DIR;
  const dir = path.join(base, 'ndjson', scope);
  if (!fs.existsSync(dir)) return [];
  const names = fs.readdirSync(dir).filter((n) => n.endsWith('.ndjson'));
  names.sort();
  return names.map((n) => path.join(dir, n));
}

export function readAppNdjsonFile(filePath: string): LogEntry[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter((line) => line.trim());
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

export function deleteAppNdjsonFiles(scope: string, dbDir?: string): void {
  const files = listAppNdjsonFiles(scope, dbDir);
  for (const filePath of files) {
    fs.unlinkSync(filePath);
  }
}
