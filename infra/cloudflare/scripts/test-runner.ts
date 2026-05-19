#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { PUBLIC_TUNNEL_BRIDGE_URL } from '@ocentra/logging-domain/core/constants';
import { notifyBridgeRunStarted } from '@ocentra/logging-domain/transport/bridgeTransport';
import { TestSuiteType } from '@ocentra/logging-domain/test-log/types';
import { RunType } from '@ocentra/logging-domain/test-log/types';
import { TestRunMode, asTestRunModeOrNull } from '../src/constants/test-run-mode.js';
import { VitestConfigFile } from '../src/constants/vitest-config.js';
import { TestEnvVar, TestEnvValue } from '../tests/constants/test-constants.js';
import { runSuiteTypeCollector } from '../test-runner/script/lib/suite-type-collector.js';
import { getSuiteTypeWithFallback } from '../test-runner/script/lib/suite-type-map.js';

const BRIDGE_HEALTH_URL = 'http://127.0.0.1:8765/__health__';
const DEFAULT_LOG_BRIDGE_URL = PUBLIC_TUNNEL_BRIDGE_URL;

function checkBridgeRunning(): Promise<boolean> {
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CWD = path.resolve(__dirname, '..');
const TEST_RUNNER_DIR = 'test-runner';
const SUITE_TYPE_MAP_FILENAME = 'suite-type-map.json';
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

const CONFIG_MATRIX: Record<
  TestRunMode,
  Record<typeof TestSuiteType[keyof typeof TestSuiteType], VitestConfigFile>
> = {
  [TestRunMode.Pool]: {
    [TestSuiteType.Unit]: VitestConfigFile.Unit,
    [TestSuiteType.Integration]: VitestConfigFile.Integration,
    [TestSuiteType.E2E]: VitestConfigFile.E2E,
    [TestSuiteType.Websocket]: VitestConfigFile.Websocket,
    [TestSuiteType.Contract]: VitestConfigFile.Contract,
  },
  [TestRunMode.Unstable]: {
    [TestSuiteType.Unit]: VitestConfigFile.UnitThreads,
    [TestSuiteType.Integration]: VitestConfigFile.IntegrationThreads,
    [TestSuiteType.E2E]: VitestConfigFile.E2EThreads,
    [TestSuiteType.Websocket]: VitestConfigFile.Websocket,
    [TestSuiteType.Contract]: VitestConfigFile.Contract,
  },
  [TestRunMode.Production]: {
    [TestSuiteType.Unit]: VitestConfigFile.Unit,
    [TestSuiteType.Integration]: VitestConfigFile.Integration,
    [TestSuiteType.E2E]: VitestConfigFile.E2E,
    [TestSuiteType.Websocket]: VitestConfigFile.Websocket,
    [TestSuiteType.Contract]: VitestConfigFile.Contract,
  },
};

const TYPE_ORDER: (typeof TestSuiteType)[keyof typeof TestSuiteType][] = [
  TestSuiteType.Unit,
  TestSuiteType.Integration,
  TestSuiteType.Websocket,
  TestSuiteType.E2E,
  TestSuiteType.Contract,
];

const ARG_MODE_PREFIX = '--mode=';
const ARG_TYPE_PREFIX = '--type=';
const EXT_TEST_TS = '.test.ts';
const EXT_SPEC_TS = '.spec.ts';

const TYPE_BY_NAME: Record<string, (typeof TestSuiteType)[keyof typeof TestSuiteType]> = {
  unit: TestSuiteType.Unit,
  integration: TestSuiteType.Integration,
  e2e: TestSuiteType.E2E,
  websocket: TestSuiteType.Websocket,
  contract: TestSuiteType.Contract,
};

function parseArgs(): {
  mode: TestRunMode;
  typeFilter: (typeof TestSuiteType)[keyof typeof TestSuiteType] | null;
  paths: string[];
  extraArgs: string[];
} {
  const args = process.argv.slice(2);
  let mode: TestRunMode = TestRunMode.Pool;
  let typeFilter: (typeof TestSuiteType)[keyof typeof TestSuiteType] | null = null;
  const paths: string[] = [];
  const extraArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith(ARG_MODE_PREFIX)) {
      const v = asTestRunModeOrNull(arg.slice(ARG_MODE_PREFIX.length));
      if (v) mode = v;
    } else if (arg === '--mode' && args[i + 1]) {
      const v = asTestRunModeOrNull(args[i + 1]);
      if (v) {
        mode = v;
        i++;
      }
    } else if (arg.startsWith(ARG_TYPE_PREFIX)) {
      const t = arg.slice(ARG_TYPE_PREFIX.length).toLowerCase();
      if (TYPE_BY_NAME[t]) typeFilter = TYPE_BY_NAME[t];
    } else if (arg === '--type' && args[i + 1]) {
      const t = String(args[i + 1]).toLowerCase();
      if (TYPE_BY_NAME[t]) {
        typeFilter = TYPE_BY_NAME[t];
        i++;
      }
    } else if (!arg.startsWith('--') && (arg.endsWith(EXT_TEST_TS) || arg.endsWith(EXT_SPEC_TS))) {
      paths.push(path.isAbsolute(arg) ? arg : path.resolve(CWD, arg));
    } else {
      extraArgs.push(arg);
    }
  }

  return { mode, typeFilter, paths, extraArgs };
}

