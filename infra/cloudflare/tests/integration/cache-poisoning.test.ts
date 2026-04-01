import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestApiUrlForEndpoint,
  getValidAdminRequestHeaders,
  getValidOriginHeaders,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

function isPrivateCacheControl(value: string | null): boolean {
  if (!value) {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized.includes('private') || normalized.includes('no-store');
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('cache poisoning: signed-url response is private-cache only for authenticated admin request'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(TestConfig.TestMatchId));
    const response = await worker.fetch(
      url,
      {
        method: HttpMethod.Get,
        headers: getValidAdminRequestHeaders(),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Ok);
    expect(isPrivateCacheControl(response.headers.get(HttpHeader.CacheControl))).toBe(true);
    await response.text().catch(() => undefined);
  });

  it(testName('cache poisoning: data export response is private-cache only for authenticated user data'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(TestConfig.RegularUserId));
    const response = await worker.fetch(
      url,
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(TestConfig.RegularUserId),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Ok);
    expect(isPrivateCacheControl(response.headers.get(HttpHeader.CacheControl))).toBe(true);
    await response.text().catch(() => undefined);
  });

  it(testName('cache poisoning: unauthorized signed-url response is not publicly cacheable'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(TestConfig.TestMatchId));
    const response = await worker.fetch(
      url,
      {
        method: HttpMethod.Get,
        headers: getValidOriginHeaders(TestConfig.LocalhostOrigin),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Unauthorized);
    const cacheControl = response.headers.get(HttpHeader.CacheControl);
    if (cacheControl) {
      expect(cacheControl.toLowerCase()).not.toContain('public');
    }
    await response.text().catch(() => undefined);
  });

  it(testName('cache poisoning: signed-url cache policy is stable across cache-key variation headers'), async () => {
    const token = await createToken();
    const url = buildTestApiUrlForEndpoint(ApiEndpoint.SignedUrl.ByMatchId(TestConfig.TestMatchId));
    const firstResponse = await worker.fetch(
      url,
      {
        method: HttpMethod.Get,
        headers: {
          ...getValidAdminRequestHeaders(),
          [HttpHeader.AcceptLanguage]: 'en-US',
          [HttpHeader.AcceptEncoding]: 'gzip',
          [HttpHeader.XRequestedWith]: 'XMLHttpRequest',
        },
      },
      token
    );
    const secondResponse = await worker.fetch(
      url,
      {
        method: HttpMethod.Get,
        headers: {
          ...getValidAdminRequestHeaders(),
          [HttpHeader.AcceptLanguage]: 'fr-FR',
          [HttpHeader.AcceptEncoding]: 'br',
          [HttpHeader.XRequestedWith]: 'attacker-cache-key-variant',
        },
      },
      token
    );

    expect(firstResponse.status).toBe(HttpStatus.Ok);
    expect(secondResponse.status).toBe(HttpStatus.Ok);
    expect(isPrivateCacheControl(firstResponse.headers.get(HttpHeader.CacheControl))).toBe(true);
    expect(isPrivateCacheControl(secondResponse.headers.get(HttpHeader.CacheControl))).toBe(true);
    await firstResponse.text().catch(() => undefined);
    await secondResponse.text().catch(() => undefined);
  });

  it(testName('cache poisoning: data-export authorization failures stay non-public across cache-key variation headers'), async () => {
    const token = await createToken();
    const victimUrl = buildTestApiUrlForEndpoint(ApiEndpoint.DataExport.ByUserId(TestConfig.OtherUserId));
    const firstForbidden = await worker.fetch(
      victimUrl,
      {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.RegularUserId),
          [HttpHeader.AcceptLanguage]: 'en-US',
          [HttpHeader.AcceptEncoding]: 'gzip',
        },
      },
      token
    );
    const secondForbidden = await worker.fetch(
      victimUrl,
      {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.RegularUserId),
          [HttpHeader.AcceptLanguage]: 'de-DE',
          [HttpHeader.AcceptEncoding]: 'br',
        },
      },
      token
    );

    expect(firstForbidden.status).toBe(HttpStatus.Forbidden);
    expect(secondForbidden.status).toBe(HttpStatus.Forbidden);

    const firstCacheControl = firstForbidden.headers.get(HttpHeader.CacheControl);
    const secondCacheControl = secondForbidden.headers.get(HttpHeader.CacheControl);
    if (firstCacheControl) {
      expect(firstCacheControl.toLowerCase()).not.toContain('public');
    }
    if (secondCacheControl) {
      expect(secondCacheControl.toLowerCase()).not.toContain('public');
    }
    await firstForbidden.text().catch(() => undefined);
    await secondForbidden.text().catch(() => undefined);
  });
});
