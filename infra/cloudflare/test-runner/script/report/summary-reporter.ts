import { basename } from 'path';
import type { Reporter } from 'vitest/reporters';

type VitestTestModule = Parameters<NonNullable<Reporter['onTestRunEnd']>>[0][number];
type VitestTestCase = VitestTestModule extends { children: { allTests(): Iterable<infer T> } } ? T : never;

import {
  asFileKey,
  asNdjsonSummaryContent,
  asTestName,
  type FileKey,
  type NdjsonSummaryContent,
  type TestName,
} from '@ocentra/logging-domain/test-log/ndjsonBrands';
import { formatRunSummary } from '@ocentra/logging-domain/test-log/formatRunSummary';
import { getSuiteTypeFromPath, getFileKeyFromSuitePath } from '@ocentra/logging-domain/test-log/ndjsonPaths';
import { isTestSuiteType, SUITE_TYPE_META_KEY } from '@ocentra/logging-domain/test-log/types';
import { NdjsonLineType, LogRealm, RunType } from '@ocentra/logging-domain/test-log/types';
import { enqueueReporterPayload, flushReporterQueue, fetchRunInfoFromBridge } from '@ocentra/logging-domain/transport/bridgeTransport';
import { emitTestModuleEnd, onTestModuleEnd } from '@ocentra/logging-domain/test-log/testModuleEndEvents';
import { appendPerFileBlockToTxt } from '@ocentra/logging-domain/test-log/formatPerFileBlock';

const TEST_RESULTS_TXT_PATH_ENV = 'TEST_RESULTS_TXT_PATH';
const LOG_BRIDGE_URL_ENV = 'LOG_BRIDGE_URL';
const LOCAL_BRIDGE_URL = 'http://127.0.0.1:8765';

onTestModuleEnd((payload) => {
  const resultsPath = process.env[TEST_RESULTS_TXT_PATH_ENV];
  if (resultsPath) {
    appendPerFileBlockToTxt(payload, resultsPath);
  }
});
const BRIDGE_BASE_URL = process.env[LOG_BRIDGE_URL_ENV] ?? LOCAL_BRIDGE_URL;

/**
 * Max age for bridge run info before we consider it stale.
 * If someone does raw `npx vitest` without the test infrastructure,
 * the bridge will have old run info from a previous run — we reject it.
 */
const RUN_INFO_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

type RunInfoResult = { runId: string | null; runType: string | null; suiteType: string | null };
const NULL_RUN_INFO: RunInfoResult = { runId: null, runType: null, suiteType: null };

let _runInfoCache: RunInfoResult | null = null;
let _runInfoPromise: Promise<RunInfoResult> | null = null;
let _warnedOnce = false;

function warnOnce(msg: string): void {
  if (_warnedOnce) return;
  _warnedOnce = true;
  const border = '='.repeat(70);
  process.stderr.write([
    '',
    border,
    ' REPORTER WARNING: ' + msg,
    ' Test results will NOT be recorded to NDJSON.',
    border,
    '',
  ].join('\n'));
}

async function getRunInfoFromBridge(): Promise<RunInfoResult> {
  if (_runInfoCache) return _runInfoCache;
  if (!_runInfoPromise) {
    _runInfoPromise = fetchRunInfoFromBridge(BRIDGE_BASE_URL).then((info) => {
      if (!info || !info.runId) {
        warnOnce('Bridge has no active run. Was /__run_started__ called?');
        _runInfoCache = NULL_RUN_INFO;
        return _runInfoCache;
      }
      if (info.startedAt != null) {
        const ageMs = Date.now() - info.startedAt;
        if (ageMs > RUN_INFO_MAX_AGE_MS) {
          warnOnce(
            'Bridge run info is stale (' + Math.round(ageMs / 1000) + 's old). ' +
            'This usually means vitest was invoked directly instead of through the test runner.'
          );
          _runInfoCache = NULL_RUN_INFO;
          return _runInfoCache;
        }
      }
      _runInfoCache = { runId: info.runId, runType: info.runType, suiteType: info.suiteType };
      return _runInfoCache;
    }).catch(() => {
      warnOnce('Bridge unreachable at ' + BRIDGE_BASE_URL + '. Is the tunnel + bridge running?');
      _runInfoCache = NULL_RUN_INFO;
      return _runInfoCache;
    });
  }
  return _runInfoPromise;
}

