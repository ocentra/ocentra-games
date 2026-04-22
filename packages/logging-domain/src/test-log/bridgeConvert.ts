import type { BridgeLogPayload } from '@ocentra/logging-domain/transport/bridgeLogPayload';
import type { TestLog, NdjsonLogEntry, RunType, TestSuiteTypeValue, TestLogOrigin } from '@ocentra/logging-domain/test-log/types';
import { TestLogOrigin as TestLogOriginConst } from '@ocentra/logging-domain/test-log/types';

function asLevel(v: string): 'error' | 'warn' | 'info' | 'debug' {
  const s = String(v).toLowerCase();
  if (s === 'error' || s === 'warn' || s === 'info' || s === 'debug') return s;
  return 'info';
}

function asOrigin(v: string | null): TestLogOrigin | null {
  if (v == null || v === '') return null;
  const s = String(v).toLowerCase();
  return s === TestLogOriginConst.Test || s === TestLogOriginConst.Worker ? s : null;
}

export function bridgePayloadToTestLog(
  testId: string,
  testFullName: string,
  testName: string,
  runId: string,
  payload: BridgeLogPayload,
  suitePath: string | null,
  suiteType: TestSuiteTypeValue | null
): TestLog {
  return {
    test_id: testId,
    test_full_name: testFullName,
    test_name: testName,
    run_id: runId,
    log_timestamp: payload.log_timestamp,
    level: asLevel(payload.level),
    source: payload.source ?? null,
    context: payload.context ?? null,
    message: payload.message,
    data: payload.data ?? null,
    file: payload.file ?? null,
    file_path: payload.file_path ?? null,
    line: payload.line ?? null,
    column: payload.column ?? null,
    correlation_id: payload.correlation_id ?? null,
    tags: payload.tags ?? null,
    stack: payload.stack ?? null,
    suite_path: suitePath ?? payload.suite_path ?? null,
    suite_type: suiteType ?? (payload.suite_type as TestSuiteTypeValue) ?? null,
    origin: asOrigin(payload.origin),
    realm: payload.consumer ?? null,
    environment: payload.environment ?? null,
  };
}

export function testLogToNdjsonEntry(log: TestLog, runType: RunType): NdjsonLogEntry {
  return {
    ts: new Date(log.log_timestamp).toISOString(),
    runId: log.run_id,
    runType,
    suiteType: log.suite_type ?? 'unit',
    suitePath: log.suite_path ?? 'unknown',
    testName: log.test_name,
    testId: log.test_id,
    cid: log.correlation_id,
    origin: log.origin,
    lvl: log.level,
    log: log.source,
    fn: log.context,
    file: log.file ?? log.file_path,
    line: log.line,
    col: log.column,
    msg: log.message,
    data: log.data,
    tags: log.tags,
    stack: log.stack,
    realm: log.realm ?? null,
    environment: log.environment ?? null,
  };
}

export function ndjsonEntryToTestLog(entry: NdjsonLogEntry): TestLog {
  const logTimestamp =
    entry.ts != null && String(entry.ts).trim() !== ''
      ? new Date(entry.ts).getTime()
      : Date.now();
  return {
    test_id: entry.testId,
    test_full_name: entry.testName,
    test_name: entry.testName,
    run_id: entry.runId,
    log_timestamp: logTimestamp,
    level: asLevel(entry.lvl),
    source: entry.log,
    context: entry.fn,
    message: entry.msg,
    data: entry.data,
    file: entry.file,
    file_path: entry.file,
    line: entry.line,
    column: entry.col,
    correlation_id: entry.cid,
    tags: entry.tags,
    stack: entry.stack,
    suite_path: entry.suitePath,
    suite_type: entry.suiteType as TestSuiteTypeValue | null,
    origin: asOrigin(entry.origin),
    realm: entry.realm ?? null,
    environment: entry.environment ?? null,
  };
}
