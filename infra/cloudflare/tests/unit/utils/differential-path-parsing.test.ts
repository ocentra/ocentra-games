import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { extractPathParts } from '@ocentra/endpoint-domain/utils/path-parser';
import { parseMatchDOPath } from '@ocentra/endpoint-domain/utils/path-segment-parser';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

type DifferentialResult = {
  matchId: string | null;
  action: string | null;
  error: string | null;
};

function parseMatchPathWithReferenceImplementation(path: string): DifferentialResult {
  if (!/^\/match(?:\/|$)/.test(path)) {
    return { matchId: null, action: null, error: 'Expected path to start with /match' };
  }

  const segments = extractPathParts(path, '/match');
  if (segments.length < 1) {
    return { matchId: null, action: null, error: 'Expected at least 1 segment after /match' };
  }

  const matchId = segments[0];
  if (!matchId || matchId.trim().length === 0) {
    return { matchId: null, action: null, error: 'Match ID cannot be empty' };
  }

  return {
    matchId,
    action: segments.length > 1 ? segments[1] : null,
    error: null,
  };
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('differential parsing: parseMatchDOPath matches reference parser for valid paths'), () => {
    const validPaths = [
      '/match/58bf2b05-15ce-4870-9199-d295803a2d8c',
      '/match/58bf2b05-15ce-4870-9199-d295803a2d8c/create',
      '/match/58bf2b05-15ce-4870-9199-d295803a2d8c/state',
      '/match/58bf2b05-15ce-4870-9199-d295803a2d8c/history',
      '/match/58bf2b05-15ce-4870-9199-d295803a2d8c/finalize',
    ];

    for (const path of validPaths) {
      const implResult = parseMatchDOPath(path);
      const referenceResult = parseMatchPathWithReferenceImplementation(path);

      expect(implResult.error).toBe(referenceResult.error);
      expect(implResult.matchId).toBe(referenceResult.matchId);
      expect(implResult.action).toBe(referenceResult.action);
    }
  });

  it(testName('differential parsing: both implementations reject malformed non-match paths'), () => {
    const malformedPaths = [
      '',
      '/',
      '/api/v1/matches/abc/create',
      '/foo/abc/create',
      '/health',
    ];

    for (const path of malformedPaths) {
      const implResult = parseMatchDOPath(path);
      const referenceResult = parseMatchPathWithReferenceImplementation(path);

      expect(implResult.error !== null).toBe(true);
      expect(referenceResult.error !== null).toBe(true);
      expect(implResult.matchId).toBeNull();
      expect(referenceResult.matchId).toBeNull();
    }
  });
});
