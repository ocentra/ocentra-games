import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders, getValidAdminRequestHeaders } from '@tests/helpers/test-helpers';
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

  describe('Enhanced PenaltyDO', () => {
    it(testName('Issue: returns issued true and penaltyId'), async () => {
      const userId = `penalty-user-${Date.now()}`;
      const issueUrl = `${buildApiUrl(ApiEndpoint.Security.Penalty, { baseUrl: TestConfig.TestApiUrlPlaceholder })}/issue`;

      const response = await worker.fetch(issueUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          userId,
          type: 'warning',
          reason: 'Policy violation',
          issuedBy: 'admin-1',
        }),
      });

      expect(response.status).toBe(HttpStatus.Ok);
      const data = (await response.json()) as { issued?: boolean; penaltyId?: string };
      expect(data.issued).toBe(true);
      expect(typeof data.penaltyId).toBe('string');
    });

    it(testName('Issue: validates payload and rejects missing fields'), async () => {
      const userId = `penalty-invalid-${Date.now()}`;
      const issueUrl = `${buildApiUrl(ApiEndpoint.Security.Penalty, { baseUrl: TestConfig.TestApiUrlPlaceholder })}/issue`;
      const response = await worker.fetch(issueUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          userId,
          reason: 'Missing type and issuedBy',
        }),
      });
      expect(response.status).toBe(HttpStatus.BadRequest);
    });

    it(testName('Appeal: returns received true and appealId'), async () => {
      const userId = `penalty-appeal-${Date.now()}`;
      const issueUrl = `${buildApiUrl(ApiEndpoint.Security.Penalty, { baseUrl: TestConfig.TestApiUrlPlaceholder })}/issue`;
      const appealUrl = buildApiUrl(ApiEndpoint.Security.Appeal, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const headers = {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      };

      const issueResponse = await worker.fetch(issueUrl, {
        method: HttpMethod.Post,
        headers,
        body: JSON.stringify({
          userId,
          type: 'mute',
          reason: 'Spam',
          issuedBy: 'admin-2',
          durationMinutes: 15,
        }),
      });
      expect(issueResponse.status).toBe(HttpStatus.Ok);
      const issueData = (await issueResponse.json()) as { penaltyId?: string };

      const appealResponse = await worker.fetch(appealUrl, {
        method: HttpMethod.Post,
        headers,
        body: JSON.stringify({
          penaltyId: issueData.penaltyId,
          reason: 'Please review',
        }),
      });
      expect(appealResponse.status).toBe(HttpStatus.Ok);
      const appealData = (await appealResponse.json()) as { received?: boolean; appealId?: string };
      expect(appealData.received).toBe(true);
      expect(typeof appealData.appealId).toBe('string');
    });

    it(testName('Appeal review: admin can review pending appeal'), async () => {
      const userId = `penalty-review-${Date.now()}`;
      const issueUrl = `${buildApiUrl(ApiEndpoint.Security.Penalty, { baseUrl: TestConfig.TestApiUrlPlaceholder })}/issue`;
      const appealUrl = buildApiUrl(ApiEndpoint.Security.Appeal, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const reviewUrl = buildApiUrl(ApiEndpoint.Security.AppealReview, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const userHeaders = {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      };

      const issueResponse = await worker.fetch(issueUrl, {
        method: HttpMethod.Post,
        headers: userHeaders,
        body: JSON.stringify({
          userId,
          type: 'warning',
          reason: 'Review test',
          issuedBy: 'admin-3',
        }),
      });
      expect(issueResponse.status).toBe(HttpStatus.Ok);
      const issueData = (await issueResponse.json()) as { penaltyId?: string };

      const appealResponse = await worker.fetch(appealUrl, {
        method: HttpMethod.Post,
        headers: userHeaders,
        body: JSON.stringify({
          penaltyId: issueData.penaltyId,
          reason: 'Appeal for review test',
        }),
      });
      expect(appealResponse.status).toBe(HttpStatus.Ok);
      const appealData = (await appealResponse.json()) as { appealId?: string };

      const reviewResponse = await worker.fetch(reviewUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidAdminRequestHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          userId,
          appealId: appealData.appealId,
          action: 'approve',
          moderatorId: TestConfig.TestAdminUserId,
        }),
      });
      expect(reviewResponse.status).toBe(HttpStatus.Ok);
      const reviewData = (await reviewResponse.json()) as { reviewed?: boolean; appealId?: string; action?: string };
      expect(reviewData.reviewed).toBe(true);
      expect(reviewData.appealId).toBe(appealData.appealId);
      expect(reviewData.action).toBe('approve');
    });

    it(testName('Appeal review: non-admin is forbidden'), async () => {
      const userId = `penalty-forbidden-${Date.now()}`;
      const reviewUrl = buildApiUrl(ApiEndpoint.Security.AppealReview, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(reviewUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          userId,
          appealId: 'non-existent',
          action: 'deny',
          moderatorId: userId,
        }),
      });
      expect(response.status).toBe(HttpStatus.Forbidden);
    });

    it(testName('Status: returns penalties array for authenticated user'), async () => {
      const userId = `penalty-status-${Date.now()}`;
      const statusUrl = buildApiUrl(ApiEndpoint.Security.Penalty, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const response = await worker.fetch(statusUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });
      expect(response.status).toBe(HttpStatus.Ok);
      const data = (await response.json()) as { penalties?: unknown[] };
      expect(Array.isArray(data.penalties)).toBe(true);
    });
  });
});
