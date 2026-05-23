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

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('retry storm: duplicate direct purchase storm is rejected without balance mutation'), async () => {
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
    expect(primeResponse.status).toBe(HttpStatus.Forbidden);
    await primeResponse.text().catch(() => undefined);

    const stormSize = 24;
    const responses = await Promise.all(
      Array.from({ length: stormSize }, () => worker.fetch(purchaseUrl, requestInit, token))
    );

    const acceptedStatuses = new Set([HttpStatus.Forbidden, HttpStatus.TooManyRequests]);
    for (const response of responses) {
      expect(acceptedStatuses.has(response.status as 403 | 429)).toBe(true);
    }

    await Promise.all(responses.map((response) => response.text().catch(() => undefined)));

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
    expect(balanceData.ac_balance).toBe(0);
  });
});
