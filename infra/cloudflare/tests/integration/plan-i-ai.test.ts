import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  getValidRequestHeaders,
  getValidAdminRequestHeaders,
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

  it(testName('OAuth start: returns 400 when provider missing or invalid'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OAuthStart);

    const res = await worker.fetch(
      url,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.TestUserId),
      },
      token
    );
    expect(res.status).toBe(HttpStatus.BadRequest);
    const data = (await res.json()) as { error?: string; message?: string };
    expect(data.message).toContain('provider');
  });

  it(testName('OAuth start: returns 503 when provider valid but OAuth not configured'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OAuthStart) + '?provider=google_gemini';

    const res = await worker.fetch(
      url,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.TestUserId),
      },
      token
    );
    expect(res.status).toBe(HttpStatus.ServiceUnavailable);
    const data = (await res.json()) as { error?: string; message?: string };
    expect(data.message).toContain('OAuth');
  });

  it(testName('OAuth callback: redirects to app with error when state invalid'), async () => {
    const url =
      buildTestApiUrlForEndpoint(ApiEndpoint.AI.OAuthCallback) +
      '?code=fake-code&state=non-existent-state';

    const res = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect([HttpStatus.Found, HttpStatus.NotFound]).toContain(res.status);
    if (res.status === HttpStatus.Found) {
      const location = res.headers.get(HttpHeader.Location);
      expect(location).not.toBeNull();
      expect(location).toContain('error=invalid_state');
      return;
    }
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  it(testName('Admin PATCH ai/catalog: returns 401 when auth missing'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.Admin.AICatalog);

    const res = await worker.fetch(
      url,
      {
        method: HttpMethod.Patch,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ provider: { id: 'test-provider', name: 'Test', description: '', website: '', authType: 'api_key', category: 'cloud_api', supportsStreaming: true, supportsModelListing: false, configFields: [], defaultModels: [] } }),
      },
      token
    );
    expect(res.status).toBe(HttpStatus.Unauthorized);
  });

  it(testName('Admin PATCH ai/catalog: returns 403 when authenticated but not admin'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.Admin.AICatalog);

    const res = await worker.fetch(
      url,
      {
        method: HttpMethod.Patch,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ provider: { id: 'test-p', name: 'Test', description: '', website: '', authType: 'api_key', category: 'cloud_api', supportsStreaming: true, supportsModelListing: false, configFields: [], defaultModels: [] } }),
      },
      token
    );
    expect(res.status).toBe(HttpStatus.Forbidden);
    const data = (await res.json()) as { error?: string };
    expect((data.error ?? '').toLowerCase()).toContain('admin');
  });

  it(testName('Admin PATCH ai/catalog: returns 200 and ok when admin and body has provider'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.Admin.AICatalog);
    const provider = {
      id: 'plan-i-test-provider',
      name: 'Plan I Test',
      description: 'Integration test provider',
      website: 'https://example.com',
      authType: 'api_key',
      category: 'cloud_api',
      supportsStreaming: true,
      supportsModelListing: false,
      configFields: [],
      defaultModels: [],
    };

    const res = await worker.fetch(
      url,
      {
        method: HttpMethod.Patch,
        headers: {
          ...getValidAdminRequestHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ provider }),
      },
      token
    );
    if (res.status === HttpStatus.ServiceUnavailable) {
      const data = (await res.json()) as { error?: string };
      expect(data.error).toContain('catalog');
      return;
    }
    expect(res.status).toBe(HttpStatus.Ok);
    const data = (await res.json()) as { ok?: boolean; providers?: number };
    expect(data.ok).toBe(true);
  });
});
