/**
 * Test setup core: context creation, headers, and cleanup.
 *
 * Threads vs pool:
 * - Pool: tests run inside the worker; context is per-request (request-context.ts).
 * - Threads: tests run in Node (Vitest worker threads); context is thread-isolated via
 *   test-runner-context.ts (AsyncLocalStorage) so one thread cannot overwrite another's context.
 *
 * ensureContextReady() must run before createTestContext/setCurrentContext so the correct
 * implementation (ALS in Node, global in worker) is used. suitePath is required and must not
 * be empty or 'unknown'; getTestHeaders() and createTestContext() fail-fast if invalid.
 */
import type { TestContext } from 'vitest';
import { getRunId, setRunId } from '@ocentra/logging-domain/test-log/testLogBuffer';
import { RunType, TestLogOrigin } from '@ocentra/logging-domain/test-log/types';
import { TestEnvVar } from '@tests/constants/test-constants';
import type { RequestContext } from '@/logging/request-context';
import { createMinimalContext } from '@/logging/request-context';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import { TestLogServer } from '@tests/constants/test-constants';
import { isTestSuiteType } from '@ocentra/logging-domain/test-log/types';
import { getSuiteTypeWithFallback } from '../test-runner/script/lib/suite-type-map.js';
import { toTestName } from '@tests/helpers/test-name';

const INVALID_SUITE_PATH_SENTINEL = 'unknown';

let setCurrentContextImpl: ((ctx: RequestContext | null) => void) | null = null;
let getCurrentContextImpl: (() => RequestContext | null) | null = null;
let contextReady: Promise<void> | null = null;

export async function ensureContextReady(): Promise<void> {
  if (getCurrentContextImpl) return;
  if (!contextReady) {
    contextReady = (async () => {
      if ((globalThis as { __TEST_POOL_CONTEXT?: boolean }).__TEST_POOL_CONTEXT === true) {
        const m = await import('@/logging/request-context');
        setCurrentContextImpl = m.setCurrentContext;
        getCurrentContextImpl = m.getCurrentContext;
        return;
      }
      const hasNode = typeof process !== 'undefined' && process.versions?.node;
      if (hasNode) {
        const m = await import('./test-runner-context.js');
        setCurrentContextImpl = m.setCurrentContext;
        getCurrentContextImpl = m.getCurrentContext;
      } else {
        const m = await import('@/logging/request-context');
        setCurrentContextImpl = m.setCurrentContext;
        getCurrentContextImpl = m.getCurrentContext;
      }
    })();
  }
  await contextReady;
}

export function setCurrentContext(ctx: RequestContext | null): void {
  if (setCurrentContextImpl) setCurrentContextImpl(ctx);
}

export function getCurrentContext(): RequestContext | null {
  if (!getCurrentContextImpl) return null;
  return getCurrentContextImpl();
}

let currentTestName: string | null = null;

export function setCurrentTestName(name: string | null): void {
  currentTestName = name;
}

export function getCurrentTestName(): string | null {
  return currentTestName;
}

const __setupContextToken: unique symbol = Symbol('setupContextToken');

export type SetupContextToken = {
  readonly [__setupContextToken]: true;
  readonly context: RequestContext;
};

export function createSetupContextToken(context: RequestContext): SetupContextToken {
  return { [__setupContextToken]: true, context } as SetupContextToken;
}

let currentSetupContextToken: SetupContextToken | null = null;

export function setCurrentSetupContextToken(token: SetupContextToken | null): void {
  currentSetupContextToken = token;
}

export function getCurrentSetupContextToken(): SetupContextToken | undefined {
  return currentSetupContextToken ?? undefined;
}

export function isSetupContextToken(value: unknown): value is SetupContextToken {
  return (
    typeof value === 'object' &&
    value !== null &&
    __setupContextToken in value &&
    'context' in value
  );
}

/**
 * Set up test context for setup-phase requests (e.g. beforeAll seeding).
 * Use this in threads mode (no cloudflare:test). For pool mode, use test-setup-pool's setSetupContext.
 */
export async function setSetupContext(testName: string, suitePath: string): Promise<SetupContextToken> {
  if (suitePath === undefined || suitePath === '' || suitePath === 'unknown') {
    throw new Error(
      '[FAIL-FAST] setSetupContext requires non-empty suitePath (e.g. "tests/e2e/upload-download.test.ts") for log paths.'
    );
  }
  await ensureContextReady();
  let runId = getRunId();
  if (!runId) {
    runId = crypto.randomUUID();
    setRunId(runId);
  }
  setCurrentTestName(testName);

  const suiteType = getSuiteTypeWithFallback(suitePath, process.cwd()).type;
  const envRunType = process.env[TestEnvVar.TestRunType] ?? process.env.TEST_RUN_TYPE;
  const runType =
    envRunType && Object.values(RunType).includes(envRunType as RunType)
      ? (envRunType as RunType)
      : RunType.SingleThreads;

  const ctx = createMinimalContext();
  ctx.testName = testName;
  ctx.runId = runId;
  ctx.suitePath = suitePath;
  ctx.suiteType = suiteType;
  ctx.runType = runType;
  ctx.origin = TestLogOrigin.Test;
  setCurrentContext(ctx);

  const token = createSetupContextToken(ctx);
  setCurrentSetupContextToken(token);
  return token;
}

