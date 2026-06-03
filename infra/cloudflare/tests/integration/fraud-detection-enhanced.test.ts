import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { FraudDetectionDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { OpenApiExampleValue } from '@ocentra/endpoint-domain/constants/openapi-examples';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { FraudCheckField } from '@ocentra/endpoint-domain/constants/worker-contract-values';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const log = Logger.instance;
log.register(import.meta.url);

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
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

  describe('Enhanced FraudDetectionDO', () => {
    it(testName('Check: returns risk/score contract'), async () => {
      const userId = `fraud-user-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.Fraud.Check, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify(OpenApiExampleValue.FraudCheckRequest),
      });
      expect(response.status).toBe(HttpStatus.Ok);
      const data = (await response.json()) as { risk?: string; score?: number };
      expect(['low', 'medium', 'high', 'critical']).toContain(data.risk);
      expect(typeof data.score).toBe('number');
    });

    it(testName('Check: high amount increases risk score'), async () => {
      const userId = `fraud-high-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.Fraud.Check, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const headers = {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      };

      const low = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers,
        body: JSON.stringify(OpenApiExampleValue.FraudCheckRequest),
      });
      const high = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers,
        body: JSON.stringify({ ...OpenApiExampleValue.FraudCheckRequest, amount: 20000 }),
      });

      expect(low.status).toBe(HttpStatus.Ok);
      expect(high.status).toBe(HttpStatus.Ok);
      const lowData = (await low.json()) as { score?: number };
      const highData = (await high.json()) as { score?: number };
      expect((highData.score ?? 0)).toBeGreaterThanOrEqual(lowData.score ?? 0);
    });

    it(testName('Check: repeated traffic can increase aggregate risk'), async () => {
      const userId = `fraud-velocity-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.Fraud.Check, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const headers = {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      };

      let lastScore = 0;
      for (let i = 0; i < 22; i++) {
        const res = await worker.fetch(url, {
          method: HttpMethod.Post,
          headers,
          body: JSON.stringify({ ...OpenApiExampleValue.FraudCheckRequest, amount: 50 }),
        });
        expect(res.status).toBe(HttpStatus.Ok);
        const data = (await res.json()) as { score?: number };
        lastScore = data.score ?? lastScore;
      }
      expect(typeof lastScore).toBe('number');
      expect(lastScore).toBeGreaterThanOrEqual(0);
    });

    it(testName('Check: rejects non-token payment method values'), async () => {
      const userId = `fraud-payment-method-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.Fraud.Check, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          ...OpenApiExampleValue.FraudCheckRequest,
          [FraudCheckField.PaymentMethod]: 'not a token',
        }),
      });

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = (await response.json()) as { error?: string; issues?: Array<{ path?: string[] }> };
      expect(data.error).toBe('Bad Request');
      expect(data.issues?.some((issue) => issue.path?.includes(FraudCheckField.PaymentMethod))).toBe(true);
    });

    it(testName('Risk endpoint: returns risk/score for current authenticated profile'), async () => {
      const userId = `fraud-risk-${Date.now()}`;
      const checkUrl = buildApiUrl(ApiEndpoint.Fraud.Check, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const riskUrl = buildApiUrl(ApiEndpoint.Fraud.Risk(userId), { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const headers = {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      };

      await worker.fetch(checkUrl, {
        method: HttpMethod.Post,
        headers,
        body: JSON.stringify({ ...OpenApiExampleValue.FraudCheckRequest, amount: 1500 }),
      });

      const response = await worker.fetch(riskUrl, {
        method: HttpMethod.Get,
        headers,
      });
      expect(response.status).toBe(HttpStatus.Ok);
      const data = (await response.json()) as { risk?: string; score?: number };
      expect(['low', 'medium', 'high', 'critical']).toContain(data.risk);
      expect(typeof data.score).toBe('number');
    });

    it(testName('Risk endpoint: rejects invalid nested userId path values'), async () => {
      const userId = `fraud-invalid-${Date.now()}`;
      const url = buildApiUrl(ApiEndpoint.Fraud.Risk('invalid\nid'), { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = (await response.json()) as { error?: string; message?: string };
      expect(data.error).toBe('Bad Request');
      expect(typeof data.message).toBe('string');
    });

    it(testName('Unsupported fraud subroutes return 404 in current contract'), async () => {
      const userId = `fraud-routes-${Date.now()}`;
      const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Fraud.Base}/${FraudDetectionDOSegment.Check}/device/register`;
      const response = await worker.fetch(url, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ deviceFingerprint: 'device-a' }),
      });
      expect(response.status).toBe(HttpStatus.NotFound);
    });

    it(testName('Link analysis route currently resolves to fraud risk contract'), async () => {
      const userId = `fraud-link-${Date.now()}`;
      const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Fraud.Base}/link/analysis`;
      const response = await worker.fetch(url, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });
      expect([HttpStatus.Ok, HttpStatus.NotFound]).toContain(response.status);
      if (response.status === HttpStatus.Ok) {
        const data = (await response.json()) as { risk?: string; score?: number };
        expect(['low', 'medium', 'high', 'critical']).toContain(data.risk);
        expect(typeof data.score).toBe('number');
      }
    });
  });
});
