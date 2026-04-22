import * as fs from 'fs';
import * as path from 'path';
import { deleteAppNdjsonFiles } from '@ocentra/logging-domain/app-log/appNdjsonWriter';
import { getDefaultAppDbPath } from '@ocentra/logging-domain/app-log/appLogDuckDb';

const SCOPE = 'asset-editor';

export function getAssetEditorLogDir(relativeTo?: string): string {
  const base = relativeTo ?? process.cwd();
  return path.resolve(base, '.logs');
}

export const ASSET_EDITOR_LOG_PATHS = {
  dir: '.logs',
  ndjsonDir: '.logs/ndjson/asset-editor',
  ndjsonPattern: '.logs/ndjson/asset-editor/*.ndjson',
  duckDb: '.logs/asset-editor-log.duckdb',
} as const;

export function wipeAssetEditorLogs(logDir: string): void {
  deleteAppNdjsonFiles(SCOPE, 0, logDir);
  const dbPath = getDefaultAppDbPath(SCOPE, logDir);
  for (const suffix of ['', '.wal', '.tmp']) {
    const p = dbPath + suffix;
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
}