function isInvalidSuitePath(value: string | undefined): boolean {
  return value === undefined || value === '' || value === INVALID_SUITE_PATH_SENTINEL;
}

/**
 * Build test headers from token. Token is required and carries the context.
 * For pool mode without token, use getTestHeadersFromGlobal() (backward compat).
 */
export function getTestHeaders(token: SetupContextToken): Headers {
  const context = token.context;
  if (!context) {
    throw new Error('[FAIL-FAST] Token has no context. Use createSetupContextToken(context) to create a valid token.');
  }
  return buildTestHeadersFromContext(context);
}

/**
 * Build test headers from global context (pool mode backward compat).
 * For threads/parallel mode, use getTestHeaders(token) instead.
 */
export function getTestHeadersFromGlobal(): Headers {
  const context = getCurrentContext();
  if (!context) {
    throw new Error(
      '[FAIL-FAST] No test context when building headers. Import test-setup-pool or test-setup-threads and ensure beforeEach ran (ensureContextReady before createTestContext).'
    );
  }
  return buildTestHeadersFromContext(context);
}

export function getTokenForFetch(): SetupContextToken | undefined {
  const context = getCurrentContext();
  return context ? createSetupContextToken(context) : undefined;
}

function buildTestHeadersFromContext(context: RequestContext): Headers {
  if (isInvalidSuitePath(context.suitePath)) {
    throw new Error(
      `[FAIL-FAST] Invalid suitePath when building headers: ${JSON.stringify(context.suitePath)}. ` +
        'Vitest task.file?.name must be set (required for log paths). Use pool mode or ensure test file path is available in ctx.task.'
    );
  }

  const suitePath = context.suitePath as string;
  const headers = new Headers();

  const rawTestName = context.testName ?? getCurrentTestName();
  const runId = context.runId ?? getRunId();
  if (rawTestName) headers.set('X-Test-Name', toTestName(rawTestName));
  if (runId) headers.set('X-Run-Id', runId);
  headers.set('X-Suite-Path', suitePath);
  if (context.suiteType && isTestSuiteType(context.suiteType)) {
    headers.set('X-Suite-Type', context.suiteType);
  }
  const runType =
    (globalThis as { __TEST_POOL_CONTEXT?: boolean }).__TEST_POOL_CONTEXT === true
      ? RunType.SinglePool
      : RunType.SingleThreads;
  headers.set('X-Run-Type', runType);
  const bridgeUrl = process.env.LOG_BRIDGE_URL ?? TestLogServer.BaseUrl;
  headers.set('X-Test-Log-Server-Url', bridgeUrl);

  const killSwitchState = (globalThis as { __TEST_KILL_SWITCH_ENABLED?: boolean }).__TEST_KILL_SWITCH_ENABLED;
  if (killSwitchState !== undefined) {
    headers.set('X-Test-Kill-Switch', killSwitchState ? 'true' : 'false');
  }

  return headers;
}

/**
 * Create test context from Vitest task - shared between pool and threads setup.
 * In threads mode, context is stored in AsyncLocalStorage so each Vitest worker thread
 * has isolated context (no cross-thread overwrite). In pool mode, context is per-request in the worker.
 * @param task The Vitest task object from ctx.task
 * @param defaultRunType Default RunType to use (SinglePool for pool, SingleThreads for threads)
 * @param runTypeEnv Optional environment variable for RunType override
 * @returns The created context or null if task is undefined
 */
export function createTestContext(
  task: TestContext['task'],
  defaultRunType: RunType,
  runTypeEnv?: string
): ReturnType<typeof createMinimalContext> | null {
  if (!task) return null;

  const suitePath = task.file?.name;
  if (suitePath === undefined || suitePath === '') {
    throw new Error(
      '[FAIL-FAST] Vitest task.file?.name is missing or empty. Required for log paths (suitePath). ' +
        'Use pool mode or ensure Vitest provides file path in ctx.task.'
    );
  }
  if (suitePath === INVALID_SUITE_PATH_SENTINEL) {
    throw new Error(
      `[FAIL-FAST] Vitest task.file?.name must not be the sentinel "${INVALID_SUITE_PATH_SENTINEL}". Required for log paths.`
    );
  }

  const testName = task.name || task.id || 'unknown';
  setCurrentTestName(testName);
  const suiteType = getSuiteTypeWithFallback(suitePath, process.cwd()).type;
  const runId = getRunId();

  // Use provided runTypeEnv or fall back to process.env
  const envRunType = runTypeEnv ?? process.env.TEST_RUN_TYPE;
  const runType =
    envRunType && Object.values(RunType).includes(envRunType as RunType)
      ? (envRunType as RunType)
      : defaultRunType;

  const context = createMinimalContext();
  context.testName = testName;
  context.runId = runId || undefined;
  context.testLogServerUrl = process.env.LOG_BRIDGE_URL ?? TestLogServer.BaseUrl;
  context.suitePath = suitePath;
  context.suiteType = suiteType;
  context.runType = runType;
  context.origin = TestLogOrigin.Test;
  return context;
}

/**
 * Clean up test context after each test - shared between pool and threads.
 * Flushes logs and clears the request context to prevent race conditions.
 */
export async function cleanupTestContext(): Promise<void> {
  await flushAllBatchesAndTestLogs();
  setCurrentTestName(null);
  setCurrentSetupContextToken(null);
  // CRITICAL: Clear context to prevent race condition in concurrent requests
  setCurrentContext(null);
}
