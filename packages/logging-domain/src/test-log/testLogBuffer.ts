import type { TestLog } from '@ocentra/logging-domain/test-log/types';

interface SharedLogBuffer {
  logBuffer: Map<string, TestLog[]>;
  currentRunId: string | null;
}

const sharedBuffer: SharedLogBuffer = {
  logBuffer: new Map<string, TestLog[]>(),
  currentRunId: null,
};

function getBufferKey(testName: string, runId: string): string {
  return `${runId}:${testName}`;
}

export function setRunId(runId: string): void {
  sharedBuffer.currentRunId = runId;
  if (typeof process !== 'undefined' && process.env) {
    (process.env as Record<string, string>).__OCENTRA_TEST_RUN_ID__ = runId;
  }
  const g = globalThis as typeof globalThis & { __OCENTRA_TEST_RUN_ID__?: string };
  g.__OCENTRA_TEST_RUN_ID__ = runId;
}

export function getRunId(): string | null {
  const g = globalThis as typeof globalThis & { __OCENTRA_TEST_RUN_ID__?: string };
  if (g.__OCENTRA_TEST_RUN_ID__) return g.__OCENTRA_TEST_RUN_ID__;
  if (typeof process !== 'undefined' && process.env) {
    const envRunId = (process.env as Record<string, string>).__OCENTRA_TEST_RUN_ID__;
    if (envRunId) return envRunId;
  }
  return sharedBuffer.currentRunId;
}

export function addLog(testName: string, runId: string, log: TestLog): void {
  const key = getBufferKey(testName, runId);
  if (!sharedBuffer.logBuffer.has(key)) {
    sharedBuffer.logBuffer.set(key, []);
  }
  sharedBuffer.logBuffer.get(key)!.push(log);
}

export function getLogs(testName: string, runId: string): TestLog[] {
  const key = getBufferKey(testName, runId);
  return sharedBuffer.logBuffer.get(key) || [];
}

export function clearLogs(testName: string, runId: string): void {
  sharedBuffer.logBuffer.delete(getBufferKey(testName, runId));
}

export function clearAllLogs(): void {
  sharedBuffer.logBuffer.clear();
}

export function getBufferStats(): { totalLogs: number; testCount: number } {
  let totalLogs = 0;
  for (const logs of sharedBuffer.logBuffer.values()) {
    totalLogs += logs.length;
  }
  return {
    totalLogs,
    testCount: sharedBuffer.logBuffer.size,
  };
}
