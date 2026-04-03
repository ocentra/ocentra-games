import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpoint, buildTestApiUrlWithQuery, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { ResourceType } from '@ocentra/endpoint-domain/constants/resources';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { OpenApiParameterName } from '@/constants/openapi';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

type OpenApiDocument = {
  openapi: string;
  paths: Record<string, unknown>;
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('backward compatibility: health endpoint response shape remains stable'), async () => {
    const token = await createToken();
    const response = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.Health),
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { status?: string };
    expect(data.status).toBe('ok');
  });

  it(testName('backward compatibility: legacy v1 resources route remains disabled'), async () => {
    const token = await createToken();
    const response = await worker.fetch(
      buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, {
        [QueryParam.Hash]: 'invalid-hash-format',
        [QueryParam.Type]: ResourceType.Image,
      }),
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.NotFound);
    const contentType = response.headers.get(HttpHeader.ContentType) || '';
    expect(contentType.includes('application/json')).toBe(true);
    const data = (await response.json()) as { error?: string; message?: string };
    expect(data.error).toBe(ErrorMessage.LegacyResourcesDisabled);
  });

  it(testName('backward compatibility: OpenAPI contract preserves critical v1 path templates'), async () => {
    const token = await createToken();
    const response = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.OpenApiJson),
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Ok);
    const parsed = (await response.json()) as OpenApiDocument;
    const pathKeys = Object.keys(parsed.paths);

    expect(pathKeys.includes(`/api/v1/matches/{${OpenApiParameterName.MatchId}}/anonymize`)).toBe(true);
    expect(pathKeys.includes(`/api/v1/disputes/{${OpenApiParameterName.DisputeId}}/evidence`)).toBe(true);
    expect(pathKeys.includes(`${ApiEndpoint.Leaderboard.Base}/{gameType}/user/{userId}`)).toBe(true);
  });
});
