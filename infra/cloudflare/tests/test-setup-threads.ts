import { TestRunMode } from '@/constants/test-run-mode';

import { TestConfig, TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';

if (typeof process !== 'undefined' && process.env) {
  process.env[TestEnvVar.TestRunner] = TestRunMode.Unstable;
}
(globalThis as typeof globalThis & { __WORKER_LOGS_API_KEY__?: string }).__WORKER_LOGS_API_KEY__ = TestConfig.TestLogsApiKey;

import { beforeAll, beforeEach, afterEach } from 'vitest';
import type { TestContext } from 'vitest';
import { getCurrentTest } from '@vitest/runner';
import { setRunId } from '@ocentra/logging-domain/test-log/testLogBuffer';
import { RunType } from '@ocentra/logging-domain/test-log/types';
import { initLogConfig } from '@/logging/log-config';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { LogLevel } from '@/constants/logs-api';
import {
  createTestContext,
  cleanupTestContext,
  ensureContextReady,
  setCurrentContext,
} from './test-setup-core.js';

initLogConfig(
  {
    ENVIRONMENT: Environment.Development,
    TEST_MODE: TestEnvValue.True,
    LOG_LEVEL: LogLevel.Info,
  },
  (typeof process !== 'undefined' ? process.env : undefined) as { CI?: string } | undefined
);

beforeAll(() => {
  const envRunId = process.env[TestEnvVar.TestRunId];
  if (envRunId && envRunId.trim()) setRunId(envRunId.trim());
});

beforeEach(async (ctx: TestContext) => {
  await ensureContextReady();
  const task = ctx?.task ?? getCurrentTest();
  const context = createTestContext(task, RunType.SingleThreads);
  if (context) setCurrentContext(context);
});

afterEach(async () => {
  // Use shared cleanup function
  await cleanupTestContext();
});

export { getCurrentTestName, getTestHeaders, getTokenForFetch, type SetupContextToken } from './test-setup-core.js';
