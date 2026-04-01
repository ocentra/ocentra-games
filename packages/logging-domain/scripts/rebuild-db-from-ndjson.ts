#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { getDefaultDbPath, TestLogDuckDb, DEFAULT_DOMAIN } from '../src/test-log/testLogDuckDb';
import { getChangedFiles, updateManifest, getManifestPath } from '../src/test-log/ingestManifest';
import { RunType } from '../src/test-log/types';

const VALID_RUN_TYPES: readonly string[] = [
  RunType.Single,
  RunType.Full,
  RunType.SinglePool,
  RunType.SingleThreads,
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const NDJSON_BASE = path.join(PACKAGE_ROOT, 'logs', 'cloudflare');

const FLAG_NO_DELETE = '--no-delete';
const ARG_DOMAIN = '--domain=';
const ARG_RUN_TYPE = '--run-type=';
const ARG_SUITE_TYPE = '--suite-type=';

function discoverRunTypes(ndjsonBaseDir: string): string[] {
  if (!fs.existsSync(ndjsonBaseDir)) return [];
  const entries = fs.readdirSync(ndjsonBaseDir, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
}

function collectNdjsonPaths(
  ndjsonBaseDir: string,
  runType: string,
  suiteType?: string | null
): string[] {
  const runTypeDir = path.join(path.resolve(ndjsonBaseDir), runType);
  if (!fs.existsSync(runTypeDir)) return [];
  const startDir = suiteType != null && suiteType.trim() !== '' ? path.join(runTypeDir, suiteType.trim()) : runTypeDir;
  if (suiteType != null && suiteType.trim() !== '' && !fs.existsSync(startDir)) return [];
  const out: string[] = [];
  function walk(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.ndjson')) out.push(full);
    }
  }
  walk(startDir);
  return out.sort();
}

function parseDomain(): string {
  for (const arg of process.argv) {
    if (arg.startsWith(ARG_DOMAIN)) return arg.slice(ARG_DOMAIN.length).trim() || DEFAULT_DOMAIN;
  }
  return DEFAULT_DOMAIN;
}

function parseScope(): { runType?: string; suiteType?: string } {
  let runType: string | undefined;
  let suiteType: string | undefined;
  for (const arg of process.argv) {
    if (arg.startsWith(ARG_RUN_TYPE)) {
      const v = arg.slice(ARG_RUN_TYPE.length).trim();
      if (VALID_RUN_TYPES.includes(v)) runType = v;
    } else if (arg.startsWith(ARG_SUITE_TYPE)) {
      suiteType = arg.slice(ARG_SUITE_TYPE.length).trim() || undefined;
    }
  }
  return { runType, suiteType };
}

async function main(): Promise<void> {
  const noDelete = process.argv.includes(FLAG_NO_DELETE);
  const domain = parseDomain();
  const scope = parseScope();
  const dbPath = getDefaultDbPath(domain);
  const manifestPath = getManifestPath(domain);

  process.stdout.write(`\n[1/4] Config\n`);
  process.stdout.write(`  Domain: ${domain}\n`);
  process.stdout.write(`  DB: ${dbPath}\n`);
  process.stdout.write(`  Manifest: ${path.basename(manifestPath)}\n`);
  process.stdout.write(`  NDJSON base: ${NDJSON_BASE}\n`);
  if (scope.runType) {
    process.stdout.write(`  Scope: run_type=${scope.runType}${scope.suiteType ? ` suite_type=${scope.suiteType}` : ''}\n`);
  }
  process.stdout.write(`\n`);

  const scopedUpdate = scope.runType != null;

  if (scopedUpdate) {
    if (!fs.existsSync(dbPath)) {
      process.stdout.write(`  DB does not exist; will create and ingest scope only.\n`);
    }
  } else if (!noDelete && fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    process.stdout.write(`  (previous DB removed)\n`);
  }
  process.stdout.write(`\n`);

  process.stdout.write(`[2/4] Discover run types\n`);
  const discovered = discoverRunTypes(NDJSON_BASE);
  const runTypes = scopedUpdate
    ? [scope.runType!]
    : discovered.filter((r) => VALID_RUN_TYPES.includes(r));
  if (runTypes.length === 0) {
    process.stdout.write(`  No run-type dirs under NDJSON base. Nothing to ingest.\n`);
    process.exit(0);
  }
  if (!scopedUpdate) {
    const skipped = discovered.filter((r) => !VALID_RUN_TYPES.includes(r));
    if (skipped.length > 0) {
      process.stdout.write(`  Skipped (invalid run_type for DB): ${skipped.join(', ')}\n`);
    }
  }
  process.stdout.write(`  Found: ${runTypes.join(', ')}\n`);
  if (scopedUpdate) {
    process.stdout.write(`  Mode: scoped replace (remove old scope, ingest scope)\n`);
  } else if (noDelete) {
    process.stdout.write(`  Mode: incremental (--no-delete)\n`);
  } else {
    process.stdout.write(`  Mode: full rebuild\n`);
  }
  process.stdout.write(`\n`);

  process.stdout.write(`[3/4] Ingest NDJSON -> DuckDB\n`);
  const db = await TestLogDuckDb.create({ dbPath });
  let totalRuns = 0;
  let totalLogs = 0;
  let scopedIngestExecuted = true;

  try {
    if (scopedUpdate) {
      const pathsByRunType = new Map<string, string[]>();
      let totalScopedPaths = 0;
      for (const runType of runTypes) {
        const paths = collectNdjsonPaths(NDJSON_BASE, runType, scope.suiteType);
        pathsByRunType.set(runType, paths);
        totalScopedPaths += paths.length;
      }

      if (totalScopedPaths === 0) {
        scopedIngestExecuted = false;
        process.stdout.write(`  Scoped ingest has no ndjson files; keeping existing DB scope unchanged.\n`);
        for (const runType of runTypes) {
          process.stdout.write(`  ${runType}: no ndjson files in scope, skip\n`);
        }
      } else {
        await db.deleteByScope(scope.runType! as RunType, scope.suiteType ?? null);
        process.stdout.write(`  Deleted scope: run_type=${scope.runType}${scope.suiteType ? ` suite_type=${scope.suiteType}` : ''}\n`);
        for (const runType of runTypes) {
          const paths = pathsByRunType.get(runType) ?? [];
          if (paths.length === 0) {
            process.stdout.write(`  ${runType}: no ndjson files in scope, skip\n`);
            continue;
          }
          process.stdout.write(`  ${runType}: ingesting ${paths.length} ndjson files...\n`);
          const result = await db.ingestFromNdjson(
            NDJSON_BASE,
            runType as RunType,
            undefined,
            paths,
            scope.suiteType ?? null
          );
          totalRuns += result.runsInserted;
          totalLogs += result.logsInserted;
          process.stdout.write(`  ${runType}: -> ${result.runsInserted} runs, ${result.logsInserted} logs\n`);
        }
      }
    } else if (noDelete) {
      for (const runType of runTypes) {
        const logsDir = path.join(NDJSON_BASE, runType);
        const { newFiles, changedFiles } = getChangedFiles(logsDir, domain);
        const filesToIngest = [...newFiles, ...changedFiles];
        if (filesToIngest.length === 0) {
          process.stdout.write(`  ${runType}: no new/changed files, skip\n`);
          continue;
        }
        const result = await db.ingestFromNdjson(
          NDJSON_BASE,
          runType as RunType,
          undefined,
          filesToIngest
        );
        totalRuns += result.runsInserted;
        totalLogs += result.logsInserted;
        updateManifest(logsDir, domain);
        process.stdout.write(`  ${runType}: ${filesToIngest.length} ndjson -> ${result.runsInserted} runs, ${result.logsInserted} logs\n`);
      }
    } else {
      for (const runType of runTypes) {
        const paths = collectNdjsonPaths(NDJSON_BASE, runType);
        process.stdout.write(`  ${runType}: ingesting ${paths.length} ndjson files...\n`);
        const result = await db.ingestFromNdjson(
          NDJSON_BASE,
          runType as RunType,
          undefined,
          paths
        );
        totalRuns += result.runsInserted;
        totalLogs += result.logsInserted;
        process.stdout.write(`  ${runType}: -> ${result.runsInserted} runs, ${result.logsInserted} logs\n`);
      }
    }
  } finally {
    await db.close();
  }
  process.stdout.write(`\n`);

  process.stdout.write(`[4/4] Update manifest\n`);
  if (!noDelete || (scopedUpdate && scopedIngestExecuted)) {
    for (const runType of runTypes) {
      const manifestDir = scope.suiteType
        ? path.join(NDJSON_BASE, runType, scope.suiteType)
        : path.join(NDJSON_BASE, runType);
      updateManifest(manifestDir, domain);
    }
  } else if (scopedUpdate && !scopedIngestExecuted) {
    process.stdout.write(`  Skipped manifest update (no scoped ndjson files ingested)\n`);
  }
  process.stdout.write(`  Written: ${manifestPath}\n`);
  process.stdout.write(`  (query tool uses this to detect stale DB; no ingest on query until NDJSON changes)\n`);
  process.stdout.write(`\n`);

  process.stdout.write(`Done.\n`);
  process.stdout.write(`  Total: ${totalRuns} runs, ${totalLogs} logs\n`);
  process.stdout.write(`  DB: ${dbPath}\n`);
  process.stdout.write(`  Manifest: ${path.basename(manifestPath)}\n`);
  process.stdout.write(`  Next: npm run test:query -- failed --run-type=single-pool (or test:query:failed:pool from infra/cloudflare)\n\n`);
}

main().catch((err) => {
  process.stderr.write(err instanceof Error ? err.message : String(err));
  if (err instanceof Error && err.stack) process.stderr.write('\n' + err.stack);
  process.exit(1);
});
