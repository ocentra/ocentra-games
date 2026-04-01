import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { CanonicalJSON } from '@ocentra/endpoint-domain/utils/canonical';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('CanonicalJSON.stringify: handles simple objects with sorted keys'), () => {
    logInfo('[TEST] Testing canonical JSON stringify with sorted keys', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const obj = { b: 2, a: 1, c: 3 };
    const expected = '{"a":1,"b":2,"c":3}';
    expect(CanonicalJSON.stringify(obj)).toBe(expected);
    logInfo('[TEST] Canonical JSON stringify validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('CanonicalJSON.stringify: handles nested objects with sorted keys'), () => {
    logInfo('[TEST] Testing canonical JSON with nested objects', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const obj = {
      z: 1,
      a: {
        y: 2,
        b: 3
      }
    };
    const expected = '{"a":{"b":3,"y":2},"z":1}';
    const result = CanonicalJSON.stringify(obj);
    expect(result).toBe(expected);
    if (result !== expected) {
      logError('[TEST] Canonical JSON nested object mismatch', getStackTrace(), { expected, actual: result });
    }
  });

  it(testName('CanonicalJSON.stringify: handles arrays correctly'), () => {
    const obj = {
      b: [3, 2, 1],
      a: 1
    };
    const expected = '{"a":1,"b":[3,2,1]}';
    expect(CanonicalJSON.stringify(obj)).toBe(expected);
  });

  it(testName('CanonicalJSON.stringify: handles arrays of objects with sorted keys'), () => {
    const obj = [
      { b: 2, a: 1 },
      { d: 4, c: 3 }
    ];
    const expected = '[{"a":1,"b":2},{"c":3,"d":4}]';
    expect(CanonicalJSON.stringify(obj)).toBe(expected);
  });

  it(testName('CanonicalJSON.stringify: handles null values'), () => {
    const obj = { b: null, a: 1 };
    const expected = '{"a":1,"b":null}';
    expect(CanonicalJSON.stringify(obj)).toBe(expected);
  });

  it(testName('CanonicalJSON.stringify: handles boolean values'), () => {
    const obj = { b: false, a: true };
    const expected = '{"a":true,"b":false}';
    expect(CanonicalJSON.stringify(obj)).toBe(expected);
  });

  it(testName('CanonicalJSON.stringify: handles numeric values consistently'), () => {
    const obj = { b: 1.0, a: 1 };
    const expected = '{"a":1,"b":1}';
    expect(CanonicalJSON.stringify(obj)).toBe(expected);
  });

  it(testName('CanonicalJSON.stringify: escapes control characters correctly'), () => {
    const obj = { a: "line\nbreak", b: "tab\tchar" };
    const result = CanonicalJSON.stringify(obj);
    expect(result).toContain('\\u000A');
    expect(result).toContain('\\u0009');
    expect(result).toBe('{"a":"line\\\\u000Abreak","b":"tab\\\\u0009char"}');
  });

  it(testName('CanonicalJSON.stringify: handles complex nested structures'), () => {
    const obj = {
      users: [
        { id: 2, name: "Alice" },
        { id: 1, name: "Bob" }
      ],
      metadata: {
        timestamp: 123456789,
        tags: ["security", "audit"]
      },
      active: true
    };
    const expected = '{"active":true,"metadata":{"tags":["security","audit"],"timestamp":123456789},"users":[{"id":2,"name":"Alice"},{"id":1,"name":"Bob"}]}';
    expect(CanonicalJSON.stringify(obj)).toBe(expected);
  });
});
