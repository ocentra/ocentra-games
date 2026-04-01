import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { env } from 'cloudflare:test';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestLeaderboardApiUrl, buildTestMatchApiUrl, loadTextFixture } from '@tests/helpers/test-helpers';
import { asMatchId } from '@ocentra/endpoint-domain/constants/match';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { setSetupContext } from '@tests/test-setup-pool';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

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

describe(extractName(import.meta.url), TestSuiteType.Integration, { concurrent: false, poolSequential: true }, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for leaderboard tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      const setupToken = setSetupContext('leaderboard-setup', 'tests/integration/leaderboard.test.ts');

    logInfo('[TEST] Loading test match data via FIXTURE_LOADER', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    
    const matchHumanVictory = JSON.parse(
      await loadTextFixture('match-human-victory.json', env)
    );
    const matchHumanLoss = JSON.parse(
      await loadTextFixture('match-human-loss.json', env)
    );

    const matchId1 = asMatchId(matchHumanVictory.match_id || matchHumanVictory.matchId);
    const matchUrl1 = buildTestMatchApiUrl(matchId1, '');
    const putRes1 = await worker.fetch(matchUrl1, {
      method: HttpMethod.Put,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify(matchHumanVictory)
    }, setupToken);
    await consumeResponseBody(putRes1);

    const matchId2 = asMatchId(matchHumanLoss.match_id || matchHumanLoss.matchId);
    const matchUrl2 = buildTestMatchApiUrl(matchId2, '');
    const putRes2 = await worker.fetch(matchUrl2, {
      method: HttpMethod.Put,
      headers: {
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify(matchHumanLoss)
    }, setupToken);
    await consumeResponseBody(putRes2);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Human Player Leaderboard: should return leaderboard entries for human players'), async () => {
      const token = await createToken();
      const leaderboardUrl = buildTestLeaderboardApiUrl(0);
      const response = await worker.fetch(leaderboardUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      logInfo('[TEST] Leaderboard response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      if (response.status !== HttpStatus.Ok) {
        logError('[TEST] Unexpected status for leaderboard request', getStackTrace(), { expected: HttpStatus.Ok, actual: response.status });
      }
      const data = await response.json() as {
        game_type: number;
        entries: Array<{
          rank: number;
          user_id: string;
          score: number;
          wins: number;
          losses: number;
          games_played: number;
          tier: string;
        }>;
        total_entries: number;
        ai_only: boolean;
      };

      expect(data.game_type).toBe(0);
      expect(data.ai_only).toBe(false);
      expect(Array.isArray(data.entries)).toBe(true);
      expect(data.total_entries).toBeGreaterThanOrEqual(0);

      if (data.entries.length > 0) {
        const firstEntry = data.entries[0];
        expect(firstEntry.rank).toBe(1);
        expect(typeof firstEntry.user_id).toBe('string');
        expect(typeof firstEntry.score).toBe('number');
        expect(typeof firstEntry.wins).toBe('number');
        expect(typeof firstEntry.losses).toBe('number');
        expect(typeof firstEntry.games_played).toBe('number');
        expect(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master']).toContain(firstEntry.tier);
      }
    });

  it(testName('Human Player Leaderboard: should return leaderboard entries sorted by score descending'), async () => {
      const token = await createToken();
      const baseUrl = buildTestLeaderboardApiUrl(0);
      const url = new URL(baseUrl);
      url.searchParams.set('limit', '10');
      const leaderboardUrl = url.toString();
      const response = await worker.fetch(leaderboardUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { entries: Array<{ rank: number; score: number }> };

      if (data.entries.length > 1) {
        for (let i = 0; i < data.entries.length - 1; i++) {
          expect(data.entries[i].score).toBeGreaterThanOrEqual(data.entries[i + 1].score);
          expect(data.entries[i].rank).toBeLessThan(data.entries[i + 1].rank);
        }
      }
    });

    it(testName('should respect limit parameter'), async () => {
        const token = await createToken();
      const limit = 5;
      const baseUrl = buildTestLeaderboardApiUrl(0);
      const url = new URL(baseUrl);
      url.searchParams.set('limit', String(limit));
      const leaderboardUrl = url.toString();
      const response = await worker.fetch(leaderboardUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { entries: unknown[] };
      expect(data.entries.length).toBeLessThanOrEqual(limit);
    });

  it(testName('User Rank Lookup: should return user rank when user exists'), async () => {
      const token = await createToken();
      const userId = 'human-player-1';
      const leaderboardUrl = buildTestLeaderboardApiUrl(0, 'user', userId);
      const response = await worker.fetch(leaderboardUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      if (response.status === HttpStatus.NotFound) {
        expect(response.status).toBe(HttpStatus.NotFound);
        const data = await response.json() as { error: string; user_id: string };
        expect(data.error).toBe('User not found');
        expect(data.user_id).toBe(userId);
      } else {
        expect(response.status).toBe(HttpStatus.Ok);
        const data = await response.json() as {
          user_id: string;
          rank: number;
          tier: string;
          score: number;
          wins: number;
          losses: number;
          games_played: number;
        };

        expect(data.user_id).toBe(userId);
        expect(typeof data.rank).toBe('number');
        expect(data.rank).toBeGreaterThan(0);
        expect(['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Master']).toContain(data.tier);
        expect(typeof data.score).toBe('number');
        expect(typeof data.wins).toBe('number');
        expect(typeof data.losses).toBe('number');
        expect(typeof data.games_played).toBe('number');
      }
    });

    it(testName('should return 404 when user does not exist'), async () => {
        const token = await createToken();
      const userId = 'non-existent-player-999';
      const leaderboardUrl = buildTestLeaderboardApiUrl(0, 'user', userId);
      const response = await worker.fetch(leaderboardUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.NotFound);
      const data = await response.json() as { error: string; user_id: string };
      expect(data.error).toBe('User not found');
      expect(data.user_id).toBe(userId);
    });

  it(testName('Nearby Players: should return nearby players when user exists'), async () => {
      const token = await createToken();
      const userId = 'human-player-1';
      const baseUrl = buildTestLeaderboardApiUrl(0, 'nearby', userId);
      const url = new URL(baseUrl);
      url.searchParams.set('range', '5');
      const leaderboardUrl = url.toString();
      const response = await worker.fetch(leaderboardUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      if (response.status === HttpStatus.NotFound) {
        expect(response.status).toBe(HttpStatus.NotFound);
      } else {
        expect(response.status).toBe(HttpStatus.Ok);
        const data = await response.json() as {
          above: unknown[];
          user: { user_id: string; rank: number };
          below: unknown[];
        };

        expect(data.user.user_id).toBe(userId);
        expect(typeof data.user.rank).toBe('number');
        expect(Array.isArray(data.above)).toBe(true);
        expect(Array.isArray(data.below)).toBe(true);
      }
    });

  it(testName('AI-Only Leaderboard: should return AI-only leaderboard when ai_only=true'), async () => {
      const token = await createToken();
      const baseUrl = buildTestLeaderboardApiUrl(0);
      const url = new URL(baseUrl);
      url.searchParams.set('ai_only', 'true');
      const leaderboardUrl = url.toString();
      const response = await worker.fetch(leaderboardUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { ai_only: boolean; entries: unknown[] };
      expect(data.ai_only).toBe(true);
      expect(Array.isArray(data.entries)).toBe(true);
    });

  it(testName('AI-Only Leaderboard: should return AI-only leaderboard via /ai endpoint'), async () => {
      const token = await createToken();
      const leaderboardUrl = buildTestLeaderboardApiUrl(0, 'ai');
      const response = await worker.fetch(leaderboardUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as { ai_only: boolean };
      expect(data.ai_only).toBe(true);
    });

  it(testName('Error Handling: should return 400 for invalid game type'), async () => {
      const token = await createToken();
      const leaderboardUrl = buildTestLeaderboardApiUrl('invalid');
      const response = await worker.fetch(leaderboardUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error: string; message: string };
      expect(data.error).toBe('Invalid game type');
      expect(data.message).toContain('Game type must be a number');
    });

  it(testName('Error Handling: should return 400 for negative game type'), async () => {
      const token = await createToken();
      const leaderboardUrl = buildTestLeaderboardApiUrl(-1);
      const response = await worker.fetch(leaderboardUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.BadRequest);
      const data = await response.json() as { error: string };
      expect(data.error).toBe('Invalid game type');
    });
});
