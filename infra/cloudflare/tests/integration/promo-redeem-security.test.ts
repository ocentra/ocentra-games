import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildCreditsApiUrl,
  buildTestApiUrlForEndpoint,
  generateTestUserId,
  getValidRequestHeaders,
  getAdminAuthHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const log = Logger.instance;
log.register(import.meta.url);

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      log.logError('Failed to get test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Redeem Rule 2.1.1: missing auth returns 401 Unauthorized'), async () => {
    const userId = generateTestUserId('sec-no-auth');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ code: 'SEC_CODE' }),
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    const data = await response.json() as { error: string; message: string };
    expect(data.error).toBe('Unauthorized');
    expect((data.message ?? '').toLowerCase()).toContain('authorization');
  });

  it(testName('Redeem Rule 5.1: invalid code returns 400 with exact error Invalid or expired code'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('sec-invalid-code');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ code: 'NONEXISTENT_PROMO_XYZ' }),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = await response.json() as { error: string };
    expect(data.error).toBe('Invalid or expired code');
  });

  it(testName('Redeem Rule 5.1: code as number in body yields 400'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('sec-code-type');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ code: 12345 }),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = await response.json() as { error?: string; message?: string };
    expect(data.error !== undefined || data.message !== undefined).toBe(true);
  });

  it(testName('Redeem Rule 14.8: replay same code same user does not double-credit (state safety)'), async () => {
    const seedPath = `${ApiEndpoint.Test.Base}/seed-promo`;
    const seedUrl = buildTestApiUrlForEndpoint(seedPath);
    await worker.fetch(seedUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getAdminAuthHeaders(),
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ code: 'REPLAY_SEC', ac: 30, gp: 20 }),
    });

    const token = await createToken();
    const userId = generateTestUserId('sec-replay');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const headers = {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const body = JSON.stringify({ code: 'REPLAY_SEC' });
    await worker.fetch(redeemUrl, { method: HttpMethod.Post, headers, body }, token);
    await worker.fetch(redeemUrl, { method: HttpMethod.Post, headers, body }, token);

    const balanceRes = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    const balance = await balanceRes.json() as { ac_balance: number; gp_balance: number };
    expect(balance.ac_balance).toBe(30);
    expect(balance.gp_balance).toBe(20);
  });
});
