import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getTokenForFetch } from '@tests/test-setup-core';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const CHURN_RISKS = ['low', 'medium', 'high', 'critical'] as const;

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Personalization GET: returns 200 with userId generatedAt recommendations difficulty timing when authenticated'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Personalization.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as {
      userId?: string;
      generatedAt?: number;
      recommendations?: { games?: unknown[]; missions?: unknown[]; offers?: unknown[] };
      difficulty?: { adjustment?: string; reason?: string };
      timing?: { bestNotificationTime?: number; predictedNextSession?: number; sessionLengthPrediction?: number };
    };
    expect(typeof data.userId).toBe('string');
    expect(typeof data.generatedAt).toBe('number');
    expect(data.recommendations !== null && typeof data.recommendations === 'object').toBe(true);
    expect(Array.isArray(data.recommendations?.games)).toBe(true);
    expect(Array.isArray(data.recommendations?.missions)).toBe(true);
    expect(Array.isArray(data.recommendations?.offers)).toBe(true);
    expect(['increase', 'decrease', 'maintain']).toContain(data.difficulty?.adjustment);
    expect(typeof data.difficulty?.reason).toBe('string');
    expect(typeof data.timing?.bestNotificationTime).toBe('number');
    expect(typeof data.timing?.predictedNextSession).toBe('number');
    expect(typeof data.timing?.sessionLengthPrediction).toBe('number');
  });

  it(testName('Personalization GET: returns 401 when auth missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Personalization.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Analytics profile GET: returns 200 with churnRisk churnProbability contributingFactors recommendedActions modelVersion calculatedAt when authenticated'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Analytics.Profile, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as {
      userId?: string;
      churnRisk?: string;
      churnProbability?: number;
      contributingFactors?: unknown[];
      recommendedActions?: unknown[];
      modelVersion?: string;
      calculatedAt?: number;
    };
    expect(typeof data.userId).toBe('string');
    expect(CHURN_RISKS).toContain(data.churnRisk);
    expect(typeof data.churnProbability).toBe('number');
    expect(data.churnProbability).toBeGreaterThanOrEqual(0);
    expect(data.churnProbability).toBeLessThanOrEqual(1);
    expect(Array.isArray(data.contributingFactors)).toBe(true);
    expect(Array.isArray(data.recommendedActions)).toBe(true);
    expect(typeof data.modelVersion).toBe('string');
    expect(typeof data.calculatedAt).toBe('number');
  });

  it(testName('Analytics profile GET: returns 401 when auth missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Analytics.Profile, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Analytics GET non-profile path: returns 404'), async () => {
    const token = getTokenForFetch();
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Analytics.Base}/other`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.NotFound);
    await response.text().catch(() => undefined);
  });

  it(testName('Notification POST push with type retention: returns 200 with sent true and id when authenticated'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Notification.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({
        type: 'retention',
        title: 'We miss you!',
        body: 'Come back for 2x XP this week.',
      }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { sent?: boolean; id?: string };
    expect(data.sent).toBe(true);
    expect(typeof data.id).toBe('string');
  });
});
