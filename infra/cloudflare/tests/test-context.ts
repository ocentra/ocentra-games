import { TestRunner } from 'vitest';
import { setRunId } from '@ocentra/logging-domain/test-log/testLogBuffer';
import { RunType } from '@ocentra/logging-domain/test-log/types';
import { initLogConfig } from '@/logging/log-config';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { LogLevel } from '@/constants/logs-api';
import { TestRunMode } from '@/constants/test-run-mode';
import { TestConfig, TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
import {
  createTestContext,
  createSetupContextToken,
  ensureContextReady,
  type SetupContextToken,
} from './test-setup-core.js';

if (typeof process !== 'undefined' && process.env) {
  process.env[TestEnvVar.TestRunner] = TestRunMode.Unstable;
}
(globalThis as typeof globalThis & { __WORKER_LOGS_API_KEY__?: string }).__WORKER_LOGS_API_KEY__ = TestConfig.TestLogsApiKey;

initLogConfig(
  {
    ENVIRONMENT: Environment.Development,
    TEST_MODE: TestEnvValue.True,
    LOG_LEVEL: LogLevel.Info,
  },
  (typeof process !== 'undefined' ? process.env : undefined) as { CI?: string } | undefined
);

let initialized = false;

export async function createToken(): Promise<SetupContextToken> {
  if (!initialized) {
    const envRunId = process.env[TestEnvVar.TestRunId];
    if (envRunId && envRunId.trim()) setRunId(envRunId.trim());
    initialized = true;
  }

  await ensureContextReady();
  const task = TestRunner.getCurrentTest();
  if (!task) {
    throw new Error('[FAIL-FAST] getCurrentTest() returned null. Cannot create context.');
  }

  const context = createTestContext(task, RunType.SingleThreads);
  if (!context) {
    throw new Error('[FAIL-FAST] createTestContext returned null. Cannot create token.');
  }

  return createSetupContextToken(context);
}

export type { SetupContextToken };
