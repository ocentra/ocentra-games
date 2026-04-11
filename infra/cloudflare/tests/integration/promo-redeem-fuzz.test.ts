import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import * as fc from 'fast-check';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildCreditsApiUrl,
  buildTestApiUrlForEndpoint,
  generateTestUserId,
  getValidRequestHeaders,
  getAdminAuthHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
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

  it(testName('Redeem: fuzz invalid body shapes yield 400 with error or message (Rule 5.2, 14.7)'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-fuzz');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const headers = {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const arb = fc.oneof(
      fc.record({ code: fc.integer() }),
      fc.record({ code: fc.boolean() }),
      fc.record({ code: fc.constant(null) }),
      fc.record({ code: fc.array(fc.string()) }),
      fc.record({ code: fc.string().filter((s) => s.trim() === '') }),
      fc.record({ other: fc.string() }),
      fc.dictionary(fc.string(), fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)))
    );
    const samples = fc.sample(arb, 50);
    for (const body of samples) {
      const response = await worker.fetch(redeemUrl, {
        method: HttpMethod.Post,
        headers,
        body: JSON.stringify(body),
      }, token);
      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = (await response.json()) as { error?: string; message?: string };
      expect(data.error !== undefined || data.message !== undefined).toBe(true);
      expect(response.status).not.toBe(HttpStatus.InternalServerError);
    }
  });

  it(testName('Redeem: property same code same user two redeems yields at most one economic grant (Rule 0.1.1 G1)'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-invariant');
    const seedPath = ApiEndpoint.Test.SeedPromo;
    const seedUrl = buildTestApiUrlForEndpoint(seedPath);
    const code = `INV_${Date.now()}`;
    const ac = 15;
    const gp = 5;
    const seedRes = await worker.fetch(seedUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getAdminAuthHeaders(),
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ code, ac, gp }),
    });
    expect(seedRes.status).toBe(HttpStatus.Ok);
    await seedRes.text().catch(() => undefined);

    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const headers = {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const body = JSON.stringify({ code });
    const [r1, r2] = await Promise.all([
      worker.fetch(redeemUrl, { method: HttpMethod.Post, headers, body }, token),
      worker.fetch(redeemUrl, { method: HttpMethod.Post, headers, body }, token),
    ]);
    expect(r1.status).toBe(HttpStatus.Ok);
    expect(r2.status).toBe(HttpStatus.Ok);
    await r1.text().catch(() => undefined);
    await r2.text().catch(() => undefined);

    const balanceRes = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    const balance = await balanceRes.json() as { ac_balance: number; gp_balance: number };
    expect(balance.ac_balance).toBeLessThanOrEqual(ac);
    expect(balance.gp_balance).toBeLessThanOrEqual(gp);
    expect(balance.ac_balance + balance.gp_balance).toBeLessThanOrEqual(ac + gp);
  });
});
