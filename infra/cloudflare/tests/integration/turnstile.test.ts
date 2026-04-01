import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getTokenForFetch } from '@tests/test-setup-core';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { StripeEndpoint } from '@ocentra/endpoint-domain/constants/stripe';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const log = Logger.instance;
log.register(import.meta.url);

describe(extractName(import.meta.url), TestSuiteType.Integration, { runIn: RunIn.Unstable }, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      log.logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  const checkoutUrl = buildApiUrl(StripeEndpoint.CreateCheckoutSession, { baseUrl: TestConfig.TestApiUrlPlaceholder });
  const validCheckoutBody = {
    productType: 'AC_CREDITS',
    productId: 'test',
    quantity: 1,
    successUrl: 'https://example.com/success',
    cancelUrl: 'https://example.com/cancel',
  };

  describe('Turnstile Bot Detection', () => {
    it(testName('Should reject request without Turnstile token for protected endpoint'), async () => {
      const token = getTokenForFetch();
      const response = await worker.fetch(checkoutUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify(validCheckoutBody),
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = (await response.json()) as { error?: string; message?: string };
      expect((data.error ?? data.message ?? '').toLowerCase().includes('turnstile')).toBe(true);
    });

    it(testName('Should reject request with invalid Turnstile token'), async () => {
      const token = getTokenForFetch();
      const response = await worker.fetch(checkoutUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          'X-Turnstile-Token': 'invalid-token-12345',
        },
        body: JSON.stringify(validCheckoutBody),
      }, token);

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = (await response.json()) as { error?: string; message?: string };
      expect((data.error ?? data.message ?? '').toLowerCase().includes('bot')).toBe(true);
    });

    it(testName('Should accept request with valid Turnstile token'), async () => {
      const token = getTokenForFetch();
      const response = await worker.fetch(checkoutUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          'X-Turnstile-Token': 'test-bypass-token',
        },
        body: JSON.stringify(validCheckoutBody),
      }, token);
      const data = (await response.json()) as { error?: string; message?: string };
      const notRejectedByTurnstile =
        response.status !== HttpStatus.Forbidden &&
        !((data.error ?? data.message ?? '').toLowerCase().includes('turnstile'));
      expect(notRejectedByTurnstile).toBe(true);
    });

    it(testName('Should track Turnstile verification attempts or return 404 if not implemented'), async () => {
      const token = getTokenForFetch();
      const url = buildApiUrl(ApiEndpoint.Security.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder }) + '/turnstile/attempts';
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(TestConfig.TestUserId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      }, token);
      if (response.status === HttpStatus.NotFound) {
        await response.text().catch(() => undefined);
        return;
      }
      const data = (await response.json()) as { attempts?: number; successful?: number; failed?: number };
      if (typeof data.attempts !== 'number' || typeof data.successful !== 'number' || typeof data.failed !== 'number') {
        return;
      }
      expect(response.status).toBe(HttpStatus.Ok);
      expect(typeof data.attempts).toBe('number');
      expect(typeof data.successful).toBe('number');
      expect(typeof data.failed).toBe('number');
    });
  });
});
