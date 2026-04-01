import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildCreditsApiUrl, generateTestUserId, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { CreditAction, Currency } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { generateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

type PurchaseResponse = {
  success?: boolean;
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

  it(testName('retry storm: duplicate purchase storm with same idempotency key mutates balance exactly once'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('retry-storm');
    const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
    const purchaseAmount = 73;

    const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
    const requestInit: RequestInit = {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.IdempotencyKey]: idempotencyKey,
      },
      body: JSON.stringify({
        ac_amount: purchaseAmount,
        amount: purchaseAmount / 100,
        currency: Currency.USD,
      }),
    };

    const primeResponse = await worker.fetch(purchaseUrl, requestInit, token);
    expect(primeResponse.status).toBe(HttpStatus.Ok);
    const primePayload = (await primeResponse.json()) as PurchaseResponse;
    expect(primePayload.transaction_id).toBeTypeOf('string');
    expect(primePayload.new_balance).toBe(purchaseAmount);

    const stormSize = 24;
    const responses = await Promise.all(
      Array.from({ length: stormSize }, () => worker.fetch(purchaseUrl, requestInit, token))
    );

    const acceptedStatuses = new Set([HttpStatus.Ok, HttpStatus.TooManyRequests]);
    for (const response of responses) {
      expect(acceptedStatuses.has(response.status as 200 | 429)).toBe(true);
    }

    const okResponses = responses.filter((response) => response.status === HttpStatus.Ok);
    const payloads = await Promise.all(okResponses.map(async (response) => (await response.json()) as PurchaseResponse));
    const transactionIds = new Set(payloads.map((payload) => payload.transaction_id).filter(Boolean));
    const balances = new Set(payloads.map((payload) => payload.new_balance).filter((value) => value !== undefined));

    if (payloads.length > 0) {
      expect(transactionIds.size).toBe(1);
      expect(transactionIds.has(primePayload.transaction_id)).toBe(true);
      expect(balances.size).toBe(1);
      expect(payloads[0]?.new_balance).toBe(purchaseAmount);
    }

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
    expect(balanceData.ac_balance).toBe(purchaseAmount);
  });
});
