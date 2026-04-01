import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpoint, buildTestApiUrlWithQuery, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
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

  it(testName('open redirect: oauth start rejects malicious provider value and does not issue redirect location'), async () => {
    const token = await createToken();
    const url = `${buildTestApiUrlForEndpoint(ApiEndpoint.AI.OAuthStart)}?provider=${encodeURIComponent('https://evil.com/oauth')}`;
    const response = await worker.fetch(
      url,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.TestUserId),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.BadRequest);
    expect(response.headers.get(HttpHeader.Location)).toBeNull();
    await response.text().catch(() => undefined);
  });

  it(testName('open redirect: oauth callback ignores attacker redirect parameters and never redirects to attacker origin'), async () => {
    const attackerOrigin = TestConfig.EvilOrigin;
    const url =
      `${buildTestApiUrlForEndpoint(ApiEndpoint.AI.OAuthCallback)}` +
      `?code=fake-code&state=non-existent-state&redirect_uri=${encodeURIComponent(attackerOrigin)}` +
      `&next=${encodeURIComponent(`${attackerOrigin}/phish`)}`;

    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: attackerOrigin,
      },
    });

    expect([HttpStatus.Found, HttpStatus.NotFound, HttpStatus.InternalServerError]).toContain(response.status);

    if (response.status === HttpStatus.Found) {
      const location = response.headers.get(HttpHeader.Location);
      expect(location).not.toBeNull();
      const parsed = new URL(location!);
      expect(parsed.origin).not.toBe(attackerOrigin);
      expect(parsed.searchParams.get('error')).toBe('invalid_state');
      expect(location).not.toContain(`${attackerOrigin}/phish`);
      await response.text().catch(() => undefined);
      return;
    }

    if (response.status === HttpStatus.NotFound) {
      expect(response.headers.get(HttpHeader.Location)).toBeNull();
      return;
    }

    const body = (await response.json().catch(() => ({ error: undefined }))) as { error?: string };
    expect(typeof body.error).toBe('string');
  });

  it(testName('open redirect: image-proxy rejects lookalike hostnames and never issues redirect location header'), async () => {
    const token = await createToken();
    const lookalikeUrl = 'https://googleusercontent.com.evil.com/redirect?to=https://evil.com/phish';
    const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: lookalikeUrl });
    const response = await worker.fetch(
      imageProxyUrl,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.TestUserId),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Forbidden);
    expect(response.headers.get(HttpHeader.Location)).toBeNull();
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toBe('Image source not allowed');
  });

  it(testName('open redirect: image-proxy rejects nested redirect targets from disallowed domains'), async () => {
    const token = await createToken();
    const attackerUrl = 'https://evil.com/proxy?next=https://googleusercontent.com/resource.jpg';
    const imageProxyUrl = buildTestApiUrlWithQuery(ApiEndpoint.ImageProxy, { url: attackerUrl });
    const response = await worker.fetch(
      imageProxyUrl,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.TestUserId),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Forbidden);
    expect(response.headers.get(HttpHeader.Location)).toBeNull();
    const payload = (await response.json()) as { error?: string };
    expect(payload.error).toBe('Image source not allowed');
  });
});
