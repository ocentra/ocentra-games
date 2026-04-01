import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  getValidRequestHeaders,
  generateTestUserId,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
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

  it(testName('AI Keys: rejects requests without auth (401)'), async () => {
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.Keys);
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
      },
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('AI Keys: store then list returns stored provider'), async () => {
    const userId = generateTestUserId('ai-store-list');
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.Keys);

    const storeRes = await worker.fetch(
      url,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ providerId: 'openai', apiKey: 'sk-test-key-123' }),
      },
      token
    );
    expect(storeRes.status).toBe(HttpStatus.Ok);

    const listRes = await worker.fetch(
      url,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      },
      token
    );
    expect(listRes.status).toBe(HttpStatus.Ok);
    const listData = (await listRes.json()) as { providers?: string[] };
    expect(listData.providers).toContain('openai');
  });

  it(testName('AI Keys: store then delete removes provider from list'), async () => {
    const userId = generateTestUserId('ai-store-delete');
    const token = await createToken();
    const baseUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.Keys);
    const deleteUrl = buildTestApiUrlForEndpoint(ApiEndpoint.AI.KeysById('anthropic'));

    const storeRes = await worker.fetch(
      baseUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ providerId: 'anthropic', apiKey: 'sk-ant-test' }),
      },
      token
    );
    expect(storeRes.status).toBe(HttpStatus.Ok);

    const deleteRes = await worker.fetch(
      deleteUrl,
      {
        method: HttpMethod.Delete,
        headers: getValidRequestHeaders(userId),
      },
      token
    );
    expect(deleteRes.status).toBe(HttpStatus.Ok);

    const listRes = await worker.fetch(
      baseUrl,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      },
      token
    );
    const listData = (await listRes.json()) as { providers?: string[] };
    expect(listData.providers || []).not.toContain('anthropic');
  });

  it(testName('AI Keys: user isolation - user B cannot see user A keys'), async () => {
    const userA = generateTestUserId('ai-user-a');
    const userB = generateTestUserId('ai-user-b');
    const tokenA = await createToken();
    const tokenB = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.Keys);

    const storeRes = await worker.fetch(
      url,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userA),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ providerId: 'openai', apiKey: 'sk-user-a-secret' }),
      },
      tokenA
    );
    expect(storeRes.status).toBe(HttpStatus.Ok);

    const listResB = await worker.fetch(
      url,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userB),
      },
      tokenB
    );
    expect(listResB.status).toBe(HttpStatus.Ok);
    const listDataB = (await listResB.json()) as { providers?: string[] };
    expect(listDataB.providers || []).not.toContain('openai');
  });

  it(testName('AI Keys custom: store with providerId in catalog and optional baseUrl returns 200'), async () => {
    const userId = generateTestUserId('ai-keys-custom');
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.KeysCustom);

    const res = await worker.fetch(
      url,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          providerId: 'openai',
          apiKey: 'sk-custom-test',
          baseUrl: 'https://api.openai.com/v1',
        }),
      },
      token
    );
    expect(res.status).toBe(HttpStatus.Ok);
    const data = (await res.json()) as { success?: boolean };
    expect(data.success).toBe(true);

    const listRes = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.AI.Keys),
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      },
      token
    );
    expect(listRes.status).toBe(HttpStatus.Ok);
    const listData = (await listRes.json()) as { providers?: string[] };
    expect(listData.providers).toContain('openai');
  });

  it(testName('AI Keys custom: rejects providerId not in catalog with 400'), async () => {
    const userId = generateTestUserId('ai-keys-custom-bad');
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.KeysCustom);

    const res = await worker.fetch(
      url,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          providerId: 'not-in-catalog-provider',
          apiKey: 'sk-any',
        }),
      },
      token
    );
    expect(res.status).toBe(HttpStatus.BadRequest);
    const data = (await res.json()) as { message?: string };
    expect(data.message).toContain('catalog');
  });

  it(testName('AI Keys: rejects store without providerId or apiKey'), async () => {
    const userId = generateTestUserId('ai-bad-store');
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.Keys);

    const res = await worker.fetch(
      url,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({}),
      },
      token
    );
    expect(res.status).toBe(HttpStatus.BadRequest);
  });

  it(testName('AI Keys test: returns 404 when no key configured for provider'), async () => {
    const userId = generateTestUserId('ai-test-no-key');
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.KeysTest('openai'));

    const res = await worker.fetch(
      url,
      {
        method: HttpMethod.Post,
        headers: getValidRequestHeaders(userId),
      },
      token
    );
    expect(res.status).toBe(HttpStatus.NotFound);
    const data = (await res.json()) as { error?: string; message?: string };
    expect(data.message).toContain('No key configured');
  });

  it(testName('AI Generate: returns 404 (generate not implemented by worker)'), async () => {
    const userId = generateTestUserId('ai-generate-not-implemented');
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.Generate);
    const response = await worker.fetch(
      url,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          providerId: 'openai',
          systemPrompt: 'You are helpful.',
          userPrompt: 'Hello',
        }),
      },
      token
    );
    expect(response.status).toBe(HttpStatus.NotFound);
    await response.text().catch(() => undefined);
  });
});
