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

  it(testName('Rule 15.4.5: repeated aborts on redeem do not leak value - final state at most one grant'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('abort-redeem');
    const code = `ABORT_ECON_${Date.now()}`;
    const acGrant = 25;
    const gpGrant = 15;

    const seedUrl = buildTestApiUrlForEndpoint(`${ApiEndpoint.Test.Base}/seed-promo`);
    const seedRes = await worker.fetch(seedUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getAdminAuthHeaders(),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ code, ac: acGrant, gp: gpGrant }),
    }, token);
    expect(seedRes.status).toBe(HttpStatus.Ok);
    await seedRes.text();

    const balanceBeforeRes = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    const balanceBefore = (await balanceBeforeRes.json()) as { ac_balance: number; gp_balance: number };

    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const abortCount = 8;
    const abortRequests = Array.from({ length: abortCount }, () => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 5);
      return worker
        .fetch(redeemUrl, {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ code }),
          signal: controller.signal,
        }, token)
        .then(async (r) => {
          await r.text().catch(() => undefined);
          return r.status;
        })
        .catch(() => 0);
    });

    await Promise.all(abortRequests);
    await new Promise((r) => setTimeout(r, 300));

    const balanceAfterRes = await worker.fetch(buildCreditsApiUrl(userId, CreditAction.Balance), {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    const balanceAfter = (await balanceAfterRes.json()) as { ac_balance: number; gp_balance: number };

    const acIncrease = balanceAfter.ac_balance - balanceBefore.ac_balance;
    const gpIncrease = balanceAfter.gp_balance - balanceBefore.gp_balance;

    expect(acIncrease).toBeGreaterThanOrEqual(0);
    expect(acIncrease).toBeLessThanOrEqual(acGrant);
    expect(gpIncrease).toBeGreaterThanOrEqual(0);
    expect(gpIncrease).toBeLessThanOrEqual(gpGrant);
  });
});
