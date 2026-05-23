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
import { Currency, CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { generateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { seedCreditsViaStripe } from '@tests/helpers/payment-credit-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import type { SetupContextToken } from '@tests/test-setup-core';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

type CreditBalance = {
  ac_balance: number;
  gp_balance: number;
};

type CreditMutationResponse = {
  success: boolean;
  already_processed?: boolean;
  new_balance: number;
  transaction_id?: string;
};

type RedeemResponse = {
  success: boolean;
  already_redeemed?: boolean;
  ac_added?: number;
  gp_added?: number;
  new_ac_balance?: number;
  new_gp_balance?: number;
};

type CreditTransaction = {
  transaction_id: string;
  type: string;
  amount: number;
  currency: string;
};

async function consumeResponseBody(response: Response): Promise<void> {
  if (!response.bodyUsed) {
    await response.text().catch(() => undefined);
  }
}

function uniquePromoCode(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

async function seedPromo(worker: TestWorker, code: string, ac: number, gp: number): Promise<void> {
  const seedUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Test.SeedPromo);
  const response = await worker.fetch(seedUrl, {
    method: HttpMethod.Post,
    headers: {
      ...getAdminAuthHeaders(),
      [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body: JSON.stringify({ code, ac, gp }),
  });
  expect(response.status).toBe(HttpStatus.Ok);
  await consumeResponseBody(response);
}

async function redeemPromo(
  worker: TestWorker,
  token: SetupContextToken,
  userId: string,
  code: string
): Promise<RedeemResponse> {
  const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
  const response = await worker.fetch(redeemUrl, {
    method: HttpMethod.Post,
    headers: {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    },
    body: JSON.stringify({ code }),
  }, token);

  expect(response.status).toBe(HttpStatus.Ok);
  return await response.json() as RedeemResponse;
}

async function seedGpViaRedeem(
  worker: TestWorker,
  token: SetupContextToken,
  userId: string,
  gpAmount: number,
  codePrefix: string = 'GP_SEED'
): Promise<RedeemResponse> {
  const code = uniquePromoCode(codePrefix);
  await seedPromo(worker, code, 0, gpAmount);
  return await redeemPromo(worker, token, userId, code);
}

async function getBalance(worker: TestWorker, token: SetupContextToken, userId: string): Promise<CreditBalance> {
  const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
  const response = await worker.fetch(balanceUrl, {
    method: HttpMethod.Get,
    headers: {
      ...getValidRequestHeaders(userId),
      [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
    },
  }, token);

  expect(response.status).toBe(HttpStatus.Ok);
  return await response.json() as CreditBalance;
}

async function getTransactions(
  worker: TestWorker,
  token: SetupContextToken,
  userId: string,
  limit?: number
): Promise<{ transactions: CreditTransaction[]; count: number }> {
  const baseUrl = buildCreditsApiUrl(userId, CreditAction.Transactions);
  const transactionsUrl = limit === undefined ? baseUrl : `${baseUrl}?limit=${limit}`;
  const response = await worker.fetch(transactionsUrl, {
    method: HttpMethod.Get,
    headers: {
      ...getValidRequestHeaders(userId),
      [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
    },
  }, token);

  expect(response.status).toBe(HttpStatus.Ok);
  return await response.json() as { transactions: CreditTransaction[]; count: number };
}

async function consumeGp(
  worker: TestWorker,
  token: SetupContextToken,
  userId: string,
  amount: number,
  idempotencyKey: string = generateIdempotencyKey(IdempotencyKeyPrefix.Consume)
): Promise<Response> {
  const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
  return await worker.fetch(consumeUrl, {
    method: HttpMethod.Post,
    headers: {
      ...getValidRequestHeaders(userId),
      [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.IdempotencyKey]: idempotencyKey,
    },
    body: JSON.stringify({
      amount,
      currency: Currency.GP,
      description: 'Test consume',
    }),
  }, token);
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing credits DO worker', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Credits DO worker ready', getStackTrace(), {}, LOG_TEST_RESPONSE_DETAILS);
    } catch (error) {
      logError('[TEST] Failed to initialize credits DO worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    logWarn('[TEST] Stopping credits DO worker', getStackTrace(), {}, false);
    if (worker.stop) await worker.stop();
  });

  it(testName('Award Endpoint: should award GP through trusted promo redemption'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-award');

    const data = await seedGpViaRedeem(worker, token, userId, 100);

    expect(data.success).toBe(true);
    expect(data.gp_added).toBe(100);
    expect(data.new_gp_balance).toBe(100);
  });

  it(testName('Award Endpoint: should reject direct client GP awards'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-client-award');
    const earnUrl = buildCreditsApiUrl(userId, CreditAction.Earn);
    const response = await worker.fetch(earnUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Earn),
      },
      body: JSON.stringify({
        gp_amount: 100,
        description: 'Client award',
      }),
    }, token);

    expect(response.status).toBe(HttpStatus.Forbidden);
    const body = await response.text();
    expect(body.toLowerCase()).toContain('trusted server workflows');
  });

  it(testName('Consume Endpoint: should consume GP successfully when balance is sufficient'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-consume');
    await seedGpViaRedeem(worker, token, userId, 200);

    const response = await consumeGp(worker, token, userId, 50);

    expect(response.status).toBe(HttpStatus.Ok);
    const data = await response.json() as CreditMutationResponse;
    expect(data.success).toBe(true);
    expect(data.new_balance).toBe(150);
  });

  it(testName('Consume Endpoint: should reject consume when balance is insufficient'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-insufficient');

    const response = await consumeGp(worker, token, userId, 100);

    expect(response.status).toBe(HttpStatus.Conflict);
    const data = await response.json() as { error: string };
    expect(data.error).toContain('Insufficient');
  });

  it(testName('Consume Endpoint: should reject zero amount'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-zero-consume');

    const response = await consumeGp(worker, token, userId, 0);

    expect(response.status).toBe(HttpStatus.BadRequest);
    await consumeResponseBody(response);
  });

  it(testName('Consume Endpoint: should reject negative amount'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-negative-consume');

    const response = await consumeGp(worker, token, userId, -10);

    expect(response.status).toBe(HttpStatus.BadRequest);
    await consumeResponseBody(response);
  });

  it(testName('Consume Endpoint: should reject non-integer amount'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-non-integer-consume');

    const response = await consumeGp(worker, token, userId, 10.5);

    expect(response.status).toBe(HttpStatus.BadRequest);
    await consumeResponseBody(response);
  });

  it(testName('Purchase Endpoint: should purchase AC through payment fulfillment'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-purchase');

    await seedCreditsViaStripe(worker, userId, 100, token);
    const balance = await getBalance(worker, token, userId);

    expect(balance.ac_balance).toBe(100);
  });

  it(testName('Purchase Endpoint: should reject direct client AC purchases'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-client-purchase');
    const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
    const response = await worker.fetch(purchaseUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Purchase),
      },
      body: JSON.stringify({
        ac_amount: 100,
        amount: 1,
        currency: 'USD',
      }),
    }, token);

    expect(response.status).toBe(HttpStatus.Forbidden);
    const body = await response.text();
    expect(body.toLowerCase()).toContain('checkout flow');
  });

  it(testName('Balance Endpoint: should return balance for user'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-balance');
    await seedGpViaRedeem(worker, token, userId, 75);

    const data = await getBalance(worker, token, userId);

    expect(data.gp_balance).toBe(75);
    expect(data.ac_balance).toBe(0);
  });

  it(testName('Redeem Idempotency: should return already_redeemed when same code is used twice'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-redeem-idempotency');
    const code = uniquePromoCode('IDEM_PROMO');
    await seedPromo(worker, code, 0, 100);

    const first = await redeemPromo(worker, token, userId, code);
    const second = await redeemPromo(worker, token, userId, code);
    const balance = await getBalance(worker, token, userId);

    expect(first.success).toBe(true);
    expect(first.gp_added).toBe(100);
    expect(second.success).toBe(true);
    expect(second.already_redeemed).toBe(true);
    expect(second.gp_added).toBeUndefined();
    expect(balance.gp_balance).toBe(100);
  });

  it(testName('Consume Idempotency: should return same result when same consumeId is used twice'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-consume-idempotency');
    const consumeId = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
    await seedGpViaRedeem(worker, token, userId, 200);

    const response1 = await consumeGp(worker, token, userId, 50, consumeId);
    const response2 = await consumeGp(worker, token, userId, 50, consumeId);

    expect(response1.status).toBe(HttpStatus.Ok);
    const data1 = await response1.json() as CreditMutationResponse;
    expect(data1.success).toBe(true);
    expect(data1.new_balance).toBe(150);

    expect(response2.status).toBe(HttpStatus.Ok);
    const data2 = await response2.json() as CreditMutationResponse;
    expect(data2.success).toBe(true);
    expect(data2.already_processed).toBe(true);
    expect(data2.new_balance).toBe(150);

    const balance = await getBalance(worker, token, userId);
    expect(balance.gp_balance).toBe(150);
  });

  it(testName('Redeem Concurrency: should prevent duplicate awards under concurrency'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-concurrent');
    const code = uniquePromoCode('CONC_PROMO');
    await seedPromo(worker, code, 0, 100);
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const body = JSON.stringify({ code });
    const headers = {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };

    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        worker.fetch(redeemUrl, { method: HttpMethod.Post, headers, body }, token)
      )
    );

    const successful = responses.filter(r => r.status === HttpStatus.Ok);
    expect(successful.length).toBeGreaterThanOrEqual(1);
    for (const response of responses) await consumeResponseBody(response);
    const balance = await getBalance(worker, token, userId);
    expect(balance.gp_balance).toBe(100);
  });

  it(testName('Consume Concurrency: should prevent duplicate consumption under concurrency'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-consume-concurrent');
    const consumeId = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
    await seedGpViaRedeem(worker, token, userId, 200);

    const responses = await Promise.all(
      Array.from({ length: 10 }, () => consumeGp(worker, token, userId, 50, consumeId))
    );

    for (const response of responses) await consumeResponseBody(response);
    const balance = await getBalance(worker, token, userId);
    expect(balance.gp_balance).toBe(150);
  });

  it(testName('Input Validation: should reject malformed consume body'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-validation');
    const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
    const response = await worker.fetch(consumeUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({
        currency: Currency.GP,
        description: 'Test consume',
      }),
    }, token);

    expect(response.status).toBe(HttpStatus.BadRequest);
    await consumeResponseBody(response);
  });

  it(testName('Input Validation: should reject invalid consume currency'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-currency');
    const consumeUrl = buildCreditsApiUrl(userId, CreditAction.ConsumeGP);
    const response = await worker.fetch(consumeUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Consume),
      },
      body: JSON.stringify({
        amount: 50,
        currency: 'INVALID' as Currency,
        description: 'Test consume',
      }),
    }, token);

    expect(response.status).toBe(HttpStatus.BadRequest);
    await consumeResponseBody(response);
  });

  it(testName('Transactions Endpoint: should return transactions for user'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-transactions');
    await seedGpViaRedeem(worker, token, userId, 100);
    await seedCreditsViaStripe(worker, userId, 50, token);

    const data = await getTransactions(worker, token, userId);

    expect(data.count).toBeGreaterThanOrEqual(2);
    expect(data.transactions.length).toBeGreaterThanOrEqual(2);
    expect(data.transactions.some(t => t.type === 'earned')).toBe(true);
    expect(data.transactions.some(t => t.type === 'purchase')).toBe(true);
  });

  it(testName('Transactions Endpoint: should enforce limit parameter'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-transactions-limit');
    await seedGpViaRedeem(worker, token, userId, 10, 'LIMIT_PROMO_A');
    await seedGpViaRedeem(worker, token, userId, 10, 'LIMIT_PROMO_B');
    await seedGpViaRedeem(worker, token, userId, 10, 'LIMIT_PROMO_C');
    await seedGpViaRedeem(worker, token, userId, 10, 'LIMIT_PROMO_D');
    await seedGpViaRedeem(worker, token, userId, 10, 'LIMIT_PROMO_E');

    const data = await getTransactions(worker, token, userId, 3);

    expect(data.count).toBeLessThanOrEqual(3);
    expect(data.transactions.length).toBeLessThanOrEqual(3);
  });

  it(testName('Transactions Endpoint: should return empty transactions for new user'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-transactions-empty');

    const data = await getTransactions(worker, token, userId);

    expect(data.count).toBe(0);
    expect(data.transactions.length).toBe(0);
  });

  it(testName('R2 Archiving: should archive purchase transaction to R2 after successful purchase'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-archive-purchase');
    await seedCreditsViaStripe(worker, userId, 100, token);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const transactionsData = await getTransactions(worker, token, userId);
    const archivedTransaction = transactionsData.transactions.find(t => t.type === 'purchase');

    expect(archivedTransaction).not.toBeNull();
    expect(archivedTransaction!.amount).toBe(100);
    expect(archivedTransaction!.currency).toBe('AC');
  });

  it(testName('R2 Archiving: should archive consume AC transaction to R2 after successful consume'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-archive-consume-ac');
    await seedCreditsViaStripe(worker, userId, 200, token);

    const consumeId = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
    const consumeUrl = buildCreditsApiUrl(userId, CreditAction.Consume);
    const consumeResponse = await worker.fetch(consumeUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(userId),
        [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.IdempotencyKey]: consumeId,
      },
      body: JSON.stringify({
        ac_amount: 50,
        description: 'Test consume AC',
      }),
    }, token);

    expect(consumeResponse.status).toBe(HttpStatus.Ok);
    const consumeData = await consumeResponse.json() as CreditMutationResponse;
    expect(consumeData.success).toBe(true);
    expect(consumeData.transaction_id).toBeTypeOf('string');

    await new Promise(resolve => setTimeout(resolve, 1000));
    const transactionsData = await getTransactions(worker, token, userId);
    const archivedTransaction = transactionsData.transactions.find(
      t => t.transaction_id === consumeData.transaction_id
    );

    expect(archivedTransaction).not.toBeNull();
    expect(archivedTransaction!.type).toBe('consumption');
    expect(archivedTransaction!.amount).toBe(-50);
    expect(archivedTransaction!.currency).toBe('AC');
  });

  it(testName('R2 Archiving: should archive GP award transaction after promo redemption'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('test-user-archive-award');
    await seedGpViaRedeem(worker, token, userId, 100);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const transactionsData = await getTransactions(worker, token, userId);
    const archivedTransaction = transactionsData.transactions.find(t => t.type === 'earned');

    expect(archivedTransaction).not.toBeNull();
    expect(archivedTransaction!.amount).toBe(100);
    expect(archivedTransaction!.currency).toBe('GP');
  });
});
