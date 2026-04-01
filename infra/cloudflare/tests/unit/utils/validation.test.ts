import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { validateMatchRecord } from '@ocentra/endpoint-domain/utils/validation';
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

  it(testName('validateMatchRecord: validates record with match_id and version'), () => {
    logInfo('[TEST] Testing validateMatchRecord', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const record = {
      match_id: 'match123',
      version: '1.0.0',
      events: [],
    };
    const result = validateMatchRecord(record);
    logInfo('[TEST] validateMatchRecord result', getStackTrace(), { valid: result.valid }, LOG_TEST_OPERATIONS);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
    if (result.valid !== true || result.error !== undefined) {
      logError('[TEST] Match record validation failed', getStackTrace(), { valid: result.valid, error: result.error });
    }
  });

  it(testName('validateMatchRecord: validates record with matchId and schema_version'), () => {
    const record = {
      matchId: 'match123',
      schema_version: '2.1.0',
      events: [],
    };
    const result = validateMatchRecord(record);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it(testName('validateMatchRecord: validates record with events array'), () => {
    const record = {
      match_id: 'match123',
      version: '1.0.0',
      events: [{ type: 'test', timestamp: 1234567890 }],
    };
    const result = validateMatchRecord(record);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it(testName('validateMatchRecord: rejects non-object input'), () => {
    const result = validateMatchRecord(null);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Match record must be an object');
  });

  it(testName('validateMatchRecord: rejects non-object types'), () => {
    expect(validateMatchRecord('string').valid).toBe(false);
    expect(validateMatchRecord(123).valid).toBe(false);
    expect(validateMatchRecord(true).valid).toBe(false);
    expect(validateMatchRecord([]).valid).toBe(false);
  });

  it(testName('validateMatchRecord: rejects record without match_id or matchId'), () => {
    logInfo('[TEST] Testing match record validation rejection', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const record = {
      version: '1.0.0',
      events: [],
    };
    const result = validateMatchRecord(record);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Match record must have match_id or matchId');
    if (result.valid !== false || result.error !== 'Match record must have match_id or matchId') {
      logError('[TEST] Match record validation should reject missing match_id', getStackTrace(), { valid: result.valid, error: result.error });
    }
  });

  it(testName('validateMatchRecord: rejects record without version or schema_version'), () => {
    const record = {
      match_id: 'match123',
      events: [],
    };
    const result = validateMatchRecord(record);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Match record must have version or schema_version');
  });

  it(testName('validateMatchRecord: rejects invalid version format'), () => {
    const record = {
      match_id: 'match123',
      version: 'invalid',
      events: [],
    };
    const result = validateMatchRecord(record);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Version must be semantic version (e.g., "1.0.0")');
  });

  it(testName('validateMatchRecord: rejects non-semantic version format'), () => {
    expect(validateMatchRecord({ match_id: 'match123', version: '1.0', events: [] }).valid).toBe(false);
    expect(validateMatchRecord({ match_id: 'match123', version: '1', events: [] }).valid).toBe(false);
    expect(validateMatchRecord({ match_id: 'match123', version: 'v1.0.0', events: [] }).valid).toBe(false);
    expect(validateMatchRecord({ match_id: 'match123', version: '1.0.0.0', events: [] }).valid).toBe(false);
  });

  it(testName('validateMatchRecord: accepts valid semantic versions'), () => {
    expect(validateMatchRecord({ match_id: 'match123', version: '1.0.0', events: [] }).valid).toBe(true);
    expect(validateMatchRecord({ match_id: 'match123', version: '2.1.3', events: [] }).valid).toBe(true);
    expect(validateMatchRecord({ match_id: 'match123', version: '10.20.30', events: [] }).valid).toBe(true);
  });

  it(testName('validateMatchRecord: rejects record without events array'), () => {
    const record = {
      match_id: 'match123',
      version: '1.0.0',
    };
    const result = validateMatchRecord(record);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Match record must have events array');
  });

  it(testName('validateMatchRecord: rejects record where events is not an array'), () => {
    expect(validateMatchRecord({ match_id: 'match123', version: '1.0.0', events: 'not-array' }).valid).toBe(false);
    expect(validateMatchRecord({ match_id: 'match123', version: '1.0.0', events: {} }).valid).toBe(false);
    expect(validateMatchRecord({ match_id: 'match123', version: '1.0.0', events: null }).valid).toBe(false);
  });

  it(testName('validateMatchRecord: rejects events array that exceeds maximum size'), () => {
    const record = {
      match_id: 'match123',
      version: '1.0.0',
      events: new Array(10001).fill({ type: 'test' }),
    };
    const result = validateMatchRecord(record);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Events array too large (max 10000 events)');
  });

  it(testName('validateMatchRecord: accepts events array at maximum size'), () => {
    const record = {
      match_id: 'match123',
      version: '1.0.0',
      events: new Array(10000).fill({ type: 'test' }),
    };
    const result = validateMatchRecord(record);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it(testName('validateMatchRecord: accepts empty events array'), () => {
    const record = {
      match_id: 'match123',
      version: '1.0.0',
      events: [],
    };
    const result = validateMatchRecord(record);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
