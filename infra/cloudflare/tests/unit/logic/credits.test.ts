import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, vi } from 'vitest';
import {
  earnGPLogic,
  getCreditBalanceLogic,
  getTransactionsLogic,
  type CreditStorage,
  type CreditBalance,
  type CreditTransaction,
} from '@/logic/credits';
import { TransactionType, Currency } from '@ocentra/endpoint-domain/constants/credits';
import { HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { MetadataField } from '@ocentra/endpoint-domain/constants/idempotency';
import { IdempotencyKeyPrefix } from '@ocentra/endpoint-domain/constants/idempotency';
import { generateIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
import { CreditsDO } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

/**
 * Unit tests for pure logic functions only.
 *
 * DO Adapters (covered by integration tests):
 * - earnGPLogic: Covered by integration tests in credits-do.test.ts (Award endpoint)
 * - purchaseCreditsLogic: Covered by integration tests (via HTTP endpoints)
 *
 * Pure Logic (unit tested here with substitution):
 * - getCreditBalanceLogic: Pure pass-through with abstracted storage
 * - getTransactionsLogic: Pure logic (Math.min) with abstracted storage
 */

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const TestConstants = {
  UserId1: 'user1',
  MatchId1: 'match1',
  Tx1: 'tx1',
  Tx2: 'tx2',
  TestTimestamp: '2024-01-01T00:00:00Z',
  TestTimestamp2: '2024-01-02T00:00:00Z',
  Test: 'test',
  WinBonus: 'Win bonus',
  Purchase: 'Purchase',
  Consumption: 'Consumption',
  Stripe: 'stripe',
  MaxLimit: 100,
} as const;

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should return balance from storage'), async () => {
    logInfo('[TEST] Testing getCreditBalanceLogic', getStackTrace(), { userId: TestConstants.UserId1 }, LOG_TEST_OPERATIONS);
    const mockBalance: CreditBalance = {
      user_id: TestConstants.UserId1,
      gp_balance: 100,
      ac_balance: 50,
      last_updated: TestConstants.TestTimestamp,
      total_gp_earned: 200,
      total_ac_purchased: 100,
      total_ac_spent: 50,
    };

    const mockStorage: CreditStorage = {
      getBalance: vi.fn().mockResolvedValue(mockBalance),
      saveBalance: vi.fn(),
      getTransactions: vi.fn(),
      addTransaction: vi.fn(),
    };

    const result = await getCreditBalanceLogic(TestConstants.UserId1, mockStorage);

    expect(result).toEqual(mockBalance);
    if (result.user_id !== mockBalance.user_id || result.gp_balance !== mockBalance.gp_balance || result.ac_balance !== mockBalance.ac_balance) {
      logError('[TEST] Credit balance mismatch', getStackTrace(), { result, expected: mockBalance });
    }
    expect(mockStorage.getBalance).toHaveBeenCalledWith(TestConstants.UserId1);
    expect(mockStorage.getBalance).toHaveBeenCalledTimes(1);
  });
});

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });
  it(testName('should return transactions from storage with effective limit'), async () => {
    const mockTransactions: CreditTransaction[] = [
      {
        transaction_id: TestConstants.Tx1,
        user_id: TestConstants.UserId1,
        type: TransactionType.Purchase,
        amount: 100,
        currency: Currency.AC,
        description: TestConstants.Purchase,
        timestamp: TestConstants.TestTimestamp,
      },
      {
        transaction_id: TestConstants.Tx2,
        user_id: TestConstants.UserId1,
        type: TransactionType.Consumption,
        amount: -50,
        currency: Currency.AC,
        description: TestConstants.Consumption,
        timestamp: TestConstants.TestTimestamp2,
      },
    ];

    const mockStorage: CreditStorage = {
      getBalance: vi.fn(),
      saveBalance: vi.fn(),
      getTransactions: vi.fn().mockResolvedValue(mockTransactions),
      addTransaction: vi.fn(),
    };

    const result = await getTransactionsLogic(TestConstants.UserId1, 50, mockStorage);

    expect(result).toEqual(mockTransactions);
    expect(mockStorage.getTransactions).toHaveBeenCalledWith(TestConstants.UserId1, 50);
  });

  it(testName('should cap limit at 100'), async () => {
    const mockStorage: CreditStorage = {
      getBalance: vi.fn(),
      saveBalance: vi.fn(),
      getTransactions: vi.fn().mockResolvedValue([]),
      addTransaction: vi.fn(),
    };

    await getTransactionsLogic(TestConstants.UserId1, 200, mockStorage);

    expect(mockStorage.getTransactions).toHaveBeenCalledWith(TestConstants.UserId1, TestConstants.MaxLimit);
  });

  it(testName('should use provided limit when less than 100'), async () => {
    const mockStorage: CreditStorage = {
      getBalance: vi.fn(),
      saveBalance: vi.fn(),
      getTransactions: vi.fn().mockResolvedValue([]),
      addTransaction: vi.fn(),
    };

    await getTransactionsLogic(TestConstants.UserId1, 25, mockStorage);

    expect(mockStorage.getTransactions).toHaveBeenCalledWith(TestConstants.UserId1, 25);
  });

  it(testName('earnGPLogic: returns validation error when gpAmount is non-positive'), async () => {
    const result = await earnGPLogic(
      {
        userId: TestConstants.UserId1,
        gpAmount: 0,
        description: TestConstants.WinBonus,
      },
      {}
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('GP amount must be greater than 0');
  });

  it(testName('earnGPLogic: returns configuration error when CREDITS_DO is missing'), async () => {
    const result = await earnGPLogic(
      {
        userId: TestConstants.UserId1,
        gpAmount: 10,
        description: TestConstants.WinBonus,
        metadata: {
          [MetadataField.IdempotencyKey]: generateIdempotencyKey(IdempotencyKeyPrefix.Earn),
        },
      },
      {}
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('CREDITS_DO not configured');
  });

  it(testName('earnGPLogic: forwards award to CreditsDO and returns success payload'), async () => {
    let forwardedPath = '';
    let forwardedMethod = '';
    let forwardedBody = '';
    const doStub = {
      fetch: vi.fn(async (request: Request) => {
        forwardedPath = new URL(request.url).pathname;
        forwardedMethod = request.method;
        forwardedBody = await request.text();
        return new Response(
          JSON.stringify({
            success: true,
            transaction_id: 'tx-award-1',
            new_balance: 150,
          }),
          {
            status: HttpStatus.Ok,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }),
    };
    const env = {
      CREDITS_DO: {
        idFromName: vi.fn(() => ({ toString: () => 'credits-id' })),
        get: vi.fn(() => doStub),
      } as unknown as DurableObjectNamespace,
    };
    const idempotencyKey = generateIdempotencyKey(IdempotencyKeyPrefix.Earn);

    const result = await earnGPLogic(
      {
        userId: TestConstants.UserId1,
        gpAmount: 25,
        description: TestConstants.WinBonus,
        metadata: {
          [MetadataField.IdempotencyKey]: idempotencyKey,
        },
      },
      env
    );

    expect(result.success).toBe(true);
    expect(result.transaction_id).toBe('tx-award-1');
    expect(result.new_balance).toBe(150);
    expect(forwardedMethod).toBe(HttpMethod.Post);
    expect(forwardedPath).toBe(CreditsDO.Award);
    const parsedBody = JSON.parse(forwardedBody) as {
      awardId?: string;
      amount?: number;
      description?: string;
    };
    expect(parsedBody.awardId).toBe(idempotencyKey);
    expect(parsedBody.amount).toBe(25);
    expect(parsedBody.description).toBe(TestConstants.WinBonus);
  });
});