function getRunInfoSync(): RunInfoResult {
  return _runInfoCache ?? NULL_RUN_INFO;
}

const VALID_RUN_TYPES: RunType[] = [
  RunType.Single,
  RunType.Full,
  RunType.SinglePool,
  RunType.SingleThreads,
];

const pendingFlushes: Promise<void>[] = [];

function resolveRunType(raw: string | null): RunType {
  if (!raw) return RunType.SinglePool;
  const s = raw.trim();
  return VALID_RUN_TYPES.includes(s as RunType) ? (s as RunType) : RunType.SinglePool;
}

function getSuiteTypeFromModule(testModule: VitestTestModule, moduleFileKey: string): string {
  const children = testModule.children;
  if (children?.array) {
    const first = children.array()[0] as unknown;
    const suite = first as {
      type?: string;
      meta?: (() => Record<string, unknown>) | Record<string, unknown>;
    } | undefined;
    if (suite?.type === 'suite' && suite.meta) {
      const meta = typeof suite.meta === 'function' ? suite.meta() : suite.meta;
      const raw = meta?.[SUITE_TYPE_META_KEY];
      if (typeof raw === 'string' && isTestSuiteType(raw)) return raw;
    }
  }
  // Use bridge-provided suiteType, then fall back to path-based detection
  const bridgeSuiteType = getRunInfoSync().suiteType;
  if (bridgeSuiteType && isTestSuiteType(bridgeSuiteType)) return bridgeSuiteType;
  return getSuiteTypeFromPath(moduleFileKey);
}

function mapState(state: string): 'passed' | 'failed' | 'unstable' | 'timeout' {
  if (state === 'passed') return 'passed';
  if (state === 'failed') return 'failed';
  if (state === 'skipped') return 'unstable';
  return 'timeout';
}

function countResults(testModules: ReadonlyArray<VitestTestModule>): {
  passed: number;
  failed: number;
  timeout: number;
  unstable: number;
} {
  let passed = 0;
  let failed = 0;
  let timeout = 0;
  let unstable = 0;
  for (const mod of testModules) {
    const children = mod.children;
    if (!children?.allTests) continue;
    for (const test of children.allTests()) {
      const result = test.result?.();
      const state = result?.state ?? 'pending';
      if (state === 'passed') passed++;
      else if (state === 'failed') failed++;
      else if (state === 'skipped') unstable++;
      else if (state === 'pending') timeout++;
    }
  }
  return { passed, failed, timeout, unstable };
}

function getModuleFileKey(mod: VitestTestModule): string {
  const m = mod as { relativeModuleId?: string; moduleId?: string };
  return m.relativeModuleId ?? m.moduleId ?? 'unknown.test.ts';
}

class SummaryReporter implements Reporter {
  async onTestModuleStart(): Promise<void> {
    await getRunInfoFromBridge();
  }

  onTestCaseResult(testCase: VitestTestCase): void {
    const info = getRunInfoSync();
    if (!info.runId) return;
    const runId = info.runId;
    const runType = resolveRunType(info.runType);
    const mod = testCase.module as VitestTestModule;
    const moduleFileKey = getModuleFileKey(mod);
    const moduleFileName = basename(moduleFileKey);
    const suiteType = getSuiteTypeFromModule(mod, moduleFileKey);
    const fileKey: FileKey = asFileKey(getFileKeyFromSuitePath(moduleFileKey));
    const name: TestName = asTestName(testCase.name ?? 'unknown');
    const result = testCase.result?.();
    const state = result?.state ?? 'pending';
    const diagnostic = testCase.diagnostic?.();
    const durationMs = typeof diagnostic?.duration === 'number' ? diagnostic.duration : null;
    try {
      const line =
        JSON.stringify({
          type: NdjsonLineType.TestResult,
          run_id: runId,
          run_type: runType,
          suite_type: suiteType,
          suite_path: moduleFileKey,
          test_file: moduleFileName,
          test_name: name,
          status: mapState(state),
          duration_ms: durationMs,
          ts: new Date().toISOString(),
        }) + '\n';
      const scope = { consumer: LogRealm.Cloudflare, runType, suiteType };
      enqueueReporterPayload({ type: 'test_result', scope, fileKey, testName: name, lines: line }, BRIDGE_BASE_URL);
    } catch {
      /* enqueue failed — bridge will handle */
    }
  }

