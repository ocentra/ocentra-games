#!/usr/bin/env node

import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { formatRunSummary } from '@ocentra/logging-domain/test-log/formatRunSummary';
import { RunType, TestSuiteType } from '@ocentra/logging-domain/test-log/types';
import {
  wipeNdjsonScope,
  type WipeScope,
  type WipeSuiteType,
} from '@ocentra/logging-domain/test-log/wipeNdjsonScope';
import { getFileKeyFromSuitePath, getSuiteTypeFromPath, getDefaultNdjsonOutputDir } from '@ocentra/logging-domain/test-log/ndjsonPaths';
import { getSummaryForTestFile, listFileKeysInScope } from '@ocentra/logging-domain/test-log/logsTree';
import { formatPerFileBlockFromSummary } from '@ocentra/logging-domain/test-log/formatPerFileBlock';
import { LogRealm } from '@ocentra/logging-domain/test-log/types';
import { TestRunMode } from '../src/constants/test-run-mode.js';
import { runSuiteTypeCollector } from '../test-runner/script/lib/suite-type-collector.js';
import {
  getUnitPhaseFiles,
  getIntegrationPhaseFiles,
  getE2EPhaseFiles,
  getContractPhaseFiles,
  getSuiteTypeWithFallback,
  SUITE_TYPE_TO_DIR,
  clearSuiteTypeMapCache,
  getWebsocketIncludeFiles,
} from '../test-runner/script/lib/suite-type-map.js';
import * as http from 'http';
import { notifyBridgeRunStarted } from '@ocentra/logging-domain/transport/bridgeTransport';
import { PUBLIC_TUNNEL_BRIDGE_URL } from '@ocentra/logging-domain/core/constants';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CWD = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(CWD, '..', '..');
const LOGGING_DOMAIN_PKG = path.join(REPO_ROOT, 'packages', 'logging-domain');

if (!process.env.LOG_DB_DOMAIN) process.env.LOG_DB_DOMAIN = 'cloudflare';
const CURRENT_RUN_PATH = path.join(CWD, 'tests', '.test-storage', 'current-run.json');
const LOG_DIR = path.join(CWD, 'test-runner', 'logs');
const TEST_RESULTS_TXT_PATH_ENV = 'TEST_RESULTS_TXT_PATH';

