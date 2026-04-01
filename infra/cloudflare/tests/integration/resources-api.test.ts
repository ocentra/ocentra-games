import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlWithQuery } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { TestConfig } from '@tests/constants/test-constants';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

async function consumeResponseBody(response: Response): Promise<void> {
  if (!response.bodyUsed) {
    await response.text().catch(() => undefined);
  }
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;
  let prodWorker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
    prodWorker = await getTestWorker();
  }, 30_000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
    if (prodWorker.stop) await prodWorker.stop();
  });

  it('legacy /api/v1/resources is disabled in development', async () => {
    const url = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, {
      [QueryParam.Hash]: TestConfig.TestHash,
      [QueryParam.Type]: 'image',
    });
    const response = await worker.fetch(url, {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
      },
    });
    expect(response.status).toBe(HttpStatus.NotFound);
    await consumeResponseBody(response);
  });

  it('legacy /api/v1/resources is disabled in production mode', async () => {
    const url = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, {
      [QueryParam.Hash]: TestConfig.TestHash2,
      [QueryParam.Type]: 'image',
    });
    const response = await prodWorker.fetch(url, {
      headers: {
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      },
    });
    expect(response.status).toBe(HttpStatus.NotFound);
    await consumeResponseBody(response);
  });

  it('GET /api/v1/assets requires an identifier query parameter', async () => {
    const response = await worker.fetch(ApiEndpoint.Assets.Base, {
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
      },
    });
    expect(response.status).toBe(HttpStatus.BadRequest);
    await consumeResponseBody(response);
  });
});
