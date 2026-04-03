import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrl, buildTestApiUrlWithQuery, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { ResourceType } from '@ocentra/endpoint-domain/constants/resources';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('version skew: legacy v1 resources route stays disabled while v2 remains rejected'), async () => {
    const token = await createToken();
    const v1Url = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, {
      [QueryParam.Hash]: 'invalid-hash-format',
      [QueryParam.Type]: ResourceType.Image,
    });

    const v1Response = await worker.fetch(
      v1Url,
      { headers: getValidRequestHeaders() },
      token
    );
    expect(v1Response.status).toBe(HttpStatus.NotFound);
    await v1Response.text().catch(() => undefined);

    const v2Url = buildTestApiUrl('/api/v2/resources?hash=invalid-hash-format&type=image');
    const v2Response = await worker.fetch(
      v2Url,
      { headers: getValidRequestHeaders() },
      token
    );
    expect(v2Response.status).toBe(HttpStatus.NotFound);
    await v2Response.text().catch(() => undefined);
  });

  it(testName('version skew: legacy v0 endpoints are rejected with not-found'), async () => {
    const token = await createToken();
    const v0Url = buildTestApiUrl('/api/v0/resources?hash=invalid-hash-format&type=image');
    const response = await worker.fetch(
      v0Url,
      { headers: getValidRequestHeaders() },
      token
    );

    expect(response.status).toBe(HttpStatus.NotFound);
    await response.text().catch(() => undefined);
  });

  it(testName('version skew: unsupported version does not bypass route-level protections'), async () => {
    const token = await createToken();
    const unsupportedUrl = buildTestApiUrl('/api/v3/data-export/test-user');
    const response = await worker.fetch(
      unsupportedUrl,
      { headers: getValidRequestHeaders('test-user') },
      token
    );

    expect(response.status).toBe(HttpStatus.NotFound);
    await response.text().catch(() => undefined);
  });
});
