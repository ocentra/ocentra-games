import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { parsePathSegments, parseMatchDOPath } from '@ocentra/endpoint-domain/utils/path-segment-parser';
import { generateTestMatchId } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;

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

  it(testName('parsePathSegments: parses valid path into segments'), () => {
    const result = parsePathSegments('/match/test-id/create');
    logInfo('parsePathSegments', getStackTrace(), { result }, LOG_TEST_OPERATIONS);
    expect(result.isValid).toBe(true);
    expect(result.segments).toEqual(['match', 'test-id', 'create']);
  });

  it(testName('parsePathSegments: handles path with trailing slash'), () => {
    const result = parsePathSegments('/match/test-id/');
    logInfo('parsePathSegments trailing slash', getStackTrace(), { result }, LOG_TEST_RESPONSE_DETAILS);
    expect(result.isValid).toBe(true);
    expect(result.segments).toEqual(['match', 'test-id']);
  });

  it(testName('parsePathSegments: handles root path'), () => {
    const result = parsePathSegments('/');
    expect(result.isValid).toBe(true);
    expect(result.segments).toEqual([]);
  });

  it(testName('parsePathSegments: rejects path without leading slash'), () => {
    const result = parsePathSegments('match/test-id');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must start with /');
  });

  it(testName('parsePathSegments: rejects empty path'), () => {
    const result = parsePathSegments('');
    expect(result.isValid).toBe(false);
    expect(result.error).not.toBeNull();
    expect(typeof result.error).toBe('string');
  });

  it(testName('parseMatchDOPath: parses valid match DO path with action'), () => {
    const matchId = generateTestMatchId('test-match');
    const result = parseMatchDOPath(`/match/${matchId}/create`);
    expect(result.error).toBeNull();
    expect(result.matchId).toBe(matchId);
    expect(result.action).toBe('create');
  });

  it(testName('parseMatchDOPath: parses valid match DO path without action'), () => {
    const matchId = generateTestMatchId('test-match');
    const result = parseMatchDOPath(`/match/${matchId}`);
    expect(result.error).toBeNull();
    expect(result.matchId).toBe(matchId);
    expect(result.action).toBeNull();
  });

  it(testName('parseMatchDOPath: parses state action'), () => {
    const matchId = generateTestMatchId('match-123');
    const result = parseMatchDOPath(`/match/${matchId}/state`);
    expect(result.error).toBeNull();
    expect(result.matchId).toBe(matchId);
    expect(result.action).toBe('state');
  });

  it(testName('parseMatchDOPath: rejects path with wrong first segment'), () => {
    const result = parseMatchDOPath('/api/matches/match-id/create');
    expect(result.error).toContain("Expected first segment to be 'match'");
    expect(result.matchId).toBeNull();
  });

  it(testName('parseMatchDOPath: rejects path with empty matchId'), () => {
    const result = parseMatchDOPath('/match//create');
    expect(result.error).toBe('Match ID cannot be empty');
    expect(result.matchId).toBeNull();
  });

  it(testName('parseMatchDOPath: rejects path with too few segments'), () => {
    const result = parseMatchDOPath('/match');
    expect(result.error).toContain('Expected at least 2 path segments');
    expect(result.matchId).toBeNull();
  });

  it(testName('parseMatchDOPath: handles URL-encoded match IDs'), () => {
    const matchId = generateTestMatchId('test-match');
    const encodedId = encodeURIComponent(matchId);
    const result = parseMatchDOPath(`/match/${encodedId}/create`);
    expect(result.error).toBeNull();
    expect(result.matchId).toBe(matchId);
  });

  it(testName('parseMatchDOPath: handles match IDs with special characters'), () => {
    const matchId = generateTestMatchId('match-special');
    const result = parseMatchDOPath(`/match/${matchId}/state`);
    expect(result.error).toBeNull();
    expect(result.matchId).toBe(matchId);
    expect(result.action).toBe('state');
  });
});
