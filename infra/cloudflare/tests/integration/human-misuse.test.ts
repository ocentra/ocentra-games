import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildCreditsApiUrl,
  buildTestApiUrlForEndpoint,
  generateTestUserId,
  getAdminAuthHeaders,
  getValidRequestHeaders,
} from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { CreditAction, Currency } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { generateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
import { TestConfig } from '@tests/constants/test-constants';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

type PurchaseData = {
  transaction_id?: string;
  new_balance?: number;
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('human misuse: rapid double-click purchase with same idempotency key applies credits once'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('human-misuse-double-click');
    const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);

    const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
    const requestInit: RequestInit = {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.IdempotencyKey]: idempotencyKey,
      },
      body: JSON.stringify({
        ac_amount: 40,
        amount: 0.4,
        currency: Currency.USD,
      }),
    };

    const [first, second] = await Promise.all([
      worker.fetch(purchaseUrl, requestInit, token),
      worker.fetch(purchaseUrl, requestInit, token),
    ]);

    expect(first.status).toBe(HttpStatus.Ok);
    expect(second.status).toBe(HttpStatus.Ok);

    const firstData = (await first.json()) as PurchaseData;
    const secondData = (await second.json()) as PurchaseData;

    expect(firstData.transaction_id).toBe(secondData.transaction_id);
    expect(firstData.new_balance).toBe(secondData.new_balance);

    const balanceResponse = await worker.fetch(
      buildCreditsApiUrl(userId, CreditAction.Balance),
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      },
      token
    );
    expect(balanceResponse.status).toBe(HttpStatus.Ok);
    const balanceData = (await balanceResponse.json()) as { ac_balance: number };
    expect(balanceData.ac_balance).toBe(40);
  });

  it(testName('human misuse: repeated promo-code submit returns already_redeemed without extra credits'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('human-misuse-redeem');
    const promoCode = `HUMAN_MISUSE_${Date.now()}`;

    const seedResponse = await worker.fetch(
      buildTestApiUrlForEndpoint(`${ApiEndpoint.Test.Base}/seed-promo`),
      {
        method: HttpMethod.Post,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          code: promoCode,
          ac: 30,
          gp: 0,
        }),
      }
    );
    expect(seedResponse.status).toBe(HttpStatus.Ok);

    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const first = await worker.fetch(
      redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: promoCode }),
      },
      token
    );
    expect(first.status).toBe(HttpStatus.Ok);

    const second = await worker.fetch(
      redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: promoCode }),
      },
      token
    );
    expect(second.status).toBe(HttpStatus.Ok);

    const secondData = (await second.json()) as { already_redeemed?: boolean; ac_added?: number };
    expect(secondData.already_redeemed).toBe(true);
    expect(secondData.ac_added).toBeUndefined();

    const balanceResponse = await worker.fetch(
      buildCreditsApiUrl(userId, CreditAction.Balance),
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(userId),
      },
      token
    );
    expect(balanceResponse.status).toBe(HttpStatus.Ok);
    const balanceData = (await balanceResponse.json()) as { ac_balance: number };
    expect(balanceData.ac_balance).toBe(30);
  });
});
