import { beforeAll, beforeEach, afterEach } from 'vitest';
import type { TestContext } from 'vitest';
import { SELF, env } from 'cloudflare:test';
import { getRunId, setRunId } from '@ocentra/logging-domain/test-log/testLogBuffer';
import { createMinimalContext } from '@/logging/request-context';
import { RunType, TestLogOrigin } from '@ocentra/logging-domain/test-log/types';
import { LogLevel } from '@/constants/logs-api';
import { initLogConfig } from '@/logging/log-config';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import {
  setCurrentTestName,
  getCurrentTestName,
  getTestHeaders,
  getTestHeadersFromGlobal,
  createSetupContextToken,
  createTestContext,
  cleanupTestContext,
  ensureContextReady,
  setCurrentContext,
  setCurrentSetupContextToken,
  getCurrentContext,
  isSetupContextToken,
  type SetupContextToken,
} from './test-setup-core.js';
import { TestConfig, TestEnvValue } from '@tests/constants/test-constants';
import { getSuiteTypeWithFallback } from '../test-runner/script/lib/suite-type-map.js';

(globalThis as typeof globalThis & { __TEST_POOL_CONTEXT?: boolean }).__TEST_POOL_CONTEXT = true;

export { getCurrentTestName, getTestHeadersFromGlobal, type SetupContextToken } from './test-setup-core.js';

export function setSetupContext(testName: string, suitePath: string): SetupContextToken {
  if (suitePath === undefined || suitePath === '' || suitePath === 'unknown') {
    throw new Error(
      '[FAIL-FAST] setSetupContext requires non-empty suitePath (e.g. "tests/unit/auth.test.ts") for log paths.'
    );
  }
  let runId = getRunId();
  if (!runId) {
    runId = crypto.randomUUID();
    setRunId(runId);
  }
  setCurrentTestName(testName);

  const suiteType = getSuiteTypeWithFallback(suitePath, process.cwd()).type;

  const runTypeEnv =
    (envRecord.TEST_RUN_TYPE as string | undefined) ?? RunType.SinglePool;
  const runType =
    runTypeEnv && Object.values(RunType).includes(runTypeEnv as RunType)
      ? (runTypeEnv as RunType)
      : RunType.SinglePool;

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

const REQUIRED_BINDINGS = ['TEST_MODE', 'ENVIRONMENT', 'CORS_ORIGIN'] as const;
const envRecord = env as Record<string, unknown>;
const missingBindings = REQUIRED_BINDINGS.filter((b) => envRecord[b] === undefined);

if (missingBindings.length > 0) {
  const errorMessage = `
================================================================================
FAIL-FAST: MISSING REQUIRED BINDINGS
================================================================================

The following bindings are NOT available in the worker environment:
  ${missingBindings.map((b) => `- ${b}: undefined`).join('\n  ')}

Available bindings in env:
  ${Object.keys(envRecord).join(', ') || '(none)'}

CAUSE: vitest.config.ts poolOptions.workers.miniflare.bindings is not configured correctly.

FIX: Ensure all required vars are in 'bindings' (NOT 'vars') in vitest.config.ts:
  miniflare: {
    bindings: {
      TEST_MODE: 'true',
      ENVIRONMENT: 'development',
      CORS_ORIGIN: '*',
      ...
    }
  }

================================================================================
`;
  throw new Error(errorMessage.trim());
}

const logsKey = typeof envRecord.LOGS_API_KEY === 'string' ? envRecord.LOGS_API_KEY : TestConfig.TestLogsApiKey;
(globalThis as typeof globalThis & { __WORKER_LOGS_API_KEY__?: string }).__WORKER_LOGS_API_KEY__ = logsKey;

initLogConfig(
  {
    ENVIRONMENT: Environment.Development,
    TEST_MODE: TestEnvValue.True,
    LOG_LEVEL: LogLevel.Info,
  },
  (typeof process !== 'undefined' ? process.env : undefined) as { CI?: string } | undefined
);

beforeAll(() => {
  const envRunId = envRecord.TEST_RUN_ID as string;
  const bufferRunId = getRunId();
  const runId = envRunId || bufferRunId;
  if (runId) setRunId(runId);
});

beforeEach(async (ctx: TestContext) => {
  await ensureContextReady();
  const context = createTestContext(ctx.task, RunType.SinglePool, RunType.SinglePool);
  if (context) {
    setCurrentContext(context);
    setCurrentSetupContextToken(createSetupContextToken(context));
  }
});

afterEach(async () => {
  // Use shared cleanup function
  await cleanupTestContext();
});

export async function fetchWithTestContext(
  input: RequestInfo | URL,
  init?: RequestInit,
  token?: SetupContextToken
): Promise<Response> {
  if (!token) {
    const testName = getCurrentTestName();
    const runId = getRunId();
    if (!testName || !runId) {
      throw new Error(
        `[FAIL-FAST] Test context not set. Import test-setup-pool and ensure beforeEach ran, or use setSetupContext() and pass token.`
      );
    }
  }

  const ctx = getCurrentContext();
  const savedOrigin = ctx?.origin;

  const initHeaders = init?.headers ? new Headers(init.headers) : null;
  const headers =
    token && isSetupContextToken(token)
      ? getTestHeaders(token)
      : initHeaders != null
        ? initHeaders
        : getTestHeadersFromGlobal();
  const mergedInit: RequestInit = {
    ...init,
    headers: new Headers({
      ...Object.fromEntries(headers.entries()),
      ...(init?.headers ? Object.fromEntries(new Headers(init.headers).entries()) : {}),
    }),
  };

  try {
    return await SELF.fetch(input, mergedInit);
  } finally {
    const currentCtx = getCurrentContext();
    if (currentCtx && savedOrigin !== undefined) {
      currentCtx.origin = savedOrigin;
    }
  }
}
