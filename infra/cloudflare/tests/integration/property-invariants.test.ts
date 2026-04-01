import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import * as fc from 'fast-check';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildCreditsApiUrl, generateTestUserId, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { Currency, CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { generateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_DIAG = false;
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

async function runPropertyParallel<T extends unknown[]>(
  arb: fc.Arbitrary<T>,
  run: (...args: T) => Promise<boolean>,
  numRuns: number
): Promise<void> {
  const samples = fc.sample(arb, numRuns);
  const results = await Promise.all(samples.map((args) => run(...(args as T))));
  const failed = results.findIndex((r) => r !== true);
  if (failed >= 0) {
    expect(results[failed]).toBe(true);
  }
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    if (LOG_DIAG && typeof console !== 'undefined') console.log('[DIAG] test beforeAll: getting worker');
    logInfo('[TEST] Initializing test worker for property-based invariant tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      if (LOG_DIAG && typeof console !== 'undefined') console.log('[DIAG] test beforeAll: worker ready', worker.getStatus?.());
      logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Economic Invariants - Credits: same purchase request twice should create exactly two transactions with correct total'), async () => {
      logInfo('[TEST] Testing economic invariant: same purchase twice', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      await runPropertyParallel(
        fc.tuple(fc.integer({ min: 0, max: 99999 }), fc.integer({ min: 1, max: 1000 })),
        async (seed, acAmount) => {
            if (LOG_DIAG && typeof console !== 'undefined') console.log('[DIAG] test iteration start', { seed, acAmount });
            const token = await createToken();
            const uniqueUserId = generateTestUserId(`${seed}-prop`);
            logInfo('[TEST] Property test iteration', getStackTrace(), { userId: uniqueUserId, acAmount }, LOG_TEST_OPERATIONS);

            const balanceUrl = buildCreditsApiUrl(uniqueUserId, CreditAction.Balance);
            if (LOG_DIAG && typeof console !== 'undefined') console.log('[DIAG] test about to first worker.fetch', balanceUrl);
            const initialBalance = await worker.fetch(
              balanceUrl,
              {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(uniqueUserId)
              },
              token
            );
            if (LOG_DIAG && typeof console !== 'undefined') console.log('[DIAG] test first worker.fetch done', { status: initialBalance.status, seed });

            expect(initialBalance.status).toBe(HttpStatus.Ok);
            if (initialBalance.status !== HttpStatus.Ok) {
              logError('[TEST] Property test: Initial balance fetch failed', getStackTrace(), { status: initialBalance.status, userId: uniqueUserId });
            }
            const initialData = await initialBalance.json() as { ac_balance: number };
            const initialAC = initialData.ac_balance;

            const purchasePayload = {
              ac_amount: acAmount,
              amount: acAmount / 100,
              currency: Currency.USD,
            };

            const idempotencyKey1 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const response1 = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
              {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey1
                },
                body: JSON.stringify(purchasePayload)
              },
              token
            );

            expect(response1.status).toBe(HttpStatus.Ok);
            const data1 = await response1.json() as { new_balance: number; transaction_id: string };
            expect(data1.new_balance).toBe(initialAC + acAmount);

            const idempotencyKey2 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const response2 = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
              {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey2
                },
                body: JSON.stringify(purchasePayload)
              },
              token
            );

            expect(response2.status).toBe(HttpStatus.Ok);
            const data2 = await response2.json() as { new_balance: number; transaction_id: string };
            expect(data2.transaction_id).not.toBe(data1.transaction_id);
            expect(data2.new_balance).toBe(initialAC + (acAmount * 2));

            const finalBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId)
                }
              },
              token
            );

            const finalData = await finalBalance.json() as { ac_balance: number };
            expect(finalData.ac_balance).toBe(initialAC + (acAmount * 2));
            return true;
          },
        10
      );
    }, 120000);

  it(testName('Economic Invariants - Credits: failed purchase should not add credits'), async () => {
      await runPropertyParallel(
        fc.tuple(fc.integer({ min: 0, max: 99999 }), fc.integer({ min: -1000, max: 0 })),
        async (seed, invalidAmount) => {
            const token = await createToken();
            const uniqueUserId = generateTestUserId(`${seed}-fail`);

            const initialBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(uniqueUserId)
              },
              token
            );

            expect(initialBalance.status).toBe(HttpStatus.Ok);
            const initialData = await initialBalance.json() as { ac_balance: number };
            const initialAC = initialData.ac_balance;

            const purchaseResponse = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
              {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson
                },
                body: JSON.stringify({
                  ac_amount: invalidAmount,
                  amount: 1,
                  currency: Currency.USD,
                })
              },
              token
            );

            expect(purchaseResponse.status).toBe(HttpStatus.BadRequest);

            const finalBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId)
                }
              },
              token
            );

            const finalData = await finalBalance.json() as { ac_balance: number };
            expect(finalData.ac_balance).toBe(initialAC);
            return true;
          },
        10
      );
    }, 120000);

  it(testName('Economic Invariants - Credits: concurrent identical purchases should create separate transactions with correct total'), async () => {
      await runPropertyParallel(
        fc.tuple(fc.integer({ min: 0, max: 99999 }), fc.integer({ min: 1, max: 100 })),
        async (seed, acAmount) => {
            const token = await createToken();
            const uniqueUserId = generateTestUserId(`${seed}-concurrent`);

            const initialBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(uniqueUserId)
              },
              token
            );

            expect(initialBalance.status).toBe(HttpStatus.Ok);
            const initialData = await initialBalance.json() as { ac_balance: number };
            const initialAC = initialData.ac_balance;

            const purchasePayload = {
              ac_amount: acAmount,
              amount: acAmount / 100,
              currency: Currency.USD,
            };

            const idempotencyKey1 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const idempotencyKey2 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const [response1, response2] = await Promise.all([
              worker.fetch(
                buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
                {
                  method: HttpMethod.Post,
                  headers: {
                    ...getValidRequestHeaders(uniqueUserId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                    [HttpHeader.IdempotencyKey]: idempotencyKey1
                  },
                  body: JSON.stringify(purchasePayload)
                },
                token
              ),
              worker.fetch(
                buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
                {
                  method: HttpMethod.Post,
                  headers: {
                    ...getValidRequestHeaders(uniqueUserId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                    [HttpHeader.IdempotencyKey]: idempotencyKey2
                  },
                  body: JSON.stringify(purchasePayload)
                },
                token
              )
            ]);

            expect(response1.status).toBe(HttpStatus.Ok);
            expect(response2.status).toBe(HttpStatus.Ok);

            const data1 = await response1.json() as { new_balance: number; transaction_id: string };
            const data2 = await response2.json() as { new_balance: number; transaction_id: string };

            expect(data1.transaction_id).not.toBe(data2.transaction_id);

            await new Promise(resolve => setTimeout(resolve, 500));

            const finalBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId)
                }
              },
              token
            );

            const finalData = await finalBalance.json() as { ac_balance: number };
            const expectedTotal = initialAC + (acAmount * 2);
            expect(finalData.ac_balance).toBe(expectedTotal);
            return true;
          },
        10

      );
    }, 120000);

  it(testName('Economic Invariants - Credits: order of independent purchase actions should produce same final balance'), async () => {
      await runPropertyParallel(
        fc.tuple(fc.integer({ min: 0, max: 99999 }), fc.integer({ min: 1, max: 50 }), fc.integer({ min: 1, max: 50 })),
        async (seed, amount1, amount2) => {
            const token = await createToken();
            const uniqueUserId1 = generateTestUserId(`${seed}-order1`);
            const uniqueUserId2 = generateTestUserId(`${seed}-order2`);

            const purchase1 = {
              ac_amount: amount1,
              amount: amount1 / 100,
              currency: Currency.USD,
            };

            const purchase2 = {
              ac_amount: amount2,
              amount: amount2 / 100,
              currency: Currency.USD,
            };

            const balanceUrl1 = buildCreditsApiUrl(uniqueUserId1, CreditAction.Balance);
            const initialBalance1 = await worker.fetch(balanceUrl1, {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(uniqueUserId1)
              },
              token
            );

            const balanceUrl2 = buildCreditsApiUrl(uniqueUserId2, CreditAction.Balance);
            const initialBalance2 = await worker.fetch(balanceUrl2, {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(uniqueUserId2)
              },
              token
            );

            expect(initialBalance1.status).toBe(HttpStatus.Ok);
            expect(initialBalance2.status).toBe(HttpStatus.Ok);

            const initialData1 = await initialBalance1.json() as { ac_balance: number };
            const initialData2 = await initialBalance2.json() as { ac_balance: number };
            const initialAC1 = initialData1.ac_balance;
            const initialAC2 = initialData2.ac_balance;

            const idempotencyKey1a = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const idempotencyKey1b = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const idempotencyKey2a = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const idempotencyKey2b = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const purchaseUrl1a = buildCreditsApiUrl(uniqueUserId1, CreditAction.Purchase);
            const response1a = await worker.fetch(purchaseUrl1a, {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId1),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey1a
                },
                body: JSON.stringify(purchase1)
              },
              token
            );

            const purchaseUrl1b = buildCreditsApiUrl(uniqueUserId1, CreditAction.Purchase);
            const response1b = await worker.fetch(purchaseUrl1b, {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId1),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey1b
                },
                body: JSON.stringify(purchase2)
              },
              token
            );

            const purchaseUrl2a = buildCreditsApiUrl(uniqueUserId2, CreditAction.Purchase);
            const response2a = await worker.fetch(purchaseUrl2a, {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId2),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey2a
                },
                body: JSON.stringify(purchase2)
              },
              token
            );

            const purchaseUrl2b = buildCreditsApiUrl(uniqueUserId2, CreditAction.Purchase);
            const response2b = await worker.fetch(purchaseUrl2b, {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId2),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey2b
                },
                body: JSON.stringify(purchase1)
              },
              token
            );

            expect(response1a.status).toBe(HttpStatus.Ok);
            expect(response1b.status).toBe(HttpStatus.Ok);
            expect(response2a.status).toBe(HttpStatus.Ok);
            expect(response2b.status).toBe(HttpStatus.Ok);

            await new Promise(resolve => setTimeout(resolve, 500));

            const finalBalanceUrl1 = buildCreditsApiUrl(uniqueUserId1, CreditAction.Balance);
            const finalBalance1 = await worker.fetch(finalBalanceUrl1, {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(uniqueUserId1)
              },
              token
            );

            const finalBalanceUrl2 = buildCreditsApiUrl(uniqueUserId2, CreditAction.Balance);
            const finalBalance2 = await worker.fetch(finalBalanceUrl2, {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(uniqueUserId2)
              },
              token
            );

            const finalData1 = await finalBalance1.json() as { ac_balance: number };
            const finalData2 = await finalBalance2.json() as { ac_balance: number };

            const expectedBalance1 = initialAC1 + amount1 + amount2;
            const expectedBalance2 = initialAC2 + amount2 + amount1;

            expect(finalData1.ac_balance).toBe(expectedBalance1);
            expect(finalData2.ac_balance).toBe(expectedBalance2);
            expect(finalData1.ac_balance - initialAC1).toBe(finalData2.ac_balance - initialAC2);

            return true;
          },
        10
      );
    }, 120000);

  it(testName('Retry Invariants: retrying same purchase request should not mutate state differently'), async () => {
      await runPropertyParallel(
        fc.tuple(fc.integer({ min: 0, max: 99999 }), fc.integer({ min: 1, max: 100 })),
        async (seed, acAmount) => {
            const token = await createToken();
            const uniqueUserId = generateTestUserId(`${seed}-retry`);

            const initialBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(uniqueUserId)
              },
              token
            );

            expect(initialBalance.status).toBe(HttpStatus.Ok);
            const initialData = await initialBalance.json() as { ac_balance: number };
            const initialAC = initialData.ac_balance;

            const purchasePayload = {
              ac_amount: acAmount,
              amount: acAmount / 100,
              currency: Currency.USD,
            };

            const idempotencyKey1 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const response1 = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
              {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey1
                },
                body: JSON.stringify(purchasePayload)
              },
              token
            );

            expect(response1.status).toBe(HttpStatus.Ok);
            const data1 = await response1.json() as { new_balance: number; transaction_id: string };
            const balanceAfterFirst = data1.new_balance;
            expect(balanceAfterFirst).toBe(initialAC + acAmount);

            await new Promise(resolve => setTimeout(resolve, 100));

            const idempotencyKey2 = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const response2 = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
              {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey2
                },
                body: JSON.stringify(purchasePayload)
              },
              token
            );

            expect(response2.status).toBe(HttpStatus.Ok);
            const data2 = await response2.json() as { new_balance: number; transaction_id: string };
            
            expect(data1.transaction_id).not.toBe(data2.transaction_id);
            expect(data2.new_balance).toBe(balanceAfterFirst + acAmount);

            return true;
          },
        10
      );
    }, 120000);

  it(testName('Retry Invariants: retrying failed request should not produce different error'), async () => {
      await runPropertyParallel(
        fc.tuple(fc.integer({ min: 0, max: 99999 }), fc.integer({ min: -1000, max: 0 })),
        async (seed, invalidAmount) => {
            const token = await createToken();
            const uniqueUserId = generateTestUserId(`${seed}-retry-fail`);

            const purchasePayload = {
              ac_amount: invalidAmount,
              amount: 1,
              currency: Currency.USD,
            };

            const response1 = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
              {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson
                },
                body: JSON.stringify(purchasePayload)
              },
              token
            );

            expect(response1.status).toBe(HttpStatus.BadRequest);

            await new Promise(resolve => setTimeout(resolve, 100));

            const response2 = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
              {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson
                },
                body: JSON.stringify(purchasePayload)
              },
              token
            );

            expect(response2.status).toBe(HttpStatus.BadRequest);
            return true;
          },
        10
      );
    }, 120000);

  it(testName('Partial Failure Invariants: partial failure should not advantage attacker economically'), async () => {
      await runPropertyParallel(
        fc.tuple(fc.integer({ min: 0, max: 99999 }), fc.integer({ min: 1, max: 100 })),
        async (seed, acAmount) => {
            const token = await createToken();
            const uniqueUserId = generateTestUserId(`${seed}-partial`);

            const initialBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId)
                }
              },
              token
            );

            expect(initialBalance.status).toBe(HttpStatus.Ok);
            const initialData = await initialBalance.json() as { ac_balance: number };
            const initialAC = initialData.ac_balance;

            const purchasePayload = {
              ac_amount: acAmount,
              amount: acAmount / 100,
              currency: Currency.USD,
            };

            const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const purchaseResponse = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
              {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey
                },
                body: JSON.stringify(purchasePayload)
              },
              token
            );

            if (purchaseResponse.status === HttpStatus.Ok) {
              const purchaseData = await purchaseResponse.json() as { new_balance: number };
              const expectedBalance = initialAC + acAmount;
              
              const verifyBalance = await worker.fetch(
                buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
                {
                  method: HttpMethod.Get,
                  headers: getValidRequestHeaders(uniqueUserId)
                },
                token
              );

              const verifyData = await verifyBalance.json() as { ac_balance: number };
              
              expect(verifyData.ac_balance).toBe(expectedBalance);
              expect(verifyData.ac_balance).toBe(purchaseData.new_balance);
              
              return true;
            } else {
              const finalBalance = await worker.fetch(
                buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
                {
                  method: HttpMethod.Get,
                  headers: getValidRequestHeaders(uniqueUserId)
                },
                token
              );

              const finalData = await finalBalance.json() as { ac_balance: number };
              
              expect(finalData.ac_balance).toBe(initialAC);
              return true;
            }
          },
        10
      );
    }, 120000);

  it(testName('Partial Failure Invariants: timeout should not result in profit'), async () => {
      await runPropertyParallel(
        fc.tuple(fc.integer({ min: 0, max: 99999 }), fc.integer({ min: 1, max: 100 })),
        async (seed, acAmount) => {
            const token = await createToken();
            const uniqueUserId = generateTestUserId(`${seed}-timeout`);

            const initialBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(uniqueUserId)
              },
              token
            );

            expect(initialBalance.status).toBe(HttpStatus.Ok);
            const initialData = await initialBalance.json() as { ac_balance: number };
            const initialAC = initialData.ac_balance;

            const purchasePayload = {
              ac_amount: acAmount,
              amount: acAmount / 100,
              currency: Currency.USD,
            };

            const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const purchasePromise = worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
              {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey
                },
                body: JSON.stringify(purchasePayload),
                signal: AbortSignal.timeout(50)
              },
              token
            );

            try {
              const res = await purchasePromise;
              await consumeResponseBody(res);
            } catch (error) {
              expect(error).not.toBeUndefined();
              expect(error).not.toBeNull();
            }

            await new Promise(resolve => setTimeout(resolve, 500));

            const finalBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId)
                }
              },
              token
            );

            const finalData = await finalBalance.json() as { ac_balance: number };
            
            const balanceChange = finalData.ac_balance - initialAC;
            expect(balanceChange).toBeGreaterThanOrEqual(0);
            expect(balanceChange).toBeLessThanOrEqual(acAmount);
            
            return true;
          },
        10
      );
    }, 120000);

  it(testName('State Machine Invariants: successful purchase should increase balance by exact amount'), async () => {
      await runPropertyParallel(
        fc.tuple(fc.integer({ min: 0, max: 99999 }), fc.integer({ min: 1, max: 100 })),
        async (seed, acAmount) => {
            const token = await createToken();
            const uniqueUserId = generateTestUserId(`${seed}-partial`);

            const initialBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId)
                }
              },
              token
            );

            expect(initialBalance.status).toBe(HttpStatus.Ok);
            const initialData = await initialBalance.json() as { ac_balance: number };
            const initialAC = initialData.ac_balance;

            const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Purchase);
            const purchaseResponse = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Purchase),
              {
                method: HttpMethod.Post,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId),
                  [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                  [HttpHeader.IdempotencyKey]: idempotencyKey
                },
                body: JSON.stringify({
                  ac_amount: acAmount,
                  amount: acAmount / 100,
                  currency: Currency.USD,
                })
              },
              token
            );

            expect(purchaseResponse.status).toBe(HttpStatus.Ok);
            const purchaseData = await purchaseResponse.json() as { new_balance: number };
            expect(purchaseData.new_balance).toBe(initialAC + acAmount);

            const finalBalance = await worker.fetch(
              buildCreditsApiUrl(uniqueUserId, CreditAction.Balance),
              {
                method: HttpMethod.Get,
                headers: {
                  ...getValidRequestHeaders(uniqueUserId)
                }
              },
              token
            );

            const finalData = await finalBalance.json() as { ac_balance: number };
            expect(finalData.ac_balance).toBe(initialAC + acAmount);
            return true;
          },
        10
      );
    }, 120000);
});
