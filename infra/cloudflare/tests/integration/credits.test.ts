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
import { CreditAction, Currency } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig, TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { generateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
import { seedCreditsViaStripe } from '@tests/helpers/payment-credit-helpers';

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

async function consumeResponseBody(response: Response): Promise<void> {
  if (!response.bodyUsed) {
    try {
      await response.arrayBuffer();
    } catch {
      try {
        await response.text();
      } catch {
        try {
          await response.blob();
        } catch {
          void 0;
        }
      }
    }
  }
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Credit Balance: should return credit balance for authenticated user'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('balance');
      logInfo('[TEST] Fetching credit balance', getStackTrace(), { userId }, LOG_TEST_OPERATIONS);

      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const response = await worker.fetch(balanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
        token
      );

      logInfo('[TEST] Balance response received', getStackTrace(), { status: response.status, userId }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        user_id: string;
        gp_balance: number;
        ac_balance: number;
        total_gp_earned: number;
        total_ac_purchased: number;
        total_ac_spent: number;
        last_updated: string;
      };

      logInfo('[TEST] Balance data validated', getStackTrace(), { userId: data.user_id, gp: data.gp_balance, ac: data.ac_balance }, LOG_TEST_OPERATIONS);
      expect(data.user_id).toBe(userId);
      expect(typeof data.gp_balance).toBe('number');
      expect(data.gp_balance).toBeGreaterThanOrEqual(0);
      expect(typeof data.ac_balance).toBe('number');
      expect(data.ac_balance).toBeGreaterThanOrEqual(0);
      if (data.user_id !== userId || data.gp_balance < 0 || data.ac_balance < 0) {
        logError('[TEST] Balance data validation failed', getStackTrace(), { expectedUserId: userId, actualUserId: data.user_id, gpBalance: data.gp_balance, acBalance: data.ac_balance });
      }
      expect(typeof data.total_gp_earned).toBe('number');
      expect(typeof data.total_ac_purchased).toBe('number');
      expect(typeof data.total_ac_spent).toBe('number');
      expect(typeof data.last_updated).toBe('string');
    });

  it(testName('Credit Balance: should return default balance of 0 for new user'), async () => {
      const token = await createToken();
      const newUserId = generateTestUserId('new-user');
      logInfo('[TEST] Testing default balance for new user', getStackTrace(), { userId: newUserId }, LOG_TEST_OPERATIONS);
      
      const balanceUrl = buildCreditsApiUrl(newUserId, CreditAction.Balance);
      const response = await worker.fetch(balanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(newUserId)
        },
        token
      );

      logInfo('[TEST] New user balance response', getStackTrace(), { status: response.status, userId: newUserId }, LOG_TEST_OPERATIONS);
      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        gp_balance: number;
        ac_balance: number;
      };

      logInfo('[TEST] New user balance validated', getStackTrace(), { gp: data.gp_balance, ac: data.ac_balance }, LOG_TEST_OPERATIONS);
      expect(data.gp_balance).toBe(0);
      expect(data.ac_balance).toBe(0);
    });

  it(testName('Credit Purchase: should add AC credits through payment checkout fulfillment'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('purchase');
      const purchaseAmount = 1000;
      logInfo('[TEST] Starting checkout credit fulfillment test', getStackTrace(), { userId, amount: purchaseAmount }, LOG_TEST_OPERATIONS);

      const initialBalanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const initialBalanceResponse = await worker.fetch(initialBalanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
        token
      );
      const initialBalance = await initialBalanceResponse.json() as { ac_balance: number };
      const expectedNewBalance = initialBalance.ac_balance + purchaseAmount;
      logInfo('[TEST] Initial balance retrieved', getStackTrace(), { initialBalance: initialBalance.ac_balance, expectedNew: expectedNewBalance }, LOG_TEST_OPERATIONS);

      const payment = await seedCreditsViaStripe(worker, userId, purchaseAmount, token);
      const response = await worker.fetch(initialBalanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
        token
      );

      logInfo('[TEST] Fulfillment balance response received', getStackTrace(), { status: response.status, userId }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        ac_balance: number;
        total_ac_purchased: number;
      };

      logInfo('[TEST] Fulfillment validated', getStackTrace(), { paymentId: payment.paymentId, newBalance: data.ac_balance }, LOG_TEST_OPERATIONS);
      expect(typeof payment.paymentId).toBe('string');
      expect(payment.paymentId.length).toBeGreaterThan(0);
      expect(data.ac_balance).toBe(expectedNewBalance);
      expect(data.total_ac_purchased).toBe(expectedNewBalance);
      if (data.ac_balance !== expectedNewBalance) {
        logError('[TEST] Fulfillment validation failed', getStackTrace(), { expectedBalance: expectedNewBalance, actualBalance: data.ac_balance });
      }
    });

  it(testName('Credit Purchase: should reject direct client purchase mutations'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('purchase-invalid');
      logInfo('[TEST] Testing purchase validation with invalid amount', getStackTrace(), { userId, invalidAmount: -100 }, LOG_TEST_OPERATIONS);

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const response = await worker.fetch(purchaseUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: purchaseIdempotencyKey
          },
          body: JSON.stringify({
            ac_amount: -100,
            amount: 10,
            currency: Currency.USD,
          })
        },
        token
      );

      logInfo('[TEST] Invalid purchase validation response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Forbidden);
      if (response.status !== HttpStatus.Forbidden) {
        logError('[TEST] Unexpected status for client purchase mutation', getStackTrace(), { expected: HttpStatus.Forbidden, actual: response.status });
      }
      const data = await response.json() as { error: string; message: string };
      expect(data.error).toBe('Forbidden');
      if (data.error !== 'Forbidden') {
        logError('[TEST] Unexpected error message for client purchase mutation', getStackTrace(), { expected: 'Forbidden', actual: data.error });
      }
      expect(data.message).toContain('payment checkout flow');
    });

  it(testName('Credit Purchase: should reject direct client purchase mutation before amount validation'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('purchase-zero');
      logInfo('[TEST] Testing purchase validation with zero amount', getStackTrace(), { userId }, LOG_TEST_OPERATIONS);

      const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
      const purchaseIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const response = await worker.fetch(purchaseUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: purchaseIdempotencyKey
          },
          body: JSON.stringify({
            ac_amount: 0,
            amount: 10,
            currency: Currency.USD,
          })
        },
        token
      );

      logInfo('[TEST] Zero amount validation response', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
      expect(response.status).toBe(HttpStatus.Forbidden);
      await consumeResponseBody(response);
    });

  it(testName('Credit Consumption: should allow user to consume AC credits'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('consume');
      logInfo('[TEST] Starting credit consumption test', getStackTrace(), { userId }, LOG_TEST_OPERATIONS);

      await seedCreditsViaStripe(worker, userId, 500, token);

      const consumeAmount = 200;
      logInfo('[TEST] Consuming credits', getStackTrace(), { userId, amount: consumeAmount }, LOG_TEST_OPERATIONS);
      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.Consume);
      const consumeIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response = await worker.fetch(consumeUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeIdempotencyKey
          },
          body: JSON.stringify({
            ac_amount: consumeAmount,
            description: 'AI model usage',
            metadata: {
              model_id: 'gpt-4',
              tokens: 1000
            }
          })
        },
        token
      );

      logInfo('[TEST] Consumption response received', getStackTrace(), { status: response.status, userId }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        success: boolean;
        transaction_id: string;
        new_balance: number;
        ac_consumed: number;
      };

      logInfo('[TEST] Consumption validated', getStackTrace(), { success: data.success, consumed: data.ac_consumed, newBalance: data.new_balance }, LOG_TEST_OPERATIONS);
      expect(data.success).toBe(true);
      expect(typeof data.transaction_id).toBe('string');
      expect(data.ac_consumed).toBe(consumeAmount);
      expect(data.new_balance).toBeGreaterThanOrEqual(0);
    });

  it(testName('Credit Consumption: should reject consumption when balance is insufficient'), async () => {
      const token = await createToken();
      const newUserId = generateTestUserId('insufficient-user');

      const url = buildCreditsApiUrl(newUserId, CreditAction.Consume);
      const consumeIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response = await worker.fetch(url,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(newUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeIdempotencyKey
          },
          body: JSON.stringify({
            ac_amount: 1000,
            description: 'AI model usage'
          })
        },
        token
      );

      expect(response.status).toBe(402);
      const data = await response.json() as {
        error: string;
        message: string;
        current_balance: number;
        required: number;
      };

      expect(data.error).toBe('Insufficient Credits');
      expect(data.message).toContain('Insufficient AC balance');
      expect(data.current_balance).toBe(0);
      expect(data.required).toBe(1000);
    });

  it(testName('Credit Consumption: should reject consumption with invalid amount'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('consume-invalid');
      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.Consume);
      const consumeIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response = await worker.fetch(consumeUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeIdempotencyKey
          },
          body: JSON.stringify({
            ac_amount: -50,
            description: 'AI model usage'
          })
        },
        token
      );

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error: string; message: string };
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('Invalid request payload');
    });

  it(testName('Transaction History: should return transaction history for user'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('transactions');
      const transactionsUrl = buildCreditsApiUrl(userId, CreditAction.Transactions);
      const response = await worker.fetch(transactionsUrl,
        {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(userId)
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        user_id: string;
        transactions: Array<{
          transaction_id: string;
          type: string;
          amount: number;
          currency: string;
          description: string;
          timestamp: string;
        }>;
        count: number;
      };

      expect(data.user_id).toBe(userId);
      expect(Array.isArray(data.transactions)).toBe(true);
      expect(data.count).toBe(data.transactions.length);

      for (const transaction of data.transactions) {
        expect(typeof transaction.transaction_id).toBe('string');
        expect(['purchase', 'consumption', 'earned', 'refund']).toContain(transaction.type);
        expect(typeof transaction.amount).toBe('number');
        expect([Currency.GP, Currency.AC, Currency.USD]).toContain(transaction.currency);
        expect(typeof transaction.description).toBe('string');
        expect(typeof transaction.timestamp).toBe('string');
      }
    });

  it(testName('Transaction History: should respect limit parameter for transactions'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('transactions-limit');
      const limit = 10;
      const url = buildCreditsApiUrl(userId, CreditAction.Transactions);
      const transactionsUrl = `${url}?limit=${limit}`;
      const response = await worker.fetch(transactionsUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(userId)
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { transactions: unknown[] };
      expect(data.transactions.length).toBeLessThanOrEqual(limit);
    });

  it(testName('Rate Limiting: should reject repeated direct client purchase mutations'), async () => {
      const token = await createToken();
      const rateLimitUserId = generateTestUserId('rate-limit-purchase');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      const requests = [];
      const iterations = isRealMode ? 5 : 12;
      for (let i = 0; i < iterations; i++) {
        const purchaseUrl = buildCreditsApiUrl(rateLimitUserId, CreditAction.Purchase);
        const purchaseIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
        requests.push(
          worker.fetch(purchaseUrl,
            {
              method: HttpMethod.Post,
              headers: {
                ...getValidRequestHeaders(rateLimitUserId),
                [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                [HttpHeader.IdempotencyKey]: purchaseIdempotencyKey
              },
              body: JSON.stringify({
                ac_amount: 100,
                amount: 1,
                currency: Currency.USD,
              })
            },
            token
          )
        );
      }

      const responses = await Promise.all(requests);
      const forbiddenResponses = responses.filter(r => r.status === HttpStatus.Forbidden);
      const rateLimitedResponses = responses.filter(r => r.status === HttpStatus.TooManyRequests);
      
      if (!isRealMode) {
        expect(forbiddenResponses.length + rateLimitedResponses.length).toBe(iterations);
        if (rateLimitedResponses.length > 0) {
          const rateLimitResponse = rateLimitedResponses[0];
          expect(rateLimitResponse.headers.get(HttpHeader.XRateLimitRemaining)).toBe('0');
          expect(rateLimitResponse.headers.has(HttpHeader.XRateLimitReset)).toBe(true);
        }
      } else {
        expect(rateLimitedResponses.length).toBeLessThan(iterations);
        for (const response of responses) {
          expect(response.status).toBeGreaterThanOrEqual(HttpStatus.Ok);
          expect(response.status).toBeLessThan(HttpStatus.InternalServerError);
          const remaining = response.headers.get(HttpHeader.XRateLimitRemaining);
          const reset = response.headers.get(HttpHeader.XRateLimitReset);
          if (remaining !== null) {
            expect(Number.isNaN(Number.parseInt(remaining, 10))).toBe(false);
          }
          if (reset !== null) {
            expect(Number.isNaN(Number.parseInt(reset, 10))).toBe(false);
          }
        }
      }
      for (const r of responses) await r.text().catch(() => undefined);
    });

  it(testName('Rate Limiting: should enforce rate limit on consume operations'), async () => {
      const token = await createToken();
      const rateLimitUserId = generateTestUserId('rate-limit-consume');
      const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
      const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;

      await seedCreditsViaStripe(worker, rateLimitUserId, 10000, token);

      const requests = [];
      const iterations = isRealMode ? 5 : 105;
      for (let i = 0; i < iterations; i++) {
        const consumeUrl = buildCreditsApiUrl(rateLimitUserId, CreditAction.Consume);
        const consumeIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
        requests.push(
          worker.fetch(consumeUrl,
            {
              method: HttpMethod.Post,
              headers: {
                ...getValidRequestHeaders(rateLimitUserId),
                [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                [HttpHeader.IdempotencyKey]: consumeIdempotencyKey
              },
              body: JSON.stringify({
                ac_amount: 1,
                description: 'Test consumption'
              })
            },
            token
          )
        );
      }

      const responses = await Promise.all(requests);
      const rateLimitedResponses = responses.filter(r => r.status === HttpStatus.TooManyRequests);
      
      if (!isRealMode) {
        expect(rateLimitedResponses.length).toBeGreaterThan(0);
        if (rateLimitedResponses.length > 0) {
          const rateLimitResponse = rateLimitedResponses[0];
          expect(rateLimitResponse.headers.get(HttpHeader.XRateLimitRemaining)).toBe('0');
          expect(rateLimitResponse.headers.has(HttpHeader.XRateLimitReset)).toBe(true);
        }
      } else {
        expect(rateLimitedResponses.length).toBeLessThan(iterations);
        for (const response of responses) {
          expect(response.status).toBeGreaterThanOrEqual(HttpStatus.Ok);
          expect(response.status).toBeLessThan(HttpStatus.InternalServerError);
          const remaining = response.headers.get(HttpHeader.XRateLimitRemaining);
          const reset = response.headers.get(HttpHeader.XRateLimitReset);
          if (remaining !== null) {
            expect(Number.isNaN(Number.parseInt(remaining, 10))).toBe(false);
          }
          if (reset !== null) {
            expect(Number.isNaN(Number.parseInt(reset, 10))).toBe(false);
          }
        }
      }
      for (const r of responses) await r.text().catch(() => undefined);
    }, 60000);

  it(testName('Rate Limiting: should include rate limit headers in successful consume responses'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('rate-limit-headers');
      await seedCreditsViaStripe(worker, userId, 100, token);
      const consumeUrl = buildCreditsApiUrl(userId, CreditAction.Consume);
      const consumeIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Consume);
      const response = await worker.fetch(consumeUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(userId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: consumeIdempotencyKey
          },
          body: JSON.stringify({
            ac_amount: 1,
            description: 'Rate limit header probe'
          })
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      expect(response.headers.has(HttpHeader.XRateLimitRemaining)).toBe(true);
      expect(response.headers.has(HttpHeader.XRateLimitReset)).toBe(true);
      await response.text().catch(() => undefined);

      
      const remaining = parseInt(response.headers.get(HttpHeader.XRateLimitRemaining) || '0', 10);
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(100);
    });

  it(testName('Edge Cases: should reject concurrent direct purchase mutations without changing balance'), async () => {
      const token = await createToken();
      const concurrentUserId = generateTestUserId('concurrent');

      const balanceUrl = buildCreditsApiUrl(concurrentUserId, CreditAction.Balance);
      const initialBalance = await worker.fetch(balanceUrl, {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(concurrentUserId)
      }, token);
      expect(initialBalance.status).toBe(HttpStatus.Ok);
      const initialData = await initialBalance.json() as { ac_balance: number };
      const initialAC = initialData.ac_balance;

      const purchaseUrl1 = buildCreditsApiUrl(concurrentUserId, CreditAction.Purchase);
      const purchaseUrl2 = buildCreditsApiUrl(concurrentUserId, CreditAction.Purchase);
      const purchaseIdempotencyKey1 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const purchaseIdempotencyKey2 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const purchases = await Promise.all([
        worker.fetch(purchaseUrl1,
          {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(concurrentUserId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              [HttpHeader.IdempotencyKey]: purchaseIdempotencyKey1
            },
            body: JSON.stringify({
              ac_amount: 100,
              amount: 1,
              currency: Currency.USD,
            })
          },
          token
        ),
        worker.fetch(purchaseUrl2,
          {
            method: HttpMethod.Post,
            headers: {
              ...getValidRequestHeaders(concurrentUserId),
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
              [HttpHeader.IdempotencyKey]: purchaseIdempotencyKey2
            },
            body: JSON.stringify({
              ac_amount: 200,
              amount: 2,
              currency: Currency.USD,
            })
          },
          token
        ),
      ]);

      const successfulPurchases = purchases.filter(r => r.status === HttpStatus.Ok);
      expect(successfulPurchases.length).toBe(0);
      expect(purchases.every(r => r.status === HttpStatus.Forbidden)).toBe(true);
      for (const r of purchases) await r.text().catch(() => undefined);

      await new Promise(resolve => setTimeout(resolve, 500));

      const finalBalanceUrl = buildCreditsApiUrl(concurrentUserId, CreditAction.Balance);
      const finalBalance = await worker.fetch(finalBalanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(concurrentUserId)
        },
        token
      );
      const finalData = await finalBalance.json() as { ac_balance: number };
      expect(finalData.ac_balance).toBe(initialAC);
    });

  it(testName('Edge Cases: should handle very large AC amounts through checkout fulfillment'), async () => {
      const token = await createToken();
      const largeAmountUserId = generateTestUserId('large-amount');

      await seedCreditsViaStripe(worker, largeAmountUserId, 1000000, token);
      const response = await worker.fetch(buildCreditsApiUrl(largeAmountUserId, CreditAction.Balance),
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(largeAmountUserId)
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { ac_balance: number };
      expect(data.ac_balance).toBe(1000000);
    });

  it(testName('Edge Cases: should reject fractional direct purchase mutation at public boundary'), async () => {
      const token = await createToken();
      const fractionalUserId = generateTestUserId('fractional');

      const purchaseUrl = buildCreditsApiUrl(fractionalUserId, CreditAction.Purchase);
      const purchaseIdempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
      const response = await worker.fetch(purchaseUrl,
        {
          method: HttpMethod.Post,
          headers: {
            ...getValidRequestHeaders(fractionalUserId),
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            [HttpHeader.IdempotencyKey]: purchaseIdempotencyKey
          },
          body: JSON.stringify({
            ac_amount: 0.5,
            amount: 0.01,
            currency: Currency.USD,
          })
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error: string; message: string };
      expect(data.message).toContain('payment checkout flow');
    });

  it(testName('Authorization: should require authentication'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('auth-required');
      const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
      const response = await worker.fetch(balanceUrl,
        {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await consumeResponseBody(response);
    });

  it(testName('Authorization: should only allow users to access their own credit data'), async () => {
      const token = await createToken();
      const ownerUserId = generateTestUserId('auth-owner');
      const otherUserId = generateTestUserId('auth-other');
      const balanceUrl = buildCreditsApiUrl(ownerUserId, CreditAction.Balance);
      const response = await worker.fetch(balanceUrl,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(otherUserId)
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error: string; message: string };
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('own credit data');
    });

  it(testName('Redeem: should reject when code is missing'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-missing-code');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({}),
      },
      token
    );
    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = await response.json() as { error?: string; message?: string };
    const msg = data.error ?? data.message;
    expect(typeof msg === 'string' && msg.length > 0).toBe(true);
  });

  it(testName('Redeem: should reject invalid or expired code'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-invalid-code');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 'INVALID_CODE_XYZ' }),
      },
      token
    );
    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = await response.json() as { error?: string };
    expect(data.error).toBe('Invalid or expired code');
  });

  it(testName('Redeem: returns 401 when authentication is missing (Rule 14.1.1)'), async () => {
    const userId = generateTestUserId('redeem-no-auth');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 'ANY' }),
      }
    );
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await consumeResponseBody(response);
  });

  it(testName('Redeem: returns 400 for invalid JSON body (Rule 14.3)'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-bad-json');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: 'not json',
      },
      token
    );
    expect(response.status).toBe(HttpStatus.BadRequest);
    await consumeResponseBody(response);
  });

  it(testName('Redeem: returns 400 when code is wrong type (Rule 5.1)'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-code-type');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 12345 }),
      },
      token
    );
    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = await response.json() as { error?: string; message?: string };
    const errMsg = data.error ?? data.message;
    expect(typeof errMsg === 'string' && errMsg.length > 0).toBe(true);
  });

  it(testName('Redeem: happy path awards AC and GP (seed-and-redeem single request)'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-happy');
    const seedAndRedeemPath = ApiEndpoint.Test.SeedAndRedeem;
    const seedAndRedeemUrl = buildTestApiUrlForEndpoint(seedAndRedeemPath);
    const response = await worker.fetch(seedAndRedeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 'HAPPY_PROMO', ac: 75, gp: 25 }),
      },
      token
    );
    expect(response.status).toBe(HttpStatus.Ok);
    const data = await response.json() as {
      success: boolean;
      already_redeemed?: boolean;
      ac_added?: number;
      gp_added?: number;
      new_ac_balance?: number;
      new_gp_balance?: number;
    };
    expect(data.success).toBe(true);
    expect(data.ac_added).toBe(75);
    expect(data.gp_added).toBe(25);
    expect(typeof data.new_ac_balance).toBe('number');
    expect(typeof data.new_gp_balance).toBe('number');
    expect(data.new_ac_balance).toBe(75);
    expect(data.new_gp_balance).toBe(25);
  });

  it(testName('Redeem: idempotency same user same code returns already_redeemed (Rule 14.8)'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-idem');
    const seedAndRedeemPath = ApiEndpoint.Test.SeedAndRedeem;
    const seedAndRedeemUrl = buildTestApiUrlForEndpoint(seedAndRedeemPath);
    const first = await worker.fetch(seedAndRedeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 'IDEM_PROMO', ac: 100, gp: 0 }),
      },
      token
    );
    expect(first.status).toBe(HttpStatus.Ok);
    const firstData = await first.json() as { success: boolean; ac_added?: number; already_redeemed?: boolean };
    expect(firstData.success).toBe(true);
    expect(firstData.ac_added).toBe(100);
    expect(firstData.already_redeemed !== true).toBe(true);

    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const second = await worker.fetch(redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 'IDEM_PROMO' }),
      },
      token
    );
    expect(second.status).toBe(HttpStatus.Ok);
    const secondData = await second.json() as { success: boolean; already_redeemed?: boolean; ac_added?: number };
    expect(secondData.success).toBe(true);
    expect(secondData.already_redeemed).toBe(true);
    expect(secondData.ac_added).toBeUndefined();

    const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
    const balanceRes = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    const balance = await balanceRes.json() as { ac_balance: number };
    expect(balance.ac_balance).toBe(100);
  });

  it(testName('Redeem: concurrency same user same code final state at most one award (Rule 14.8.5)'), async () => {
    const seedPath = ApiEndpoint.Test.SeedPromo;
    const seedUrl = buildTestApiUrlForEndpoint(seedPath);
    const seedRes = await worker.fetch(seedUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getAdminAuthHeaders(),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 'CONC_PROMO', ac: 50, gp: 50 }),
      }
    );
    await seedRes.text().catch(() => undefined);

    const token = await createToken();
    const userId = generateTestUserId('redeem-conc');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const body = JSON.stringify({ code: 'CONC_PROMO' });
    const headers = {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const concurrent = await Promise.all(
      Array.from({ length: 10 }, () =>
        worker.fetch(redeemUrl, { method: HttpMethod.Post, headers, body }, token)
      )
    );
    const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
    const balanceRes = await worker.fetch(balanceUrl, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(userId),
    }, token);
    const balance = await balanceRes.json() as { ac_balance: number; gp_balance: number };
    expect(balance.ac_balance).toBe(50);
    expect(balance.gp_balance).toBe(50);
    const okCount = concurrent.filter(r => r.status === HttpStatus.Ok).length;
    expect(okCount).toBeGreaterThanOrEqual(1);
    for (const r of concurrent) await r.text().catch(() => undefined);
  });

  it(testName('Redeem: returns 401 when Authorization header is missing (Rule 2.1.1)'), async () => {
    const userId = generateTestUserId('redeem-no-auth');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 'ANY' }),
      }
    );
    expect(response.status).toBe(HttpStatus.Unauthorized);
    const data = await response.json() as { error?: string; message?: string };
    expect(data.error).toBe('Unauthorized');
    expect(typeof data.message === 'string' && (data.message.toLowerCase().includes('auth') || data.message.toLowerCase().includes('authorization') || data.message.toLowerCase().includes('token'))).toBe(true);
  });

  it(testName('Redeem: returns 400 when body is not valid JSON'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-bad-json');
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const response = await worker.fetch(redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: 'not json {',
      },
      token
    );
    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = await response.json() as { error?: string; message?: string };
    expect(typeof data.error === 'string' && data.error.length > 0).toBe(true);
    expect(typeof data.message).toBe('string');
  });

  it(testName('Redeem: success response shape has success and optional ac_added gp_added new_balance fields'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-shape');
    const seedPath = ApiEndpoint.Test.SeedAndRedeem;
    const seedUrl = buildTestApiUrlForEndpoint(seedPath);
    const res = await worker.fetch(seedUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 'SHAPE_PROMO', ac: 1, gp: 1 }),
      },
      token
    );
    expect(res.status).toBe(HttpStatus.Ok);
    const data = await res.json() as {
      success: boolean;
      already_redeemed?: boolean;
      ac_added?: number;
      gp_added?: number;
      new_ac_balance?: number;
      new_gp_balance?: number;
    };
    expect(data.success).toBe(true);
    expect(typeof data.success).toBe('boolean');
    expect(data.ac_added).toBe(1);
    expect(data.gp_added).toBe(1);
    expect(typeof data.new_ac_balance).toBe('number');
    expect(typeof data.new_gp_balance).toBe('number');
  });

  it(testName('Redeem: already_redeemed response does not include ac_added or gp_added'), async () => {
    const token = await createToken();
    const userId = generateTestUserId('redeem-already');
    const seedPath = ApiEndpoint.Test.SeedAndRedeem;
    const seedUrl = buildTestApiUrlForEndpoint(seedPath);
    const seedAlreadyRes = await worker.fetch(seedUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 'ALREADY_PROMO', ac: 10, gp: 0 }),
      },
      token
    );
    await seedAlreadyRes.text().catch(() => undefined);
    const redeemUrl = buildCreditsApiUrl(userId, CreditAction.Redeem);
    const second = await worker.fetch(redeemUrl,
      {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ code: 'ALREADY_PROMO' }),
      },
      token
    );
    expect(second.status).toBe(HttpStatus.Ok);
    const data = await second.json() as { success: boolean; already_redeemed?: boolean; ac_added?: number; gp_added?: number };
    expect(data.success).toBe(true);
    expect(data.already_redeemed).toBe(true);
    expect(data.ac_added).toBeUndefined();
    expect(data.gp_added).toBeUndefined();
  });
});
