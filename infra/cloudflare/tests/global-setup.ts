import type { TestProject } from 'vitest/node';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { startLogServer, stopLogServer } from '../test-runner/script/servers/test-log-server.js';
import type { Server } from 'http';
import { TestEnvVar, TestLogServer } from '@tests/constants/test-constants';
import { TestRunMode } from '@/constants/test-run-mode';

type BridgePayload = {
  runType?: string;
  testFiles?: string[];
  suiteType?: string;
};

type BridgeModule = {
  signalRunStarted: (runId: string, payload?: BridgePayload) => Promise<boolean | void>;
  flushBridge: (runId: string) => Promise<boolean | void>;
};

const bridgeFallback: BridgeModule = {
  signalRunStarted: async () => undefined,
  flushBridge: async () => undefined,
};

let bridgeModulePromise: Promise<BridgeModule> | undefined;

function loadBridgeModule(): Promise<BridgeModule> {
  if (!bridgeModulePromise) {
    bridgeModulePromise = import('../../../scripts/start-tunnel-and-bridge.js')
      .then((module) => ({
        signalRunStarted: module.signalRunStarted,
        flushBridge: module.flushBridge,
      }))
      .catch(() => bridgeFallback);
  }
  return bridgeModulePromise;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const RUN_INFO_PATH = path.resolve(__dirname, '.test-storage/current-run.json');

export default async function (project: TestProject) {
  if (!process.env[TestEnvVar.TestRunMode]) {
    const border = '='.repeat(70);
    process.stderr.write([
      '',
      border,
      ' WARNING: TEST_RUN_MODE env var is missing. Results may not be recorded.',
      border,
      '',
    ].join('\n'));
  }

  let runId: string;
  let startTime: string;
  if (fs.existsSync(RUN_INFO_PATH)) {
    try {
      const existing = JSON.parse(fs.readFileSync(RUN_INFO_PATH, 'utf-8')) as { runId?: string; startTime?: string };
      if (existing.runId && typeof existing.runId === 'string') {
        runId = existing.runId;
        startTime = existing.startTime ?? new Date().toISOString();
      } else {
        runId = randomUUID();
        startTime = new Date().toISOString();
      }
    } catch {
      runId = randomUUID();
      startTime = new Date().toISOString();
    }
  } else {
    runId = randomUUID();
    startTime = new Date().toISOString();
  }

  project.provide('testRunId', runId);
  project.provide('testRunStartTime', startTime);

  fs.mkdirSync(path.dirname(RUN_INFO_PATH), { recursive: true });

  const runType = process.env[TestEnvVar.TestRunType] ?? undefined;
  const testFilesRaw = process.env[TestEnvVar.TestFiles];
  const testFiles = testFilesRaw !== undefined
    ? (testFilesRaw ? testFilesRaw.split(',').map((s) => s.trim()).filter(Boolean) : [])
    : undefined;
  const suiteType = process.env[TestEnvVar.TestSuiteType] ?? undefined;
  const payload =
    runType !== undefined
      ? { runType, testFiles: testFiles ?? [], suiteType: suiteType || undefined }
      : undefined;
  const bridge = await loadBridgeModule();
  await bridge.signalRunStarted(runId, payload);

  let logServer: Server | null = null;
  if (process.env[TestEnvVar.TestRunner] === TestRunMode.Unstable) {
    logServer = await startLogServer(TestLogServer.Port);
    process.env[TestEnvVar.TestLogServerPort] = String(TestLogServer.Port);
  }

  if (typeof process !== 'undefined' && process.env) {
    process.env[TestEnvVar.TestRunId] = runId;
  }
  fs.writeFileSync(
    RUN_INFO_PATH,
    JSON.stringify({
      runId,
      startTime,
      logServerPort: logServer ? TestLogServer.Port : undefined,
    }),
    'utf-8'
  );

  return async () => {
    try {
      const runInfo = JSON.parse(fs.readFileSync(RUN_INFO_PATH, 'utf-8')) as { runId?: string };
      if (runInfo?.runId) {
        const bridge = await loadBridgeModule();
        await bridge.flushBridge(runInfo.runId);
      }
    } catch {
      /* ignore read/flush errors */
    }
    if (logServer) {
      await stopLogServer(logServer);
    }
  };
}