// eslint-disable-next-line no-control-regex -- strip ANSI for log file
const ANSI_ESCAPE = /\x1b\[[0-9;]*m/g;

function stripAnsi(s: string): string {
  return s.replace(ANSI_ESCAPE, '');
}

function getWipeScope(type: Type, mode: Mode, testFile?: string): WipeScope {
  const runTypes: RunType[] =
    mode === HelperModeBoth
      ? [RunType.SinglePool, RunType.SingleThreads]
      : mode === TestRunMode.Pool
        ? [RunType.SinglePool]
        : [RunType.SingleThreads];
  const suiteType: WipeSuiteType = type === 'all' ? 'all' : type;
  return { runTypes, suiteType, testFile };
}

type IngestScope = { runType: RunType; suiteType?: string };

function getIngestScopes(
  type: Type,
  includePool: boolean,
  includeThreads: boolean,
  includeWebsocket: boolean = false
): IngestScope[] {
  const scopes: IngestScope[] = [];
  if (includePool) scopes.push({ runType: RunType.SinglePool, suiteType: type === 'all' ? undefined : type });
  if (includeThreads) scopes.push({ runType: RunType.SingleThreads, suiteType: type === 'all' ? undefined : type });
  if (includeWebsocket && type === TestSuiteType.Integration)
    scopes.push({ runType: RunType.SinglePool, suiteType: 'websocket' });
  return scopes.filter((s) => s.runType != null);
}

function runScopedWipe(type: Type, mode: Mode, testFile?: string): void {
  const scope = getWipeScope(type, mode, testFile);
  const scopeDesc = testFile ? type + ' / ' + mode + ' / ' + testFile : type + ' / ' + mode;
  const { wiped } = wipeNdjsonScope(scope);
  const base = path.join(LOGGING_DOMAIN_PKG, 'logs', 'cloudflare');
  const targetDirs =
    scope.testFile
      ? scope.runTypes.map((rt) =>
          path.join(base, rt, getSuiteTypeFromPath(scope.testFile as string), getFileKeyFromSuitePath(scope.testFile as string))
        )
      : scope.suiteType === 'all'
      ? scope.runTypes.map((rt) => path.join(base, rt))
      : scope.runTypes.flatMap((rt) => [path.join(base, rt, scope.suiteType)]);
  const targetDesc = targetDirs.map((d) => path.relative(REPO_ROOT, d)).join(', ');
  console.log('[wipe] Scope: ' + scopeDesc + ' -> ' + targetDesc);
  if (wiped.length > 0) {
    console.log('[wipe] Cleared ' + wiped.length + ' path(s)');
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
const HelperModeBoth = 'both' as const;
const MODES = [TestRunMode.Pool, TestRunMode.Unstable, HelperModeBoth] as const;
type Type = (typeof SUITE_TYPES)[number] | 'all';
type Mode = (typeof MODES)[number];
type ParsedArgs = { type: Type; mode: Mode; file?: string };

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

function countTestsInFile(filePath: string): { total: number; runnable: number; skipped: number } {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const itTestMatches = content.match(/(?<![.\w])(?:it|test)\s*\(/g);
    const total = itTestMatches ? itTestMatches.length : 0;
    const skipMatches = content.match(/(?:it|test)\s*\.\s*(?:skip|todo)\s*\(/g);
    const skipped = skipMatches ? skipMatches.length : 0;
    const runnable = total - skipped;
    return { total, runnable, skipped };
  } catch {
    return { total: 0, runnable: 0, skipped: 0 };
  }
}

function parseArgs(): ParsedArgs {
  let type: Type = TestSuiteType.Unit;
  let mode: Mode = HelperModeBoth;
  let file: string | undefined;
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith(ARG_TYPE)) {
      const v = arg.slice(ARG_TYPE.length).toLowerCase();
      if (v === 'all') type = 'all';
      else if (SUITE_TYPES.includes(v as (typeof SUITE_TYPES)[number])) type = v as (typeof SUITE_TYPES)[number];
    } else if (arg.startsWith(ARG_MODE)) {
      const v = arg.slice(ARG_MODE.length).toLowerCase();
      if (MODES.includes(v as Mode)) mode = v as Mode;
    } else if (arg.startsWith(ARG_FILE)) {
      const v = arg.slice(ARG_FILE.length).trim();
      if (v) file = v.replace(/\\/g, '/');
    } else if (!arg.startsWith('--') && arg.endsWith('.test.ts')) {
      file = arg.replace(/\\/g, '/');
    }
  }
  if (file === undefined && process.env.npm_config_file) {
    const v = String(process.env.npm_config_file).trim().replace(/\\/g, '/');
    if (v && v.endsWith('.test.ts')) file = v;
  }
  return { type, mode, file };
}

function getFilesForType(t: Exclude<Type, 'all'>): string[] {
  const dirName = SUITE_TYPE_TO_DIR[t] ?? t;
  const dir = path.join(CWD, 'tests', dirName);
  return findTestFiles(dir);
}

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function writeCurrentRunFile(): string {
  const dir = path.dirname(CURRENT_RUN_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const runId = randomUUID();
  const startTime = new Date().toISOString();
  fs.writeFileSync(
    CURRENT_RUN_PATH,
    JSON.stringify({ runId, startTime }),
    'utf-8'
  );
  return runId;
}

function writeLog(msg: string, logPath: string): void {
  ensureLogDir();
  fs.appendFileSync(logPath, msg + '\n', 'utf-8');
}

type RunInfo = {
  runId?: string;
  passed?: number;
  failed?: number;
  timeout?: number;
  unstable?: number;
  runType?: RunType;
};

function readRunIdFromCurrentRun(): string | null {
  try {
    if (!fs.existsSync(CURRENT_RUN_PATH)) return null;
    const data = JSON.parse(fs.readFileSync(CURRENT_RUN_PATH, 'utf-8')) as { runId?: string };
    return data.runId && typeof data.runId === 'string' ? data.runId : null;
  } catch {
    return null;
  }
}

function aggregateFromNdjson(
  runId: string,
  runType: RunType,
  suiteType: string
): RunInfo {
  const scope = { consumer: LogRealm.Cloudflare, runType, suiteType };
  const logsRoot = getDefaultNdjsonOutputDir();
  const fileKeys = listFileKeysInScope(scope, logsRoot);
  let passed = 0;
  let failed = 0;
  let timeout = 0;
  let unstable = 0;
  for (const fileKey of fileKeys) {
    const summary = getSummaryForTestFile({ runId, scope, fileKey, logsRoot });
    if (!summary) continue;
    passed += summary.passed;
    failed += summary.failed;
    timeout += summary.timeout;
    unstable += summary.unstable;
  }
  return { runId, passed, failed, timeout, unstable, runType };
}

function getRunInLabel(entry: { type: string; runIn?: string | null; poolSequential?: boolean }): string {
  if (entry.type === TestSuiteType.Websocket) return 'websocket';
  if (entry.runIn === 'unstable') return 'threads';
  if (entry.poolSequential) return 'pool-seq';
  return 'pool';
}

function buildPerFileSectionFromNdjson(
  runId: string,
  runType: RunType,
  suiteType: string,
  resultsFile: string,
  onlyFileKey?: string,
  fileRel?: string
): void {
  const scope = { consumer: LogRealm.Cloudflare, runType, suiteType };
  const logsRoot = getDefaultNdjsonOutputDir();
  const fileKeys = onlyFileKey !== undefined ? [onlyFileKey] : listFileKeysInScope(scope, logsRoot);
  for (const fileKey of fileKeys) {
    const summary = getSummaryForTestFile({ runId, scope, fileKey, logsRoot });
    const testFile = path.basename(String(fileKey).replace(/\\/g, '/'));
    if (!summary) {
      if (onlyFileKey !== undefined) {
        writeLog(`[✗] ${testFile} — no NDJSON summary (runId=${runId}, runType=${runType})`, resultsFile);
        writeLog('', resultsFile);
      }
      continue;
    }
    const total = summary.passed + summary.failed + summary.timeout + summary.unstable;
    const durationMs = summary.duration_ms ?? 0;
    const ok = (summary.failed ?? 0) === 0 && (summary.timeout ?? 0) === 0;
    writeLog(`[${ok ? '✓' : '✗'}] ${testFile}  🧪 ${total} tests  ⏱ ${durationMs}ms`, resultsFile);
    if (fileRel) {
      const rerunCmd =
        suiteType === 'websocket'
          ? 'npx vitest run --config vitest.websocket.config.ts ' + fileRel
          : 'npm run test:' + suiteType + ':helper -- ' + fileRel;
      writeLog('    ' + rerunCmd, resultsFile);
    }
    writeLog('', resultsFile);
    const block = formatPerFileBlockFromSummary(summary, fileKey);
    writeLog(block.split('\n').map((l) => (l ? '    ' + l : l)).join('\n'), resultsFile);
    writeLog('', resultsFile);
  }
}

function getStatsAndFormat(runId: string, runType: RunType, info: RunInfo | null): string {
  if (!info?.runId) {
    return '\n📊 Run completed: (stats unavailable)\n🆔 Run ID: ' + runId + ' | Run Type: ' + runType + '\n';
  }
  const passed = info.passed ?? 0;
  const failed = info.failed ?? 0;
  const timeout = info.timeout ?? 0;
  const unstable = info.unstable ?? 0;
  return formatRunSummary({
    runId: info.runId,
    runType: info.runType ?? runType,
    passed,
    failed,
    timeout,
    unstable,
  });
}

type RunForTypeResult = {
  exitCode: number;
  suiteType: (typeof SUITE_TYPES)[number];
  poolFiles: number;
  poolPassed: number;
  poolFailed: number;
  poolTimeout: number;
  poolUnstable: number;
  unstableFiles: number;
  unstablePassed: number;
  unstableFailed: number;
  unstableTimeout: number;
  unstableUnstable: number;
  websocketFiles: number;
  websocketPassed: number;
  websocketFailed: number;
  websocketTimeout: number;
  websocketUnstable: number;
  lastRunId: string | null;
};

function formatElapsed(ms: number): string {
  const s = ms / 1000;
  return s >= 60 ? (s / 60).toFixed(2) + 'm' : s.toFixed(2) + 's';
}

const PREFLIGHT_IMPORTS = [
  '@ocentra/logging-domain/core/constants',
  '@ocentra/logging-domain/test-log/formatRunSummary',
  '@ocentra/logging-domain/test-log/testLogDuckDb',
  '@ocentra/logging-domain/test-log/types',
] as const;

const SKIP_LOGGING_DOMAIN_BUILD_ENV = 'SKIP_LOGGING_DOMAIN_BUILD';
const SKIP_BRIDGE_CHECK_ENV = 'SKIP_BRIDGE_CHECK';
const SKIP_LIVE_DUCKDB_ENV = 'SKIP_DUCKDB_LIVE_RUN_INSERT';
const LOG_BRIDGE_URL_ENV = 'LOG_BRIDGE_URL';
const BRIDGE_HEALTH_URL = 'http://127.0.0.1:8765/__health__';

function getBridgeBaseUrl(): string {
  return process.env[LOG_BRIDGE_URL_ENV] ?? PUBLIC_TUNNEL_BRIDGE_URL;
}

function checkBridgeHealthy(): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(BRIDGE_HEALTH_URL, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', (chunk: Buffer) => (body += chunk.toString()));
      res.on('end', () => {
        try {
          const data = JSON.parse(body) as { ok?: boolean };
          resolve(data.ok === true);
        } catch {
          resolve(false);
        }
      });
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function runPreflightBuild(): void {
  console.log('[preflight] Building @ocentra/logging-domain...');
  try {
    execSync('npm run build', {
      cwd: LOGGING_DOMAIN_PKG,
      stdio: 'inherit',
      maxBuffer: 4 * 1024 * 1024,
    });
    console.log('[preflight] logging-domain build OK.\n');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('');
    console.error('============================================================');
    console.error('Preflight failed: logging-domain build failed');
    console.error('============================================================');
    console.error('  Error:', msg);
    console.error('');
    console.error('  Fix: cd packages/logging-domain && npm run build');
    console.error('  Then retry test:helper.');
    console.error('============================================================');
    process.exit(1);
  }
}

async function runPreflightImports(): Promise<void> {
  for (const spec of PREFLIGHT_IMPORTS) {
    try {
      await import(spec);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('');
      console.error('============================================================');
      console.error('Preflight failed: @ocentra/logging-domain dependency failed');
      console.error('============================================================');
      console.error('  Specifier:', spec);
      console.error('  Error:', msg);
      console.error('');
      console.error('  Fix: ensure package exports this path; run:');
      console.error('    cd packages/logging-domain && npm run build');
      console.error('  Then retry test:helper.');
      console.error('============================================================');
      process.exit(1);
    }
  }
}

async function runPreflight(): Promise<void> {
  runPreflightBuild();
  await runPreflightImports();
  if (!process.env[SKIP_LOGGING_DOMAIN_BUILD_ENV]) {
    process.env[SKIP_LOGGING_DOMAIN_BUILD_ENV] = '1';
  }
  if (!process.env[SKIP_LIVE_DUCKDB_ENV]) {
    process.env[SKIP_LIVE_DUCKDB_ENV] = '1';
  }
}

async function ensureBridgeAndWipe(type: Type, mode: Mode, testFile?: string): Promise<void> {
  const ok = await checkBridgeHealthy();
  if (!ok) {
    console.error('');
    console.error('============================================================');
    console.error('Preflight failed: log bridge is not running');
    console.error('============================================================');
    console.error('  Start the bridge (e.g. Run Task: Start tunnel and log bridge), then retry.');
    console.error('============================================================');
    process.exit(1);
  }
  runScopedWipe(type, mode, testFile);
  if (!process.env[SKIP_BRIDGE_CHECK_ENV]) process.env[SKIP_BRIDGE_CHECK_ENV] = '1';
}

async function main(): Promise<number> {
  const startMs = Date.now();
  await runPreflight();
  const { type, mode, file: testFile } = parseArgs();
  await ensureBridgeAndWipe(type, mode, testFile);
  if (type === 'all') {
    let code = 0;
    const results: RunForTypeResult[] = [];
    for (const t of SUITE_TYPES) {
      const result = await runForType(t, mode);
      results.push(result);
      if (result.exitCode !== 0) code = result.exitCode;
    }
    const allPoolFiles = results.reduce((a, r) => a + r.poolFiles, 0);
    const allPoolPassed = results.reduce((a, r) => a + r.poolPassed, 0);
    const allPoolFailed = results.reduce((a, r) => a + r.poolFailed, 0);
    const allPoolTimeout = results.reduce((a, r) => a + r.poolTimeout, 0);
    const allPoolUnstable = results.reduce((a, r) => a + r.poolUnstable, 0);
    const allUnstableFiles = results.reduce((a, r) => a + r.unstableFiles, 0);
    const allUnstablePassed = results.reduce((a, r) => a + r.unstablePassed, 0);
    const allUnstableFailed = results.reduce((a, r) => a + r.unstableFailed, 0);
    const allUnstableTimeout = results.reduce((a, r) => a + r.unstableTimeout, 0);
    const allUnstableUnstable = results.reduce((a, r) => a + r.unstableUnstable, 0);
    const allWebsocketFiles = results.reduce((a, r) => a + r.websocketFiles, 0);
    const allWebsocketPassed = results.reduce((a, r) => a + r.websocketPassed, 0);
    const allWebsocketFailed = results.reduce((a, r) => a + r.websocketFailed, 0);
    const allWebsocketTimeout = results.reduce((a, r) => a + r.websocketTimeout, 0);
    const allWebsocketUnstable = results.reduce((a, r) => a + r.websocketUnstable, 0);
    const totalFileRuns = allPoolFiles + allUnstableFiles + allWebsocketFiles;
    const totalPassed = allPoolPassed + allUnstablePassed + allWebsocketPassed;
    const totalFailed = allPoolFailed + allUnstableFailed + allWebsocketFailed;
    const totalTimeout = allPoolTimeout + allUnstableTimeout + allWebsocketTimeout;
    const totalUnstable = allPoolUnstable + allUnstableUnstable + allWebsocketUnstable;
    const lastResult = results[results.length - 1];
    const lastRunId = lastResult?.lastRunId ?? null;
    const bySuiteLines = results.map((r) => {
      const files = r.poolFiles + r.unstableFiles + r.websocketFiles;
      const passed = r.poolPassed + r.unstablePassed + r.websocketPassed;
      const failed = r.poolFailed + r.unstableFailed + r.websocketFailed;
      const timeout = r.poolTimeout + r.unstableTimeout + r.websocketTimeout;
      const unstable = r.poolUnstable + r.unstableUnstable + r.websocketUnstable;
      return '  ' + r.suiteType + ': ' + files + ' files | ' + passed + ' passed, ' + failed + ' failed, ' + timeout + ' timeout, ' + unstable + ' unstable';
    });
    const totalRunTimeMs = Date.now() - startMs;
    const allModeSuffix = mode === HelperModeBoth ? '' : mode === TestRunMode.Pool ? '-pool' : '-threads';
    const perSuiteFailed = SUITE_TYPES.flatMap((suite) => [
      '   ' + suite + ' (pool):',
      '   npm run test:query:failed:' + suite + ':pool',
      '   ' + suite + ' (threads):',
      '   npm run test:query:failed:' + suite + ':threads',
    ]);
    const logRel = 'test-runner/logs';
    const summaryLines = [
      '',
      '============================================================',
      '📊 FINAL SUMMARY (ALL)',
      '  Files run: ' + totalFileRuns + ' -> pool ' + allPoolFiles + ' | threads ' + allUnstableFiles + (allWebsocketFiles > 0 ? ' | websocket ' + allWebsocketFiles : ''),
      ...bySuiteLines,
      '  Total: ' + totalPassed + ' passed, ' + totalFailed + ' failed, ' + totalTimeout + ' timeout, ' + totalUnstable + ' unstable',
      '  Total run time: ' + formatElapsed(totalRunTimeMs) + ' (wall clock)',
      '',
      '  Per-suite details:',
      '    unit:       ' + logRel + '/unit-test-helper' + allModeSuffix + '-results.txt',
      '    integration: ' + logRel + '/integration-test-helper' + allModeSuffix + '-results.txt',
      '    e2e:        ' + logRel + '/e2e-test-helper' + allModeSuffix + '-results.txt',
      '    contract:   ' + logRel + '/contract-test-helper' + allModeSuffix + '-results.txt',
      '============================================================',
      '',
      '🔧 Query failed per suite (copy command line only):',
      ...perSuiteFailed,
      '',
      '🔧 Query all (both pool + threads; copy line only):',
      '   npm run test:query:failed',
      '   npm run test:query:stats',
      '',
      '🔧 Query by run type (copy line only; dedicated scripts so npm does not strip flags):',
      '   npm run test:query:failed:pool',
      '   npm run test:query:failed:threads',
      '   npm run test:query:stats:pool',
      '   npm run test:query:stats:threads',
      ...(lastRunId
        ? [
            '',
            '🔧 Query by last run ID:',
            '   npm run test:query -- failed ' + lastRunId,
            '   npm run test:query -- by-run ' + lastRunId,
            '   (with logs) $env:SHOW_LOGS="1"; npm run test:query -- by-run ' + lastRunId,
          ]
        : []),
      '============================================================',
    ];
    const allSummary = summaryLines.join('\n');
    console.log(allSummary);
    const allResultsFile = path.join(LOG_DIR, `all-test-helper${allModeSuffix}-results.txt`);
    ensureLogDir();
    fs.writeFileSync(allResultsFile, allSummary + '\n', 'utf-8');
    console.log('\nCombined summary written to:', allResultsFile);
    return code;
  }

  const result = await runForType(type, mode, startMs, testFile);
  return result.exitCode;
}

async function runForType(
  type: Exclude<Type, 'all'>,
  mode: Mode,
  runStartMs?: number,
  singleFile?: string
): Promise<RunForTypeResult> {
  const data = runSuiteTypeCollector(CWD);
  const mapPath = path.join(CWD, 'test-runner', 'suite-type-map.json');
  const mapDir = path.dirname(mapPath);
  if (!fs.existsSync(mapDir)) fs.mkdirSync(mapDir, { recursive: true });
  fs.writeFileSync(mapPath, JSON.stringify(data, null, 2), 'utf-8');
  clearSuiteTypeMapCache();
  let files = getFilesForType(type);
  const testsDir = path.join(CWD, 'tests', SUITE_TYPE_TO_DIR[type] ?? type);
  if (singleFile) {
    const isBareName = !path.isAbsolute(singleFile) && !singleFile.includes('/') && !singleFile.includes('\\');
    const resolved = path.isAbsolute(singleFile)
      ? singleFile
      : isBareName
        ? path.join(testsDir, singleFile)
        : path.join(CWD, singleFile);
    const normalized = path.resolve(resolved).replace(/\\/g, '/');
    files = files.filter((f) => path.resolve(f).replace(/\\/g, '/') === normalized);
    if (files.length === 0) {
      files = fs.existsSync(resolved) ? [resolved] : [];
    }
  }
  if (files.length === 0) {
    console.error(`No test files found for type: ${type}`);
    return {
      exitCode: 1,
      suiteType: type,
      poolFiles: 0,
      poolPassed: 0,
      poolFailed: 0,
      poolTimeout: 0,
      poolUnstable: 0,
      unstableFiles: 0,
      unstablePassed: 0,
      unstableFailed: 0,
      unstableTimeout: 0,
      unstableUnstable: 0,
      websocketFiles: 0,
      websocketPassed: 0,
      websocketFailed: 0,
      websocketTimeout: 0,
      websocketUnstable: 0,
      lastRunId: null,
    };
  }

  const modeSuffix =
    mode === HelperModeBoth ? '' : mode === TestRunMode.Pool ? '-pool' : '-threads';
  const fileBaseName = singleFile
    ? `single-${path.basename(singleFile, '.test.ts')}-helper${modeSuffix}-results.txt`
    : `${type}-test-helper${modeSuffix}-results.txt`;
  const resultsFile = path.join(LOG_DIR, fileBaseName);
  ensureLogDir();
  if (fs.existsSync(resultsFile)) fs.unlinkSync(resultsFile);
  fs.writeFileSync(resultsFile, '', 'utf-8');
  process.env[TEST_RESULTS_TXT_PATH_ENV] = resultsFile;
  if (singleFile) {
    writeLog('SINGLE FILE RUN: ' + singleFile.replace(/\\/g, '/'), resultsFile);
    writeLog('(results go here only; integration-test-helper-results.txt is not touched)', resultsFile);
    writeLog('', resultsFile);
  }

  const counts = files.map((f) => {
    const rel = path.relative(CWD, f).replace(/\\/g, '/');
    const short = path.relative(testsDir, f).replace(/\\/g, '/');
    const c = countTestsInFile(f);
    const entry = (type === TestSuiteType.Integration || type === TestSuiteType.Unit || type === TestSuiteType.E2E || type === TestSuiteType.Contract) ? getSuiteTypeWithFallback(f, CWD) : null;
    const runIn = entry ? getRunInLabel(entry) : '';
    return { file: f, rel, short, runIn, ...c };
  });
  const totalCount = counts.reduce((a, c) => a + c.total, 0);
  const totalRunnable = counts.reduce((a, c) => a + c.runnable, 0);
  const totalSkipped = counts.reduce((a, c) => a + c.skipped, 0);

  const runInCol = (type === TestSuiteType.Integration || type === TestSuiteType.Unit || type === TestSuiteType.E2E || type === TestSuiteType.Contract) ? ' | Run in' : '';
  const phase1 = [
    `Found ${files.length} test files`,
    '',
    '============================================================',
    'PHASE 1: COUNTING TESTS FROM SOURCE CODE (no execution)',
    '============================================================',
    '',
    'File                                               | Total | Runnable | Skipped' + runInCol,
    '---------------------------------------------------------------------------' + (runInCol ? '----------' : ''),
    ...counts.map(
      (c) =>
        `${c.short.padEnd(50)} | ${String(c.total).padStart(5)} | ${String(c.runnable).padStart(8)} | ${String(c.skipped).padStart(7)}${c.skipped > 0 ? ' ⚠' : ' ✅'}` +
        (runInCol && c.runIn ? ' | ' + c.runIn : '')
    ),
    '---------------------------------------------------------------------------' + (runInCol ? '----------' : ''),
    `TOTAL                                              | ${String(totalCount).padStart(5)} | ${String(totalRunnable).padStart(8)} | ${String(totalSkipped).padStart(7)}`,
    '',
  ].join('\n');

  console.log(phase1);
  writeLog(phase1, resultsFile);

  let runPool = mode === TestRunMode.Pool || mode === HelperModeBoth;
  let runUnstable = mode === TestRunMode.Unstable || mode === HelperModeBoth;
  if (singleFile && files.length > 0) {
    const entry = getSuiteTypeWithFallback(files[0], CWD);
    const runIn = entry.runIn ?? 'pool';
    if (runIn !== 'unstable') runUnstable = false;
    if (runIn === 'unstable') runPool = false;
  }

  function getExpectedPoolFileCount(): number {
    if (type === TestSuiteType.Unit) {
      const u = getUnitPhaseFiles(CWD);
      return u.parallelPool.length + u.sequentialPool.length;
    }
    if (type === TestSuiteType.Integration) {
      const i = getIntegrationPhaseFiles(CWD);
      return i.parallelPool.length + i.sequentialPool.length;
    }
    if (type === TestSuiteType.E2E) return getE2EPhaseFiles(CWD).pool.length;
    if (type === TestSuiteType.Contract) return getContractPhaseFiles(CWD).pool.length;
    return 0;
  }
  function getExpectedThreadsFileCount(): number {
    if (type === TestSuiteType.Unit) return getUnitPhaseFiles(CWD).unstable.length;
    if (type === TestSuiteType.Integration) return getIntegrationPhaseFiles(CWD).unstable.length;
    if (type === TestSuiteType.E2E) return getE2EPhaseFiles(CWD).unstable.length;
    if (type === TestSuiteType.Contract) return 0;
    return 0;
  }

  const expectedPoolFiles = singleFile ? 1 : getExpectedPoolFileCount();
  const expectedThreadsFiles = singleFile ? 1 : getExpectedThreadsFileCount();

  if (!singleFile) {
    if (runPool && expectedPoolFiles === 0) runPool = false;
    if (runUnstable && expectedThreadsFiles === 0) runUnstable = false;
  }

  let exitCode = 0;
  let poolFiles = 0;
  let poolPassed = 0;
  let poolFailed = 0;
  let poolTimeout = 0;
  let poolUnstable = 0;
  let unstableFiles = 0;
  let unstablePassed = 0;
  let unstableFailed = 0;
  let unstableTimeout = 0;
  let unstableUnstable = 0;
  let lastRunId: string | null = null;
  let poolRunId: string | null = null;
  let unstableRunId: string | null = null;
  let websocketFiles = 0;
  let websocketPassed = 0;
  let websocketFailed = 0;
  let websocketTimeout = 0;
  let websocketUnstable = 0;
  let websocketRunId: string | null = null;
  let usedPhaseLists = false;

  const runSuiteArg = singleFile ? ' --file=' + path.relative(CWD, files[0]).replace(/\\/g, '/') : '';

  type PhaseSection = { name: string; list: string[]; runType: RunType; suiteTypeForAgg: string; runCmd: (fileRel: string) => void };
  function buildPhaseSections(): PhaseSection[] {
    const sections: PhaseSection[] = [];
    if (type === TestSuiteType.Unit) {
      const { parallelPool, sequentialPool, unstable } = getUnitPhaseFiles(CWD);
      if (parallelPool.length > 0) sections.push({ name: 'pool', list: parallelPool, runType: RunType.SinglePool, suiteTypeForAgg: type, runCmd: (fileRel) => execSync(`tsx scripts/run-suite.ts --type=${type} --mode=pool --file=${fileRel}`, { cwd: CWD, stdio: 'inherit', env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv }) });
      if (sequentialPool.length > 0) sections.push({ name: 'pool (sequential)', list: sequentialPool, runType: RunType.SinglePool, suiteTypeForAgg: type, runCmd: (fileRel) => execSync(`tsx scripts/run-suite.ts --type=${type} --mode=pool --file=${fileRel}`, { cwd: CWD, stdio: 'inherit', env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv }) });
      if (unstable.length > 0) sections.push({ name: 'unstable', list: unstable, runType: RunType.SingleThreads, suiteTypeForAgg: type, runCmd: (fileRel) => execSync(`tsx scripts/run-suite.ts --type=${type} --mode=threads --file=${fileRel}`, { cwd: CWD, stdio: 'inherit', env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv }) });
    } else if (type === TestSuiteType.Integration) {
      const { parallelPool, sequentialPool, unstable } = getIntegrationPhaseFiles(CWD);
      const websocketList = getWebsocketIncludeFiles(CWD);
      if (parallelPool.length > 0) sections.push({ name: 'pool', list: parallelPool, runType: RunType.SinglePool, suiteTypeForAgg: type, runCmd: (fileRel) => execSync(`tsx scripts/run-suite.ts --type=${type} --mode=pool --file=${fileRel}`, { cwd: CWD, stdio: 'inherit', env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv }) });
      if (sequentialPool.length > 0) sections.push({ name: 'pool (sequential)', list: sequentialPool, runType: RunType.SinglePool, suiteTypeForAgg: type, runCmd: (fileRel) => execSync(`tsx scripts/run-suite.ts --type=${type} --mode=pool --file=${fileRel}`, { cwd: CWD, stdio: 'inherit', env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv }) });
      if (websocketList.length > 0) sections.push({ name: 'websocket', list: websocketList, runType: RunType.SinglePool, suiteTypeForAgg: 'websocket', runCmd: (fileRel) => execSync(`npx vitest run --config vitest.websocket.config.ts ${fileRel}`, { cwd: CWD, stdio: 'inherit', env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv }) });
      if (unstable.length > 0) sections.push({ name: 'unstable', list: unstable, runType: RunType.SingleThreads, suiteTypeForAgg: type, runCmd: (fileRel) => execSync(`tsx scripts/run-suite.ts --type=${type} --mode=threads --file=${fileRel}`, { cwd: CWD, stdio: 'inherit', env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv }) });
    } else if (type === TestSuiteType.E2E) {
      const { pool, unstable } = getE2EPhaseFiles(CWD);
      if (pool.length > 0) sections.push({ name: 'pool', list: pool, runType: RunType.SinglePool, suiteTypeForAgg: type, runCmd: (fileRel) => execSync(`tsx scripts/run-suite.ts --type=${type} --mode=pool --file=${fileRel}`, { cwd: CWD, stdio: 'inherit', env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv }) });
      if (unstable.length > 0) sections.push({ name: 'unstable', list: unstable, runType: RunType.SingleThreads, suiteTypeForAgg: type, runCmd: (fileRel) => execSync(`tsx scripts/run-suite.ts --type=${type} --mode=threads --file=${fileRel}`, { cwd: CWD, stdio: 'inherit', env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv }) });
    } else if (type === TestSuiteType.Contract) {
      const { pool } = getContractPhaseFiles(CWD);
      if (pool.length > 0) sections.push({ name: 'pool', list: pool, runType: RunType.SinglePool, suiteTypeForAgg: type, runCmd: (fileRel) => execSync(`tsx scripts/run-suite.ts --type=${type} --mode=pool --file=${fileRel}`, { cwd: CWD, stdio: 'inherit', env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv }) });
    }
    return sections;
  }

  const usePhaseLists =
    !singleFile &&
    (type === TestSuiteType.Unit || type === TestSuiteType.Integration || type === TestSuiteType.E2E || type === TestSuiteType.Contract) &&
    buildPhaseSections().length > 0;

  if (runPool) {
    const poolNote =
      type === TestSuiteType.Integration
        ? singleFile
          ? ['', '  Pool = integration config (isolatedStorage: true). Single file: pool only.', ''].join('\n')
          : [
              '',
              '  Pool = integration config (isolatedStorage: true).',
              '  runIn=unstable → THREADS phase. WebSocket+DO tests run in WEBSOCKET phase (isolatedStorage: false).',
              '',
            ].join('\n')
        : '';
    const header = [
      '',
      '============================================================',
      'PHASE: POOL (run-suite --mode=pool)',
      '============================================================',
      poolNote,
    ].join('\n');
    console.log(header);
    writeLog(header, resultsFile);

    if (usePhaseLists) {
      usedPhaseLists = true;
      const sections = buildPhaseSections();
      const poolSections = sections.filter((s) => s.runType === RunType.SinglePool && s.suiteTypeForAgg === type);
      const otherSections = sections.filter((s) => s.runType !== RunType.SinglePool || s.suiteTypeForAgg !== type);
      const runOne = async (
        list: string[],
        sectionName: string,
        runType: RunType,
        suiteTypeForAgg: string,
        runCmd: (fileRel: string) => void
      ): Promise<{ passed: number; failed: number; timeout: number; unstable: number }> => {
        let p = 0, f = 0, t = 0, u = 0;
        for (let i = 0; i < list.length; i++) {
          const fileRel = list[i];
          const runIdGenerated = writeCurrentRunFile();
          await notifyBridgeRunStarted(getBridgeBaseUrl(), {
            runId: runIdGenerated,
            runType,
            suiteType: suiteTypeForAgg,
          });
          const rerunCmd =
            suiteTypeForAgg === 'websocket'
              ? 'npx vitest run --config vitest.websocket.config.ts ' + fileRel
              : 'npm run test:' + suiteTypeForAgg + ':helper -- ' + fileRel;
          const heading = `Running all ${sectionName} (${i + 1} of ${list.length})`;
          console.log(heading);
          console.log(rerunCmd);
          writeLog(heading, resultsFile);
          writeLog(rerunCmd, resultsFile);
          try {
            runCmd(fileRel);
          } catch (err: unknown) {
            const status = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 1;
            if (status !== undefined) exitCode = status;
          }
          const runId = readRunIdFromCurrentRun();
          const agg = runId
            ? aggregateFromNdjson(runId, runType, suiteTypeForAgg)
            : { passed: 0, failed: 0, timeout: 0, unstable: 0, runId: undefined, runType };
          p += agg.passed ?? 0;
          f += agg.failed ?? 0;
          t += agg.timeout ?? 0;
          u += agg.unstable ?? 0;
          if (agg.runId) lastRunId = agg.runId;
          const fileKey = getFileKeyFromSuitePath(fileRel);
          buildPerFileSectionFromNdjson(agg.runId ?? '', runType, suiteTypeForAgg, resultsFile, fileKey, fileRel);
        }
        return { passed: p, failed: f, timeout: t, unstable: u };
      };

      const runPoolAsSingleBatch = (type === TestSuiteType.Unit || type === TestSuiteType.Contract) && poolSections.length > 0;
      if (runPoolAsSingleBatch) {
        const runIdGenerated = writeCurrentRunFile();
        await notifyBridgeRunStarted(getBridgeBaseUrl(), {
          runId: runIdGenerated,
          runType: RunType.SinglePool,
          suiteType: type,
        });
        try {
          execSync(`tsx scripts/run-suite.ts --type=${type} --mode=pool`, {
            cwd: CWD,
            stdio: 'inherit',
            env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv,
          });
        } catch (err: unknown) {
          const status = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 1;
          if (status !== undefined) exitCode = status;
        }
        const runId = readRunIdFromCurrentRun();
        const agg = runId ? aggregateFromNdjson(runId, RunType.SinglePool, type) : { passed: 0, failed: 0, timeout: 0, unstable: 0, runId: undefined, runType: RunType.SinglePool };
        const totalPoolFiles = poolSections.reduce((n, s) => n + s.list.length, 0);
        poolFiles = totalPoolFiles;
        poolPassed = agg.passed ?? 0;
        poolFailed = agg.failed ?? 0;
        poolTimeout = agg.timeout ?? 0;
        poolUnstable = agg.unstable ?? 0;
        if (agg.runId) lastRunId = agg.runId;
        poolRunId = agg.runId ?? null;
        buildPerFileSectionFromNdjson(poolRunId ?? '', RunType.SinglePool, type, resultsFile);
      }

      const sectionsToRunOneByOne = runPoolAsSingleBatch ? otherSections : sections;
      for (const section of sectionsToRunOneByOne) {
        if (section.list.length === 0) continue;
        const out = await runOne(section.list, section.name, section.runType, section.suiteTypeForAgg, section.runCmd);
        const n = section.list.length;
        if (section.runType === RunType.SingleThreads) {
          unstableFiles += n;
          unstablePassed += out.passed;
          unstableFailed += out.failed;
          unstableTimeout += out.timeout;
          unstableUnstable += out.unstable;
          if (lastRunId) unstableRunId = lastRunId;
          const roundup = ['', '📊 THREADS ROUNDUP', '  Files run: ' + n + ', Total: ' + out.passed + ' passed, ' + out.failed + ' failed', ''].join('\n');
          console.log(roundup);
          writeLog(roundup, resultsFile);
        } else if (section.suiteTypeForAgg === 'websocket') {
          websocketFiles += n;
          websocketPassed += out.passed;
          websocketFailed += out.failed;
          websocketTimeout += out.timeout;
          websocketUnstable += out.unstable;
          if (lastRunId) websocketRunId = lastRunId;
          const roundup = ['', '📊 WEBSOCKET ROUNDUP', '  Files run: ' + n + ', Total: ' + out.passed + ' passed, ' + out.failed + ' failed', ''].join('\n');
          console.log(roundup);
          writeLog(roundup, resultsFile);
        } else {
          poolFiles += n;
          poolPassed += out.passed;
          poolFailed += out.failed;
          poolTimeout += out.timeout;
          poolUnstable += out.unstable;
        }
      }
      if (lastRunId) poolRunId = lastRunId;
    } else {
      const poolRunIdGenerated = writeCurrentRunFile();
      await notifyBridgeRunStarted(getBridgeBaseUrl(), {
        runId: poolRunIdGenerated,
        runType: RunType.SinglePool,
        suiteType: type,
      });
      try {
        execSync(`tsx scripts/run-suite.ts --type=${type} --mode=pool${runSuiteArg}`, {
          cwd: CWD,
          stdio: 'inherit',
          env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv,
        });
      } catch (err: unknown) {
        const status = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 1;
        if (status !== undefined) exitCode = status;
      }
      const runId = readRunIdFromCurrentRun();
      const agg = runId ? aggregateFromNdjson(runId, RunType.SinglePool, type) : { passed: 0, failed: 0, timeout: 0, unstable: 0, runId: undefined, runType: RunType.SinglePool };
      poolFiles = expectedPoolFiles;
      poolPassed = agg.passed ?? 0;
      poolFailed = agg.failed ?? 0;
      poolTimeout = agg.timeout ?? 0;
      poolUnstable = agg.unstable ?? 0;
      poolRunId = agg.runId ?? null;
      if (poolRunId) lastRunId = poolRunId;
      buildPerFileSectionFromNdjson(poolRunId ?? '', RunType.SinglePool, type, resultsFile);
      if (poolFiles > 1) {
        const block = getStatsAndFormat(agg.runId ?? '', RunType.SinglePool, agg);
        writeLog(block.split('\n').map((l) => (l ? '    ' + l : l)).join('\n'), resultsFile);
      }
    }

    const poolRoundup = [
      '',
      '============================================================',
      '📊 POOL ROUNDUP',
      '  Files run: ' + poolFiles,
      '  Total: ' + poolPassed + ' passed, ' + poolFailed + ' failed, ' + poolTimeout + ' timeout, ' + poolUnstable + ' unstable',
      '============================================================',
      '',
      '🔧 Query: npm run test:query:failed:' + type + ':pool',
      '============================================================',
    ].join('\n');
    console.log(poolRoundup);
    writeLog(poolRoundup, resultsFile);
  }

  if (runUnstable && !usedPhaseLists) {
    const header = [
      '',
      '============================================================',
      'PHASE: THREADS (run-suite --mode=threads)',
      '============================================================',
    ].join('\n');
    console.log(header);
    writeLog(header, resultsFile);
    const threadsRunIdGenerated = writeCurrentRunFile();
    await notifyBridgeRunStarted(getBridgeBaseUrl(), {
      runId: threadsRunIdGenerated,
      runType: RunType.SingleThreads,
      suiteType: type,
    });
    try {
      execSync(`tsx scripts/run-suite.ts --type=${type} --mode=threads${runSuiteArg}`, {
        cwd: CWD,
        stdio: 'inherit',
        env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv,
      });
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 1;
      if (status !== undefined) exitCode = status;
    }
    const runId = readRunIdFromCurrentRun();
    const agg = runId ? aggregateFromNdjson(runId, RunType.SingleThreads, type) : { passed: 0, failed: 0, timeout: 0, unstable: 0, runId: undefined, runType: RunType.SingleThreads };
    unstableFiles = expectedThreadsFiles;
    unstablePassed = agg.passed ?? 0;
    unstableFailed = agg.failed ?? 0;
    unstableTimeout = agg.timeout ?? 0;
    unstableUnstable = agg.unstable ?? 0;
    unstableRunId = agg.runId ?? null;
    if (unstableRunId) lastRunId = unstableRunId;
    buildPerFileSectionFromNdjson(unstableRunId ?? '', RunType.SingleThreads, type, resultsFile);
    const block = getStatsAndFormat(agg.runId ?? '', RunType.SingleThreads, agg);
    writeLog(block.split('\n').map((l) => (l ? '    ' + l : l)).join('\n'), resultsFile);
    const threadsRoundup = [
      '',
      '============================================================',
      '📊 THREADS ROUNDUP',
      '  Files run: ' + unstableFiles,
      '  Total: ' + unstablePassed + ' passed, ' + unstableFailed + ' failed, ' + unstableTimeout + ' timeout, ' + unstableUnstable + ' unstable',
      '============================================================',
      '',
      '🔧 Query: npm run test:query:failed:' + type + ':threads',
      '============================================================',
    ].join('\n');
    console.log(threadsRoundup);
    writeLog(threadsRoundup, resultsFile);
  }

  const websocketFileList = type === TestSuiteType.Integration && !singleFile && !usedPhaseLists ? getWebsocketIncludeFiles(CWD) : [];
  const expectedWebsocketFiles = websocketFileList.length;
  if (expectedWebsocketFiles > 0) {
    const header = [
      '',
      '============================================================',
      'PHASE: WEBSOCKET (vitest.websocket.config.ts, isolatedStorage: false)',
      '============================================================',
    ].join('\n');
    console.log(header);
    writeLog(header, resultsFile);
    const websocketRunIdGenerated = writeCurrentRunFile();
    await notifyBridgeRunStarted(getBridgeBaseUrl(), {
      runId: websocketRunIdGenerated,
      runType: RunType.SinglePool,
      suiteType: 'websocket',
    });
    try {
      execSync('npx vitest run --config vitest.websocket.config.ts', {
        cwd: CWD,
        stdio: 'inherit',
        env: { ...process.env, [TEST_RESULTS_TXT_PATH_ENV]: resultsFile } as NodeJS.ProcessEnv,
      });
    } catch (err: unknown) {
      const status = err && typeof err === 'object' && 'status' in err ? (err as { status: number }).status : 1;
      if (status !== undefined) exitCode = status;
    }
    const runId = readRunIdFromCurrentRun();
    const agg = runId ? aggregateFromNdjson(runId, RunType.SinglePool, 'websocket') : { passed: 0, failed: 0, timeout: 0, unstable: 0, runId: undefined, runType: RunType.SinglePool };
    websocketFiles = expectedWebsocketFiles;
    websocketPassed = agg.passed ?? 0;
    websocketFailed = agg.failed ?? 0;
    websocketTimeout = agg.timeout ?? 0;
    websocketUnstable = agg.unstable ?? 0;
    websocketRunId = agg.runId ?? null;
    if (websocketRunId) lastRunId = websocketRunId;
    buildPerFileSectionFromNdjson(websocketRunId ?? '', RunType.SinglePool, 'websocket', resultsFile);
    const block = getStatsAndFormat(agg.runId ?? '', RunType.SinglePool, agg);
    writeLog(block.split('\n').map((l) => (l ? '    ' + l : l)).join('\n'), resultsFile);
    const websocketRoundup = [
      '',
      '============================================================',
      '📊 WEBSOCKET ROUNDUP',
      '  Files run: ' + websocketFiles,
      '  Total: ' + websocketPassed + ' passed, ' + websocketFailed + ' failed, ' + websocketTimeout + ' timeout, ' + websocketUnstable + ' unstable',
      '============================================================',
      '',
      '🔧 Query: npm run test:query:failed:integration:pool (websocket logs under single-pool/websocket/)',
      '============================================================',
    ].join('\n');
    console.log(websocketRoundup);
    writeLog(websocketRoundup, resultsFile);
  }

  const totalFileRuns = poolFiles + unstableFiles + websocketFiles;
  const totalPassed = poolPassed + unstablePassed + websocketPassed;
  const totalFailed = poolFailed + unstableFailed + websocketFailed;
  const totalTimeout = poolTimeout + unstableTimeout + websocketTimeout;
  const totalUnstable = poolUnstable + unstableUnstable + websocketUnstable;
  const runTimeMs = runStartMs != null ? Date.now() - runStartMs : 0;
  const runTimeLine = runStartMs != null ? ['  Total run time: ' + formatElapsed(runTimeMs) + ' (wall clock)'] : [];
  const summaryTitle =
    mode === HelperModeBoth
      ? '📊 FINAL SUMMARY (BOTH)'
      : mode === TestRunMode.Pool
        ? '📊 FINAL SUMMARY (POOL)'
        : '📊 FINAL SUMMARY (THREADS)';
  const hasWebsocket = websocketFiles > 0;
  const filesRunLine =
    mode === HelperModeBoth
      ? '  Files run: ' + totalFileRuns + ' -> pool ' + poolFiles + ' | threads ' + unstableFiles + (hasWebsocket ? ' | websocket ' + websocketFiles : '')
      : hasWebsocket
        ? '  Files run: ' + totalFileRuns + ' -> pool ' + poolFiles + ' | threads ' + unstableFiles + ' | websocket ' + websocketFiles
        : '  Files run: ' + totalFileRuns;
  const detailLines =
    mode === HelperModeBoth
      ? [
          '  Pool: ' + poolFiles + ' files | ' + poolPassed + ' passed, ' + poolFailed + ' failed, ' + poolTimeout + ' timeout, ' + poolUnstable + ' unstable',
          '  Threads: ' + unstableFiles + ' files | ' + unstablePassed + ' passed, ' + unstableFailed + ' failed, ' + unstableTimeout + ' timeout, ' + unstableUnstable + ' unstable',
          ...(hasWebsocket
            ? ['  WebSocket: ' + websocketFiles + ' files | ' + websocketPassed + ' passed, ' + websocketFailed + ' failed, ' + websocketTimeout + ' timeout, ' + websocketUnstable + ' unstable']
            : []),
        ]
      : mode === TestRunMode.Pool
        ? [
            '  Pool: ' + poolFiles + ' files | ' + poolPassed + ' passed, ' + poolFailed + ' failed, ' + poolTimeout + ' timeout, ' + poolUnstable + ' unstable',
            ...(hasWebsocket
              ? ['  WebSocket: ' + websocketFiles + ' files | ' + websocketPassed + ' passed, ' + websocketFailed + ' failed, ' + websocketTimeout + ' timeout, ' + websocketUnstable + ' unstable']
              : []),
          ]
        : ['  Threads: ' + unstableFiles + ' files | ' + unstablePassed + ' passed, ' + unstableFailed + ' failed, ' + unstableTimeout + ' timeout, ' + unstableUnstable + ' unstable'];
  const queryBlock =
    mode === HelperModeBoth
      ? [
          '',
          '🔧 Query all (both pool + threads; copy line only):',
          '   npm run test:query:failed:' + type,
          '   npm run test:query:stats:' + type,
          '',
          '🔧 Query by run type (copy line only; dedicated scripts so npm does not strip flags):',
          '   npm run test:query:failed:' + type + ':pool',
          '   npm run test:query:failed:' + type + ':threads',
          '   npm run test:query:stats:' + type + ':pool',
          '   npm run test:query:stats:' + type + ':threads',
        ]
      : mode === TestRunMode.Pool
        ? [
            '',
            '🔧 Query for this run (pool; copy line only):',
            '   npm run test:query:failed:' + type + ':pool',
            '   npm run test:query:stats:' + type + ':pool',
          ]
        : [
            '',
            '🔧 Query for this run (threads; copy line only):',
            '   npm run test:query:failed:' + type + ':threads',
            '   npm run test:query:stats:' + type + ':threads',
          ];
  const finalSummary = [
    '',
    '============================================================',
    summaryTitle,
    filesRunLine,
    ...detailLines,
    '  Total: ' + totalPassed + ' passed, ' + totalFailed + ' failed, ' + totalTimeout + ' timeout, ' + totalUnstable + ' unstable',
    ...runTimeLine,
    '  (Standalone run. all-test-helper-results.txt matches only if from the same run.)',
    '============================================================',
    ...queryBlock,
    ...(lastRunId
      ? [
          '',
          '🔧 Query by last run ID:',
          '   npm run test:query -- failed ' + lastRunId,
          '   npm run test:query -- by-run ' + lastRunId,
          '   (with logs) $env:SHOW_LOGS="1"; npm run test:query -- by-run ' + lastRunId,
        ]
      : []),
    ...(runStartMs != null ? ['', '⏱ Total time: ' + formatElapsed(runTimeMs) + ' (wall clock)'] : []),
    '============================================================',
  ].join('\n');
  console.log(finalSummary);
  writeLog(finalSummary, resultsFile);

  const ingestScopes = getIngestScopes(type, poolRunId !== null, unstableRunId !== null, websocketRunId !== null);
  if (singleFile) {
    if (ingestScopes.length > 0) {
      console.log('\n📦 DuckDB ingest: incremental update for single-file run (changed NDJSON only)');
    } else {
      console.log('\n📦 DuckDB ingest skipped: no successful run summaries were produced in this helper run.');
    }
    try {
      const cmd = 'npx tsx scripts/rebuild-db-from-ndjson.ts --no-delete --domain=cloudflare';
      const ingestOut = execSync(cmd, {
        cwd: LOGGING_DOMAIN_PKG,
        encoding: 'utf-8',
        maxBuffer: 2 * 1024 * 1024,
      });
      const ingestLines = stripAnsi(ingestOut).trimEnd();
      if (ingestLines) {
        console.log('\n📦 DuckDB ingest (incremental):');
        console.log(ingestLines.split('\n').map((l) => '   ' + l).join('\n'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('\n⚠️ DuckDB incremental ingest skipped:', msg);
      if (String(msg).includes('run_type') && String(msg).includes('CHECK constraint')) {
        console.warn(
          '   Tip: If the DB was created with an older schema, delete it and run once without --no-delete: cd packages/logging-domain && npx tsx scripts/rebuild-db-from-ndjson.ts --domain=cloudflare'
        );
      }
    }
  } else if (runPool || runUnstable || websocketFiles > 0) {
    console.log('\n📦 DuckDB ingest: full rebuild for multi-file run');
    try {
      const cmd = 'npx tsx scripts/rebuild-db-from-ndjson.ts --domain=cloudflare';
      const ingestOut = execSync(cmd, {
        cwd: LOGGING_DOMAIN_PKG,
        encoding: 'utf-8',
        maxBuffer: 2 * 1024 * 1024,
      });
      const ingestLines = stripAnsi(ingestOut).trimEnd();
      if (ingestLines) {
        console.log('\n📦 DuckDB ingest (full):');
        console.log(ingestLines.split('\n').map((l) => '   ' + l).join('\n'));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('\n⚠️ DuckDB full rebuild skipped:', msg);
    }
  } else {
    console.log('\n📦 DuckDB ingest skipped: no test phases were run in this helper invocation.');
  }

  console.log('\nResults written to:', resultsFile);
  return {
    exitCode,
    suiteType: type,
    poolFiles,
    poolPassed,
    poolFailed,
    poolTimeout,
    poolUnstable,
    unstableFiles,
    unstablePassed,
    unstableFailed,
    unstableTimeout,
    unstableUnstable,
    websocketFiles,
    websocketPassed,
    websocketFailed,
    websocketTimeout,
    websocketUnstable,
    lastRunId,
  };
}

main().then((code) => process.exit(code)).catch((err) => {
  console.error(err);
  process.exit(1);
});