  onTestModuleEnd(testModule: VitestTestModule): void {
    const moduleInfo = getRunInfoSync();
    const runId = moduleInfo.runId;
    const runType = resolveRunType(moduleInfo.runType);
    const moduleFileKey = getModuleFileKey(testModule);
    const suiteType = getSuiteTypeFromModule(testModule, moduleFileKey);
    const fileKey: FileKey = asFileKey(getFileKeyFromSuitePath(moduleFileKey));
    let passed = 0;
    let failed = 0;
    let timeout = 0;
    let unstable = 0;
    let durationMs = 0;
    const children = testModule.children;
    if (children?.allTests) {
      for (const test of children.allTests()) {
        const result = test.result?.();
        const state = result?.state ?? 'pending';
        if (state === 'passed') passed++;
        else if (state === 'failed') failed++;
        else if (state === 'skipped') unstable++;
        else if (state === 'pending') timeout++;
        const diagnostic = (test as { diagnostic?: () => { duration?: number } }).diagnostic?.();
        if (typeof diagnostic?.duration === 'number') durationMs += diagnostic.duration;
      }
    }
    const status = failed > 0 || timeout > 0 ? 'failed' : 'passed';
    if (runId) {
      try {
        const content: NdjsonSummaryContent = asNdjsonSummaryContent(
          JSON.stringify({
            type: NdjsonLineType.RunSummary,
            run_id: runId,
            run_type: runType,
            suite_type: suiteType,
            status,
            passed,
            failed,
            timeout,
            unstable,
            duration_ms: durationMs,
            ts: new Date().toISOString(),
          }) + '\n'
        );
        const scope = { consumer: LogRealm.Cloudflare, runType, suiteType };
        enqueueReporterPayload({ type: 'run_summary', scope, fileKey, content }, BRIDGE_BASE_URL);
        const flushPromise = flushReporterQueue()
          .then(() => {
            emitTestModuleEnd({ runId, runType, suiteType, fileKey });
          })
          .catch(() => {
            /* flush failed — bridge will handle */
          });
        pendingFlushes.push(flushPromise);
        void flushPromise.finally(() => {
          const idx = pendingFlushes.indexOf(flushPromise);
          if (idx >= 0) pendingFlushes.splice(idx, 1);
        });
      } catch {
        /* enqueue failed */
      }
    }
  }

  async onTestRunEnd(
    testModules: ReadonlyArray<VitestTestModule>,
    unhandledErrors: ReadonlyArray<unknown>,
    reason: string
  ): Promise<void> {
    void unhandledErrors;
    void reason;
    if (pendingFlushes.length > 0) {
      await Promise.allSettled([...pendingFlushes]);
    }
    for (const testModule of testModules) {
      const moduleFileKey = getModuleFileKey(testModule);
      let passed = 0;
      let failed = 0;
      let timeout = 0;
      let unstable = 0;
      const children = testModule.children;
      if (children?.allTests) {
        for (const test of children.allTests()) {
          const result = test.result?.();
          const state = result?.state ?? 'pending';
          if (state === 'passed') passed++;
          else if (state === 'failed') failed++;
          else if (state === 'skipped') unstable++;
          else if (state === 'pending') timeout++;
        }
      }
      const status = failed > 0 || timeout > 0 ? 'failed' : 'passed';
      const statusIcon = status === 'failed' ? '❌' : '✅';
      const line = `  📄 ${moduleFileKey}: ${passed} passed, ${failed} failed, ${timeout} timeout, ${unstable} unstable ${statusIcon}`;
      process.stdout.write(line + '\n');
    }
    const { passed, failed, timeout, unstable } = countResults(testModules);
    const info = await getRunInfoFromBridge();
    const runId = info.runId;
    const runType = resolveRunType(info.runType);
    if (runId) {
      console.log(
        formatRunSummary({
          runId,
          runType,
          passed,
          failed,
          timeout,
          unstable,
        })
      );
    }
  }
}

export default SummaryReporter;
