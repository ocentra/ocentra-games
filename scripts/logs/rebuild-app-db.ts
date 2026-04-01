#!/usr/bin/env node

import * as fs from 'fs';
import { AppLogDuckDb, getDefaultAppDbPath } from '@ocentra/logging-domain/app-log/appLogDuckDb';
import {
  listAppNdjsonFiles,
  readAppNdjsonFile,
} from '@ocentra/logging-domain/app-log/appNdjsonWriter';

function getScopeArg(): string {
  const eq = process.argv.find((a) => a.startsWith('--scope='));
  if (eq) return eq.split('=')[1] ?? 'main';
  const idx = process.argv.indexOf('--scope');
  return idx >= 0 && process.argv[idx + 1] ? process.argv[idx + 1] : 'main';
}
const scopeArg = getScopeArg();
const scope = scopeArg === 'vite' ? 'vite' : scopeArg === 'all' ? 'all' : 'main';

async function rebuildScope(s: string): Promise<{ entries: number; files: number }> {
  const dbPath = getDefaultAppDbPath(s);
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const files = listAppNdjsonFiles(s);
  if (files.length === 0) {
    console.log(`No NDJSON files for scope ${s}.`);
    return { entries: 0, files: 0 };
  }
  const allEntries: import('@ocentra/logging-domain/types/logEntry').LogEntry[] = [];
  for (const filePath of files) {
    allEntries.push(...readAppNdjsonFile(filePath));
  }
  if (allEntries.length === 0) {
    console.log(`Rebuilt ${s}-log.duckdb: 0 entries from ${files.length} files.`);
    return { entries: 0, files: files.length };
  }
  const db = await AppLogDuckDb.create(dbPath);
  try {
    const inserted = await db.insertBatch(allEntries);
    console.log(`Rebuilt ${s}-log.duckdb: ${inserted} entries from ${files.length} files.`);
    return { entries: inserted, files: files.length };
  } finally {
    await db.close();
  }
}

async function main(): Promise<void> {
  if (scope === 'all') {
    const mainResult = await rebuildScope('main');
    const viteResult = await rebuildScope('vite');
    console.log(`Total: ${mainResult.entries + viteResult.entries} entries from ${mainResult.files + viteResult.files} files.`);
  } else {
    await rebuildScope(scope);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