function envForMode(mode: TestRunMode): NodeJS.ProcessEnv {
  const env = { ...process.env };
  env[TestEnvVar.TestRunMode] = mode;
  if (mode === TestRunMode.Pool) {
    env[TestEnvVar.TestMode] = TestEnvValue.Local;
    delete env[TestEnvVar.TestRunner];
  } else if (mode === TestRunMode.Unstable) {
    env[TestEnvVar.TestMode] = TestEnvValue.Local;
    env[TestEnvVar.TestRunner] = TestRunMode.Unstable;
  } else {
    env[TestEnvVar.TestMode] = TestEnvValue.Real;
    delete env[TestEnvVar.TestRunner];
  }
  return env;
}

const KNOWN_MINIFLARE_EBUSY_PREFIX =
  'vitest-pool-worker: Unable to remove temporary directory: Error: EBUSY:';
const SUPPRESS_MINIFLARE_EBUSY =
  process.env.VITEST_SUPPRESS_MINIFLARE_EBUSY !== '0';
const VPW_COMPAT_FLAG_PREFIX =
  '[vpw:debug] Adding `enable_nodejs_';
const VPW_SHUTDOWN_PREFIX = '[vpw:debug] Shutting down runtimes...';
const VPW_DEV_VARS_PREFIX = 'Using vars defined in .dev.vars';
const SUPPRESS_VPW_STARTUP_NOISE =
  process.env.VITEST_SUPPRESS_VPW_STARTUP_NOISE !== '0';

function shouldSuppressLine(line: string): boolean {
  if (SUPPRESS_MINIFLARE_EBUSY && line.includes(KNOWN_MINIFLARE_EBUSY_PREFIX)) {
    return true;
  }
  if (!SUPPRESS_VPW_STARTUP_NOISE) {
    return false;
  }
  if (line.startsWith(VPW_DEV_VARS_PREFIX)) {
    return true;
  }
  if (line.startsWith(VPW_COMPAT_FLAG_PREFIX)) {
    return true;
  }
  if (line.startsWith(VPW_SHUTDOWN_PREFIX)) {
    return true;
  }
  return false;
}

function streamWithFiltering(
  source: NodeJS.ReadableStream,
  target: NodeJS.WriteStream,
  suppressedCounter: { count: number }
): void {
  let buffer = '';
  source.on('data', (chunk: Buffer | string) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (shouldSuppressLine(line)) {
        suppressedCounter.count += 1;
        continue;
      }
      target.write(line + '\n');
    }
  });
  source.on('end', () => {
    if (buffer.length === 0) return;
    if (shouldSuppressLine(buffer)) {
      suppressedCounter.count += 1;
      return;
    }
    target.write(buffer);
  });
}

async function runVitest(
  config: VitestConfigFile,
  paths: string[],
  env: NodeJS.ProcessEnv,
  extraArgs: string[] = []
): Promise<number> {
  return await new Promise((resolve) => {
    const relativePaths = paths.map((p) => path.relative(CWD, p));
    const args = ['vitest', 'run', ...relativePaths, '--config', config, ...extraArgs];
    const spawnEnv: NodeJS.ProcessEnv = {};
    for (const [key, value] of Object.entries(env)) {
      if (!key || key.includes('=')) {
        continue;
      }
      if (typeof value === 'string') {
        spawnEnv[key] = value;
      }
    }
    const child =
      process.platform === 'win32'
        ? spawn('cmd.exe', ['/d', '/s', '/c', ['npx', ...args].join(' ')], {
            cwd: CWD,
            env: spawnEnv,
            stdio: ['ignore', 'pipe', 'pipe'],
          })
        : spawn('npx', args, {
            cwd: CWD,
            env: spawnEnv,
            stdio: ['ignore', 'pipe', 'pipe'],
          });

    const suppressedCounter = { count: 0 };
    if (child.stdout) streamWithFiltering(child.stdout, process.stdout, suppressedCounter);
    if (child.stderr) streamWithFiltering(child.stderr, process.stderr, suppressedCounter);

    child.on('error', () => resolve(1));
    child.on('close', (code) => {
      if (suppressedCounter.count > 0) {
        process.stderr.write(
          `[test-runner] Suppressed ${suppressedCounter.count} known pool-worker noise line(s).\n`
        );
      }
      resolve(code ?? 1);
    });
  });
}

