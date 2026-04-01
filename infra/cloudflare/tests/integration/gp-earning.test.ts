import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken, type SetupContextToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
  buildTestMatchApiUrl,
  buildCreditsApiUrl,
  getValidRequestHeaders,
  generateTestUserId,
  generateTestMatchId,
} from '@tests/helpers/test-helpers';

import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, WebSocketProtocol, ConnectionValue, WebSocketCloseCode } from '@ocentra/endpoint-domain/constants/http';
import { TransactionType, Currency, CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';
import { TestValues } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

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

async function finalizeMatchViaWebSocket(
  worker: TestWorker,
  token: SetupContextToken,
  matchId: MatchId,
  userId: string,
  body: { scores?: number[]; winner?: string }
): Promise<void> {
  const wsUrl = buildTestMatchApiUrl(matchId, '');
  const upgradeResponse = await worker.fetch(wsUrl, {
    headers: {
      ...getValidRequestHeaders(userId),
      [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
      [HttpHeader.Connection]: ConnectionValue.Upgrade,
    },
  }, token);

  expect(upgradeResponse.status).toBe(HttpStatus.SwitchingProtocols);
  if (!upgradeResponse.webSocket) {
    throw new Error('Expected WebSocket in upgrade response');
  }

  upgradeResponse.webSocket.accept();
  upgradeResponse.webSocket.send(JSON.stringify({
    type: 'finalize',
    matchId,
    ...body,
  }));
  await new Promise(resolve => setTimeout(resolve, 300));
  try {
    upgradeResponse.webSocket.close(WebSocketCloseCode.NormalClosure, TestValues.WebSocketCloseReasonDone);
  } catch {
    void 0;
  }
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for GP earning tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    worker = await getTestWorker();
    logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('GP Earning from Match Finalization: should award participation GP when match is finalized'), async () => {
      const token = await createToken();
      const player1Id = generateTestUserId('gp-earner-1');
      const player2Id = generateTestUserId('gp-earner-2');
      const matchId = generateTestMatchId('gp-test-winner');
      logInfo('[TEST] Testing GP earning from match finalization', getStackTrace(), { matchId, player1Id, player2Id }, LOG_TEST_OPERATIONS);

      const createUrl = buildTestMatchApiUrl(matchId, '/create');
      const createRes = await worker.fetch(createUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(player1Id),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          gameName: 'CLAIM',
          gameType: 0,
          seed: 12345
        })
      }, token);
      await consumeResponseBody(createRes);

      const joinUrl1 = buildTestMatchApiUrl(matchId, '/join');
      const joinResponse1 = await worker.fetch(joinUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(player1Id),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          playerPubkey: player1Id
        })
      }, token);
      logInfo('[TEST] Player1 join response', getStackTrace(), { status: joinResponse1.status, matchId }, LOG_TEST_OPERATIONS);
      await consumeResponseBody(joinResponse1);

      const joinUrl2 = buildTestMatchApiUrl(matchId, '/join');
      const joinResponse2 = await worker.fetch(joinUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(player2Id),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          playerPubkey: player2Id
        })
      }, token);
      logInfo('[TEST] Player2 join response', getStackTrace(), { status: joinResponse2.status, matchId }, LOG_TEST_OPERATIONS);
      await consumeResponseBody(joinResponse2);

      const balanceUrl1 = buildCreditsApiUrl(player1Id, CreditAction.Balance);
      const initialBalance1 = await worker.fetch(balanceUrl1,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(player1Id)
        },
        token
      );
      const initialBalanceData1 = await initialBalance1.json() as { gp_balance: number };
      const initialGP1 = initialBalanceData1.gp_balance;
      logInfo('[TEST] Initial GP balance retrieved', getStackTrace(), { player1Id, initialGP1 }, LOG_TEST_OPERATIONS);

      await finalizeMatchViaWebSocket(worker, token, matchId, player1Id, {
        scores: [150, 100],
        winner: player1Id,
      });
      logInfo('[TEST] Match finalization sent via WebSocket', getStackTrace(), { matchId }, LOG_TEST_OPERATIONS);

      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalBalanceUrl1 = buildCreditsApiUrl(player1Id, CreditAction.Balance);
      const finalBalance1 = await worker.fetch(finalBalanceUrl1,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(player1Id)
        },
        token
      );
      const finalBalanceData1 = await finalBalance1.json() as { gp_balance: number; total_gp_earned: number };
      logInfo('[TEST] Final GP balance retrieved', getStackTrace(), { player1Id, finalGP: finalBalanceData1.gp_balance, totalEarned: finalBalanceData1.total_gp_earned }, LOG_TEST_OPERATIONS);
      
      expect(finalBalanceData1.gp_balance).toBe(initialGP1 + 25);
      expect(finalBalanceData1.total_gp_earned).toBeGreaterThanOrEqual(25);
      if (finalBalanceData1.gp_balance !== initialGP1 + 25) {
        logError('[TEST] GP balance mismatch', getStackTrace(), { expected: initialGP1 + 25, actual: finalBalanceData1.gp_balance });
      }
    });

  it(testName('GP Earning from Match Finalization: should award equal participation GP to all participants'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('gp-test-all');
      const player1Id = generateTestUserId('gp-test-player1');
      const player2Id = generateTestUserId('gp-test-player2');

      const createUrl = buildTestMatchApiUrl(matchId, '/create');
      const createRes = await worker.fetch(createUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(player1Id),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          gameName: 'CLAIM',
          gameType: 0,
          seed: 67890
        })
      }, token);
      await consumeResponseBody(createRes);

      const joinUrl1 = buildTestMatchApiUrl(matchId, '/join');
      const joinRes1 = await worker.fetch(joinUrl1, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(player1Id),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          playerPubkey: player1Id
        })
      }, token);
      await consumeResponseBody(joinRes1);

      const joinUrl2 = buildTestMatchApiUrl(matchId, '/join');
      const joinRes2 = await worker.fetch(joinUrl2, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(player2Id),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          playerPubkey: player2Id
        })
      }, token);
      await consumeResponseBody(joinRes2);

      const initialBalance1 = await worker.fetch(
        buildCreditsApiUrl(player1Id, CreditAction.Balance),
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(player1Id)
        },
        token
      );
      const initialBalanceData1 = await initialBalance1.json() as { gp_balance: number };
      const initialGP1 = initialBalanceData1.gp_balance;

      const balanceUrl2 = buildCreditsApiUrl(player2Id, CreditAction.Balance);
      const initialBalance2 = await worker.fetch(balanceUrl2,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(player2Id)
        },
        token
      );
      const initialBalanceData2 = await initialBalance2.json() as { gp_balance: number };
      const initialGP2 = initialBalanceData2.gp_balance;

      await finalizeMatchViaWebSocket(worker, token, matchId, player1Id, {
        scores: [180, 120],
        winner: player1Id,
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalBalance1 = await worker.fetch(
        buildCreditsApiUrl(player1Id, CreditAction.Balance),
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(player1Id)
        },
        token
      );
      const finalBalanceData1 = await finalBalance1.json() as { gp_balance: number };

      const finalBalanceUrl2 = buildCreditsApiUrl(player2Id, CreditAction.Balance);
      const finalBalance2 = await worker.fetch(finalBalanceUrl2,
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(player2Id)
        },
        token
      );
      const finalBalanceData2 = await finalBalance2.json() as { gp_balance: number };

      expect(finalBalanceData1.gp_balance).toBe(initialGP1 + 25);
      expect(finalBalanceData2.gp_balance).toBe(initialGP2 + 25);
    });

  it(testName('GP Earning from Match Finalization: should create transaction records for GP earned'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('gp-test-transaction');
      const playerId = generateTestUserId('gp-test-player-tx');

      const createUrl = buildTestMatchApiUrl(matchId, '/create');
      const createRes = await worker.fetch(createUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          gameName: 'CLAIM',
          gameType: 0,
          seed: 11111
        })
      }, token);
      await consumeResponseBody(createRes);

      const joinUrl = buildTestMatchApiUrl(matchId, '/join');
      const joinRes = await worker.fetch(joinUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          playerPubkey: playerId
        })
      }, token);
      await consumeResponseBody(joinRes);

      await finalizeMatchViaWebSocket(worker, token, matchId, playerId, {
        scores: [200],
        winner: playerId,
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      const transactionsResponse = await worker.fetch(
        buildCreditsApiUrl(playerId, CreditAction.Transactions),
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(playerId)
        },
        token
      );

      expect(transactionsResponse.status).toBe(HttpStatus.Ok);
      const transactions = await transactionsResponse.json() as {
        transactions: Array<{
          type: string;
          currency: string;
          amount: number;
          description: string;
          metadata?: { match_id?: string };
        }>;
      };

      const gpTransactions = transactions.transactions.filter(t => 
        t.type === TransactionType.Earned && t.currency === Currency.GP
      );
      expect(gpTransactions.length).toBeGreaterThan(0);

      const matchTransaction = gpTransactions.find(t => t.metadata?.match_id === matchId);
      if (!matchTransaction) {
        throw new Error(`Expected transaction for match ${matchId} but found none`);
      }
      expect(matchTransaction.amount).toBe(25);
      expect(matchTransaction.description).toContain(matchId);
    });

  it(testName('GP Earning from Match Finalization: should handle match finalization without scores gracefully'), async () => {
      const token = await createToken();
      const matchId = generateTestMatchId('gp-test-no-scores');
      const playerId = generateTestUserId('gp-test-player-noscores');
      const initialBalanceResponse = await worker.fetch(
        buildCreditsApiUrl(playerId, CreditAction.Balance),
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(playerId)
        },
        token
      );
      expect(initialBalanceResponse.status).toBe(HttpStatus.Ok);
      const initialBalanceData = await initialBalanceResponse.json() as { gp_balance: number };

      const createUrl = buildTestMatchApiUrl(matchId, '/create');
      const createRes = await worker.fetch(createUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          gameName: 'CLAIM',
          gameType: 0,
          seed: 22222
        })
      }, token);
      expect(createRes.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(createRes);

      const joinUrl = buildTestMatchApiUrl(matchId, '/join');
      const joinRes = await worker.fetch(joinUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(playerId),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson
        },
        body: JSON.stringify({
          playerPubkey: playerId
        })
      }, token);
      expect(joinRes.status).toBe(HttpStatus.Ok);
      await consumeResponseBody(joinRes);

      await finalizeMatchViaWebSocket(worker, token, matchId, playerId, {});
      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalBalanceResponse = await worker.fetch(
        buildCreditsApiUrl(playerId, CreditAction.Balance),
        {
          method: HttpMethod.Get,
          headers: getValidRequestHeaders(playerId)
        },
        token
      );
      expect(finalBalanceResponse.status).toBe(HttpStatus.Ok);
      const finalBalanceData = await finalBalanceResponse.json() as { gp_balance: number };
      expect(finalBalanceData.gp_balance).toBeGreaterThanOrEqual(initialBalanceData.gp_balance);
    });
});
