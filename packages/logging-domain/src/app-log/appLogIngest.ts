import type { LogEntry } from '../types/logEntry';
import { listAppNdjsonFiles } from './appNdjsonWriter';

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

export type FileProgress = { size: number; offset: number };
export type IngestState = { files: Record<string, FileProgress> };

export function createIngestState(): IngestState {
  return { files: {} };
}

function parseNdjsonChunk(chunk: string): LogEntry[] {
  const lines = chunk.split('\n').filter((line) => line.trim());
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

export function getNewEntries(
  scope: string,
  state: IngestState,
  dbDir?: string
): { entries: LogEntry[]; updatedState: IngestState } {
  if (!fs) return { entries: [], updatedState: state };

  const files = listAppNdjsonFiles(scope, dbDir);
  const entries: LogEntry[] = [];
  const updatedFiles: Record<string, FileProgress> = { ...state.files };

  for (const filePath of files) {
    const stat = fs.statSync(filePath);
    const size = stat.size;
    const key = filePath.replace(/\\/g, '/');
    const prev = updatedFiles[key];

    if (!prev) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const parsed = parseNdjsonChunk(content);
      entries.push(...parsed);
      updatedFiles[key] = { size, offset: size };
    } else if (size > prev.offset) {
      const fd = fs.openSync(filePath, 'r');
      const buffer = Buffer.alloc(size - prev.offset);
      fs.readSync(fd, buffer, 0, buffer.length, prev.offset);
      fs.closeSync(fd);
      const chunk = buffer.toString('utf-8');
      const parsed = parseNdjsonChunk(chunk);
      entries.push(...parsed);
      updatedFiles[key] = { size, offset: size };
    }
  }

  return {
    entries,
    updatedState: { files: updatedFiles },
  };
}

export function hasPendingEntries(
  scope: string,
  state: IngestState,
  dbDir?: string
): boolean {
  if (!fs) return false;

  const files = listAppNdjsonFiles(scope, dbDir);
  for (const filePath of files) {
    const stat = fs.statSync(filePath);
    const size = stat.size;
    const key = filePath.replace(/\\/g, '/');
    const prev = state.files[key];
    if (!prev || size > prev.offset) return true;
  }
  return false;
}