const SKIP_LOGGING_DOMAIN_BUILD_ENV = 'SKIP_LOGGING_DOMAIN_BUILD';
const SKIP_BRIDGE_CHECK_ENV = 'SKIP_BRIDGE_CHECK';

function buildLoggingDomain(): void {
  if (process.env[SKIP_LOGGING_DOMAIN_BUILD_ENV] === '1') {
    return;
  }
  const loggingDomainPath = path.resolve(CWD, '../../packages/logging-domain');
  console.log('[test-runner] Building logging-domain to ensure dist is up to date...');
  try {
    execSync('npm run build', {
      cwd: loggingDomainPath,
      stdio: 'inherit',
    });
    console.log('[test-runner] logging-domain build complete.\n');
  } catch (err) {
    console.error('[test-runner] Failed to build logging-domain:', err);
    process.exit(1);
  }
}

async function main(): Promise<number> {
  if (process.env[SKIP_BRIDGE_CHECK_ENV] !== '1') {
    const bridgeOk = await checkBridgeRunning();
    if (!bridgeOk) {
      process.stderr.write(
        '[test-runner] Bridge is not running. Start it (e.g. Run Task: Start tunnel and log bridge) then retry.\n'
      );
      process.exit(1);
    }
  }
  process.env.LOG_BRIDGE_URL = process.env.LOG_BRIDGE_URL?.trim() || DEFAULT_LOG_BRIDGE_URL;

  buildLoggingDomain();

  const { mode, typeFilter, paths, extraArgs } = parseArgs();
  const data = runSuiteTypeCollector(CWD);
  const mapPath = path.join(CWD, TEST_RUNNER_DIR, SUITE_TYPE_MAP_FILENAME);
  const mapDir = path.dirname(mapPath);
  if (!fs.existsSync(mapDir)) {
    fs.mkdirSync(mapDir, { recursive: true });
  }
  fs.writeFileSync(mapPath, JSON.stringify(data, null, 2), 'utf-8');

  const env = envForMode(mode);
  env[TestEnvVar.TestRunType] =
    mode === TestRunMode.Unstable ? RunType.SingleThreads : RunType.SinglePool;
  if (!env[TestEnvVar.TestRunId]) {
    const runId = readRunIdFromCurrentRun();
    if (runId) env[TestEnvVar.TestRunId] = runId;
  }
  env[TestEnvVar.TestFiles] = paths.length > 0 ? paths.map((p) => path.relative(CWD, p)).join(',') : '';
  if (typeFilter) {
    env[TestEnvVar.TestSuiteType] = typeFilter;
  } else if (paths.length > 0) {
    env[TestEnvVar.TestSuiteType] = getSuiteTypeWithFallback(paths[0], CWD).type;
  } else {
    env[TestEnvVar.TestSuiteType] = '';
  }
  // Notify bridge so the reporter can fetch runId/runType/suiteType via HTTP
  const resolvedRunId = env[TestEnvVar.TestRunId];
  const resolvedRunType = env[TestEnvVar.TestRunType] ?? RunType.SinglePool;
  const resolvedSuiteType = env[TestEnvVar.TestSuiteType] ?? '';
  if (resolvedRunId) {
    await notifyBridgeRunStarted(process.env.LOG_BRIDGE_URL ?? DEFAULT_LOG_BRIDGE_URL, {
      runId: resolvedRunId,
      runType: resolvedRunType,
      suiteType: resolvedSuiteType || undefined,
    });
  }

  const configs = CONFIG_MATRIX[mode];

  if (paths.length === 0) {
    let exitCode = 0;
    const typesToRun = typeFilter ? [typeFilter] : TYPE_ORDER;
    for (const type of typesToRun) {
      const config = configs[type];
      if (!config) continue;
      const code = await runVitest(config, [], env, extraArgs);
      if (code !== 0) exitCode = code;
    }
    return exitCode;
  }

  const byType = new Map<typeof TestSuiteType[keyof typeof TestSuiteType], string[]>();
  for (const p of paths) {
    const { type } = getSuiteTypeWithFallback(p, CWD);
    const list = byType.get(type) ?? [];
    list.push(p);
    byType.set(type, list);
  }

  const EXPLICIT_FILES_ENV = 'VITEST_INTEGRATION_THREADS_EXPLICIT_FILES';
  let exitCode = 0;
  for (const type of TYPE_ORDER) {
    const list = byType.get(type);
    if (!list?.length) continue;
    const config = configs[type] ?? configs[TestSuiteType.Unit];
    const runEnv =
      mode === TestRunMode.Unstable &&
      type === TestSuiteType.Integration &&
      config === VitestConfigFile.IntegrationThreads
        ? { ...env, [EXPLICIT_FILES_ENV]: '1' }
        : env;
    const code = await runVitest(config, list, runEnv, extraArgs);
    if (code !== 0) exitCode = code;
  }
  return exitCode;
}

main().then((code) => process.exit(code));
