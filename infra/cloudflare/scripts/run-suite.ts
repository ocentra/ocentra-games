#!/usr/bin/env node

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { TestSuiteType } from '@ocentra/logging-domain/test-log/types';
import { RunType } from '@ocentra/logging-domain/test-log/types';
import { TestRunMode } from '../src/constants/test-run-mode.js';
import { TestEnvVar } from '../tests/constants/test-constants.js';
import { runSuiteTypeCollector } from '../test-runner/script/lib/suite-type-collector.js';
import {
  SUITE_TYPE_TO_DIR,
  getUnitPhaseFiles,
  getIntegrationPhaseFiles,
  getE2EPhaseFiles,
} from '../test-runner/script/lib/suite-type-map.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CWD = path.resolve(__dirname, '..');
const CURRENT_RUN_PATH = path.join(CWD, 'tests', '.test-storage', 'current-run.json');

function readRunIdFromCurrentRun(): string | null {
  try {
    if (!fs.existsSync(CURRENT_RUN_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(CURRENT_RUN_PATH, 'utf-8')) as { runId?: string };
    return data.runId && typeof data.runId === 'string' ? data.runId : null;
  } catch {
    return null;
  }
}

const ARG_TYPE = '--type=';
const ARG_MODE = '--mode=';
const ARG_FILE = '--file=';
const SUITE_TYPES = [
  TestSuiteType.Unit,
  TestSuiteType.Integration,
  TestSuiteType.E2E,
  TestSuiteType.Contract,
] as const;
type SuiteType = (typeof SUITE_TYPES)[number];
const MODES = ['pool', 'threads'] as const;
type Mode = (typeof MODES)[number];

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

function getFilesForType(type: SuiteType): string[] {
  const dirName = SUITE_TYPE_TO_DIR[type] ?? type;
  const dir = path.join(CWD, 'tests', dirName);
  return findTestFiles(dir);
}

function ensureSuiteTypeMap(): void {
  const data = runSuiteTypeCollector(CWD);
  const mapPath = path.join(CWD, 'test-runner', 'suite-type-map.json');
  const mapDir = path.dirname(mapPath);
  if (!fs.existsSync(mapDir)) fs.mkdirSync(mapDir, { recursive: true });
  fs.writeFileSync(mapPath, JSON.stringify(data, null, 2), 'utf-8');
}

const VITEST_POOL_MAX_WORKERS_ENV = 'VITEST_POOL_MAX_WORKERS';

function getPoolMaxWorkersExtraArgs(): string[] {
  const raw = process.env[VITEST_POOL_MAX_WORKERS_ENV];
  if (raw === undefined || raw === '') return [];
  const n = parseInt(raw, 10);
  if (!Number.isInteger(n) || n < 1) return [];
  return ['--maxWorkers=' + String(n)];
}

function runTestRunner(
  type: SuiteType,
  mode: TestRunMode,
  relativePaths: string[],
  extraArgs: string[] = []
): number {
  const env: NodeJS.ProcessEnv = { ...process.env, [TestEnvVar.TestRunType]: mode === TestRunMode.Unstable ? RunType.SingleThreads : RunType.SinglePool };
  if (!env[TestEnvVar.TestRunId]) {
    const runId = readRunIdFromCurrentRun();
    if (runId) env[TestEnvVar.TestRunId] = runId;
  }
  const modeArg = ' --mode=' + mode;
  const pathArgs = relativePaths.map((p) => p.replace(/\\/g, '/')).join(' ');
  const extra = extraArgs.length ? ' ' + extraArgs.join(' ') : '';
  const cmd = `tsx scripts/test-runner.ts --type=${type}${modeArg} ${pathArgs}${extra}`.trim();
  try {
    execSync(cmd, { cwd: CWD, stdio: 'inherit', env });
    return 0;
  } catch (err: unknown) {
    const status = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 1;
    return status ?? 1;
  }
}

function main(): number {
  let type: SuiteType = TestSuiteType.Unit;
  let mode: Mode = 'pool';
  let singleFile: string | null = null;
  const extraArgs: string[] = [];
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(ARG_TYPE)) {
      const v = arg.slice(ARG_TYPE.length).toLowerCase();
      if (v === 'all') {
        console.error('[run-suite] --type=all is invalid. Use run-all-helper for full run.');
        return 1;
      }
      if (SUITE_TYPES.includes(v as SuiteType)) type = v as SuiteType;
    } else if (arg.startsWith(ARG_MODE)) {
      const v = arg.slice(ARG_MODE.length).toLowerCase();
      if (v === 'both') {
        console.error('[run-suite] --mode=both is invalid. Run pool then threads separately, or use run-all-helper.');
        return 1;
      }
      if (MODES.includes(v as Mode)) mode = v as Mode;
    } else if (arg.startsWith(ARG_FILE)) {
      const v = arg.slice(ARG_FILE.length).trim().replace(/\\/g, '/');
      if (v) singleFile = v;
    } else if (!arg.startsWith('--') && arg.endsWith('.test.ts')) {
      singleFile = arg.replace(/\\/g, '/');
    } else {
      extraArgs.push(arg);
    }
  }

  const testRunMode: TestRunMode = mode === 'threads' ? TestRunMode.Unstable : TestRunMode.Pool;
  ensureSuiteTypeMap();

  if (singleFile) {
    const relativePath = path.isAbsolute(singleFile) ? path.relative(CWD, singleFile) : singleFile;
    return runTestRunner(type, testRunMode, [relativePath], extraArgs);
  }

  if (type === TestSuiteType.Contract) {
    const files = getFilesForType(type);
    const relativePaths = files.map((f) => path.relative(CWD, f).replace(/\\/g, '/'));
    if (relativePaths.length === 0) {
      console.error('[run-suite] No test files found for type: contract (tests/contracts)');
      return 1;
    }
    return runTestRunner(type, testRunMode, relativePaths, extraArgs);
  }

  if (type === TestSuiteType.Unit) {
    const { parallelPool, sequentialPool, unstable } = getUnitPhaseFiles(CWD);
    if (testRunMode === TestRunMode.Pool) {
      let code = 0;
      if (parallelPool.length > 0) {
        const poolExtra = getPoolMaxWorkersExtraArgs();
        const c = runTestRunner(type, TestRunMode.Pool, parallelPool, [...poolExtra, ...extraArgs]);
        if (c !== 0) code = c;
      }
      if (sequentialPool.length > 0) {
        const c = runTestRunner(type, TestRunMode.Pool, sequentialPool, ['--maxWorkers=1', ...extraArgs]);
        if (c !== 0) code = c;
      }
      if (parallelPool.length === 0 && sequentialPool.length === 0) {
        console.error('[run-suite] No unit tests declared for pool (runIn=pool).');
        return 1;
      }
      return code;
    }
    if (unstable.length === 0) {
      console.error('[run-suite] No unit tests declared for threads (runIn=unstable).');
      return 1;
    }
    return runTestRunner(type, TestRunMode.Unstable, unstable, extraArgs);
  }

  if (type === TestSuiteType.Integration) {
    const { parallelPool, sequentialPool, unstable } = getIntegrationPhaseFiles(CWD);
    if (testRunMode === TestRunMode.Pool) {
      let code = 0;
      if (parallelPool.length > 0) {
        const poolExtra = getPoolMaxWorkersExtraArgs();
        const c = runTestRunner(type, TestRunMode.Pool, parallelPool, [...poolExtra, ...extraArgs]);
        if (c !== 0) code = c;
      }
      if (sequentialPool.length > 0) {
        const c = runTestRunner(type, TestRunMode.Pool, sequentialPool, ['--maxWorkers=1', ...extraArgs]);
        if (c !== 0) code = c;
      }
      if (parallelPool.length === 0 && sequentialPool.length === 0) {
        console.error('[run-suite] No integration tests declared for pool.');
        return 1;
      }
      return code;
    }
    if (unstable.length === 0) {
      console.error('[run-suite] No integration tests declared for threads.');
      return 1;
    }
    return runTestRunner(type, TestRunMode.Unstable, unstable, extraArgs);
  }

  if (type === TestSuiteType.E2E) {
    const { pool, unstable } = getE2EPhaseFiles(CWD);
    if (testRunMode === TestRunMode.Pool) {
      if (pool.length === 0) {
        console.error('[run-suite] No e2e tests declared for pool.');
        return 1;
      }
      return runTestRunner(type, TestRunMode.Pool, pool, extraArgs);
    }
    if (unstable.length === 0) {
      console.error('[run-suite] No e2e tests declared for threads.');
      return 1;
    }
    return runTestRunner(type, TestRunMode.Unstable, unstable, extraArgs);
  }

  return 1;
}

process.exit(main());
