#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { RunType } from '../src/test-log/types';
import { wipeNdjsonScope } from '../src/test-log/wipeNdjsonScope';
import { createEmptyTestNdjsonFiles } from '../src/test-log/ndjsonLogFileWriter';
import type { LogsTreeScope } from '../src/test-log/logsTree';
import { asFileKey, asTestName } from '../src/test-log/ndjsonBrands';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const DEFAULT_OUTPUT_DIR = path.join(PACKAGE_ROOT, 'logs');

const CONSUMER = 'cloudflare';
const LOG_BRIDGE_OUTPUT_ENV = 'LOG_BRIDGE_OUTPUT';

function getOutputDir(): string {
  const env = process.env[LOG_BRIDGE_OUTPUT_ENV];
  if (env && typeof env === 'string' && env.trim()) return path.resolve(env.trim());
  return DEFAULT_OUTPUT_DIR;
}

function findTestFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) files.push(...findTestFiles(full));
    else if (e.name.endsWith('.test.ts')) files.push(full);
  }
  return files.sort();
}

function extractTestNamesFromFile(filePath: string): string[] {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const names: string[] = [];
    const re = /(?:it|test)\s*\(\s*['"]([^'"]*)['"]/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const name = m[1]?.trim();
      if (name && !names.includes(name)) names.push(name);
    }
    return names;
  } catch {
    return [];
  }
}

function parseArgs(): {
  wipe: boolean;
  prepare: boolean;
  runType: RunType;
  testsDir: string | null;
} {
  let wipe = false;
  let prepare = false;
  let runType: RunType = (process.env.LOG_BRIDGE_RUN_TYPE as RunType) ?? RunType.SinglePool;
  let testsDir: string | null = null;

  for (const arg of process.argv.slice(2)) {
    if (arg === '--wipe') wipe = true;
    else if (arg === '--prepare') prepare = true;
    else if (arg.startsWith('--run-type=')) {
      const v = arg.slice('--run-type='.length).trim();
      if (Object.values(RunType).includes(v as RunType)) runType = v as RunType;
    } else if (arg.startsWith('--tests-dir=')) {
      testsDir = path.resolve(arg.slice('--tests-dir='.length).trim());
    }
  }

  return { wipe, prepare, runType, testsDir };
}

function runWipe(outputDir: string): void {
  const { wiped } = wipeNdjsonScope(
    { runTypes: [RunType.SinglePool, RunType.SingleThreads], suiteType: 'all' },
    outputDir
  );
  if (wiped.length > 0) process.stdout.write('Wiped ' + wiped.join(', ') + '\n');
  else process.stdout.write('Created ' + path.join(outputDir, CONSUMER) + '\n');
}

const SUITE_TYPES = ['unit', 'integration', 'e2e', 'websocket', 'contract'] as const;

function runPrepare(outputDir: string, runType: RunType, testsDir: string): void {
  if (!fs.existsSync(testsDir)) {
    process.stderr.write('Tests dir does not exist: ' + testsDir + '\n');
    process.exit(1);
  }

  let filesCreated = 0;
  let totalFiles = 0;

  for (const suiteType of SUITE_TYPES) {
    const typeDir = path.join(testsDir, suiteType);
    if (!fs.existsSync(typeDir)) continue;
    const files = findTestFiles(typeDir);

    for (const absPath of files) {
      totalFiles += 1;
      const short = path.relative(typeDir, absPath).replace(/\\/g, '/');
      const fileKey = short.replace(/\//g, '_');
      const scope: LogsTreeScope = { consumer: CONSUMER, runType, suiteType };
      filesCreated += createEmptyTestNdjsonFiles(
        outputDir,
        scope,
        asFileKey(fileKey),
        extractTestNamesFromFile(absPath).map(asTestName)
      );
    }
  }

  process.stdout.write(
    'Prepared ' + filesCreated + ' empty .ndjson files from ' + totalFiles + ' test files\n'
  );
}

function main(): void {
  const { wipe, prepare, runType, testsDir } = parseArgs();

  const outputDir = getOutputDir();
  const cloudflareDir = path.join(outputDir, CONSUMER);
  process.stdout.write('Output: ' + path.resolve(cloudflareDir) + '\n');

  if (wipe) runWipe(outputDir);
  if (prepare) {
    if (!testsDir) {
      process.stderr.write('--prepare requires --tests-dir=<path>\n');
      process.exit(1);
    }
    runPrepare(outputDir, runType, testsDir);
  }

  if (!wipe && !prepare) {
    process.stdout.write('Usage: npx tsx scripts/prepare-ndjson-logs.ts [--wipe] [--prepare] [--run-type=single-pool|single-threads] [--tests-dir=<path>]\n');
    process.stdout.write('  --wipe       Remove logs/cloudflare and recreate empty dir\n');
    process.stdout.write('  --prepare    Create dirs + empty .ndjson per test (requires --tests-dir)\n');
    process.stdout.write('  --run-type   single-pool | single-threads | full (default: single-pool or LOG_BRIDGE_RUN_TYPE)\n');
    process.stdout.write('  --tests-dir  Root dir containing unit/, integration/, e2e/ test files\n');
    process.stdout.write('For both run types (single-pool + single-threads):\n');
    process.stdout.write('  From infra/cloudflare: npm run logs:cloudflare:prepare\n');
    process.stdout.write('  From packages/logging-domain: npm run logs:cloudflare:prepare\n');
    process.stdout.write('Example (one run type, from repo root):\n');
    process.stdout.write(
      '  npx tsx packages/logging-domain/scripts/prepare-ndjson-logs.ts --wipe --prepare --run-type=single-pool --tests-dir=infra/cloudflare/tests\n'
    );
  }
}

main();
