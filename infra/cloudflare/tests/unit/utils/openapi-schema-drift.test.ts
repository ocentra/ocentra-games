import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { generateOpenApiJson } from '@/utils/openapi';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { OpenApiVersion } from '@ocentra/endpoint-domain/constants/openapi';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

type ParsedOpenApi = {
  openapi: string;
  paths: Record<string, unknown>;
};

function bracesAreBalanced(path: string): boolean {
  let balance = 0;
  for (const char of path) {
    if (char === '{') balance += 1;
    if (char === '}') balance -= 1;
    if (balance < 0) return false;
  }
  return balance === 0;
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('openapi schema drift: generated OpenAPI JSON parses and exposes paths object'), () => {
    const raw = generateOpenApiJson();
    const parsed = JSON.parse(raw) as ParsedOpenApi;

    expect(parsed.openapi).toBe(OpenApiVersion.V3_0_0);
    expect(typeof parsed.paths).toBe('object');
    expect(Object.keys(parsed.paths).length).toBeGreaterThan(0);
  });

  it(testName('openapi schema drift: path templates do not contain malformed brace sequences'), () => {
    const parsed = JSON.parse(generateOpenApiJson()) as ParsedOpenApi;
    const pathKeys = Object.keys(parsed.paths);

    for (const pathKey of pathKeys) {
      expect(pathKey.includes('}}')).toBe(false);
      expect(pathKey.includes('{{')).toBe(false);
      expect(bracesAreBalanced(pathKey)).toBe(true);
    }
  });

  it(testName('openapi schema drift: critical templated routes remain present in spec'), () => {
    const parsed = JSON.parse(generateOpenApiJson()) as ParsedOpenApi;
    const expectedPaths = [
      ApiEndpoint.Matches.Anonymize('{matchId}'),
      ApiEndpoint.Disputes.Evidence('{disputeId}'),
      `${ApiEndpoint.Leaderboard.Base}/{gameType}/user/{userId}`,
      `${ApiEndpoint.Leaderboard.Base}/{gameType}/nearby/{userId}`,
    ];

    expect(Object.prototype.hasOwnProperty.call(parsed.paths, expectedPaths[0])).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(parsed.paths, expectedPaths[1])).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(parsed.paths, expectedPaths[2])).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(parsed.paths, expectedPaths[3])).toBe(true);
  });

  it(testName('Rule 5.1.15: schema drift - critical API path templates remain in spec'), () => {
    const parsed = JSON.parse(generateOpenApiJson()) as ParsedOpenApi;
    const criticalPaths = [
      ApiEndpoint.DataExport.ByUserId('{userId}'),
      ApiEndpoint.Data.ByUserId('{userId}'),
    ];
    for (const p of criticalPaths) {
      expect(Object.prototype.hasOwnProperty.call(parsed.paths, p)).toBe(true);
    }
  });
});
