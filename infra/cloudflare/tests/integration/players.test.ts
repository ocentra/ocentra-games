import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { env } from 'cloudflare:test';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestPlayersApiUrl, buildTestMatchApiUrl, getValidRequestHeaders, generateTestUserId, loadTextFixture } from '@tests/helpers/test-helpers';
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
  const testUserId = 'human-player-1';

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for player analytics tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      const setupToken = setSetupContext('players-setup', 'tests/integration/players.test.ts');

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
        ...getValidRequestHeaders(testUserId),
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
        ...getValidRequestHeaders(testUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify(matchHumanLoss)
    }, setupToken);
    await consumeResponseBody(putRes2);

    const matchProgressionEarly = JSON.parse(
      await loadTextFixture('match-human-progression-early.json', env)
    );
    const matchProgressionLate = JSON.parse(
      await loadTextFixture('match-human-progression-late.json', env)
    );

    const matchId3 = asMatchId(matchProgressionEarly.match_id || matchProgressionEarly.matchId);
    const matchUrl3 = buildTestMatchApiUrl(matchId3, '');
    const putRes3 = await worker.fetch(matchUrl3, {
      method: HttpMethod.Put,
      headers: {
        ...getValidRequestHeaders(testUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify(matchProgressionEarly)
    }, setupToken);
    await consumeResponseBody(putRes3);

    const matchId4 = asMatchId(matchProgressionLate.match_id || matchProgressionLate.matchId);
    const matchUrl4 = buildTestMatchApiUrl(matchId4, '');
    const putRes4 = await worker.fetch(matchUrl4, {
      method: HttpMethod.Put,
      headers: {
        ...getValidRequestHeaders(testUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: JSON.stringify(matchProgressionLate)
    }, setupToken);
    await consumeResponseBody(putRes4);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Player Stats: should return player statistics'), async () => {
      const token = await createToken();
      const statsUrl = buildTestPlayersApiUrl(testUserId, 'stats');
      const response = await worker.fetch(statsUrl, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(testUserId),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      logInfo('[TEST] Player stats response', getStackTrace(), { status: response.status, userId: testUserId }, LOG_TEST_RESPONSE_DETAILS);
      expect(response.status).toBe(HttpStatus.Ok);
      if (response.status !== HttpStatus.Ok) {
        logError('[TEST] Unexpected status for player stats', getStackTrace(), { expected: HttpStatus.Ok, actual: response.status, userId: testUserId });
      }
      const data = await response.json() as {
        user_id: string;
        total_games: number;
        total_wins: number;
        total_losses: number;
        win_rate: number;
        average_score: number;
        current_streak: number;
        best_streak: number;
        games_by_type: Record<string, unknown>;
        performance_trend: unknown[];
        skill_progression: {
          starting_win_rate: number;
          current_win_rate: number;
          improvement: number;
        };
        confidence_metrics: {
          recent_performance: number;
          consistency: number;
          improvement_rate: number;
          readiness_score: number;
        };
      };

      expect(data.user_id).toBe(testUserId);
      if (data.user_id !== testUserId) {
        logError('[TEST] Player stats user ID mismatch', getStackTrace(), { expected: testUserId, actual: data.user_id });
      }
      expect(typeof data.total_games).toBe('number');
      expect(data.total_games).toBeGreaterThanOrEqual(0);
      expect(typeof data.total_wins).toBe('number');
      expect(typeof data.total_losses).toBe('number');
      expect(typeof data.win_rate).toBe('number');
      expect(data.win_rate).toBeGreaterThanOrEqual(0);
      expect(data.win_rate).toBeLessThanOrEqual(100);
      expect(typeof data.average_score).toBe('number');
      expect(typeof data.current_streak).toBe('number');
      expect(typeof data.best_streak).toBe('number');
      expect(typeof data.games_by_type).toBe('object');
      expect(Array.isArray(data.performance_trend)).toBe(true);
      expect(typeof data.skill_progression).toBe('object');
      expect(typeof data.skill_progression.improvement).toBe('number');
      expect(typeof data.confidence_metrics).toBe('object');
      expect(typeof data.confidence_metrics.readiness_score).toBe('number');
      expect(data.confidence_metrics.readiness_score).toBeGreaterThanOrEqual(0);
      expect(data.confidence_metrics.readiness_score).toBeLessThanOrEqual(100);
    });

  it(testName('Player Stats: should calculate win rate correctly'), async () => {
      const token = await createToken();
      const statsUrl = buildTestPlayersApiUrl(testUserId, 'stats');
      const response = await worker.fetch(statsUrl, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(testUserId),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        total_games: number;
        total_wins: number;
        win_rate: number;
      };

      if (data.total_games > 0) {
        const expectedWinRate = (data.total_wins / data.total_games) * 100;
        expect(Math.abs(data.win_rate - expectedWinRate)).toBeLessThan(0.1);
      }
    });

  it(testName('Player Stats: should filter stats by game type'), async () => {
      const token = await createToken();
      const baseUrl = buildTestPlayersApiUrl(testUserId, 'stats');
      const url = new URL(baseUrl);
      url.searchParams.set('game_type', '0');
      const statsUrl = url.toString();
      const response = await worker.fetch(statsUrl, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(testUserId),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        games_by_type: Record<string, { games: number }>;
      };

      expect(typeof data.games_by_type).toBe('object');
    });

  it(testName('Learning Progress: should return learning progress data'), async () => {
      const token = await createToken();
      const learningUrl = buildTestPlayersApiUrl(testUserId, 'learning');
      const response = await worker.fetch(learningUrl, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(testUserId),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        user_id: string;
        total_learning_games: number;
        skill_level: string;
        areas_for_improvement: string[];
        strengths: string[];
        recommended_practice: Array<{
          game_type: number;
          reason: string;
          priority: string;
        }>;
        milestones: Array<{
          milestone: string;
          achieved: boolean;
          progress: number;
          target: number;
        }>;
      };

      expect(data.user_id).toBe(testUserId);
      expect(typeof data.total_learning_games).toBe('number');
      expect(['beginner', 'intermediate', 'advanced', 'expert']).toContain(data.skill_level);
      expect(Array.isArray(data.areas_for_improvement)).toBe(true);
      expect(Array.isArray(data.strengths)).toBe(true);
      expect(Array.isArray(data.recommended_practice)).toBe(true);
      expect(Array.isArray(data.milestones)).toBe(true);

      for (const milestone of data.milestones) {
        expect(typeof milestone.milestone).toBe('string');
        expect(typeof milestone.achieved).toBe('boolean');
        expect(typeof milestone.progress).toBe('number');
        expect(milestone.progress).toBeGreaterThanOrEqual(0);
        expect(milestone.progress).toBeLessThanOrEqual(100);
        expect(typeof milestone.target).toBe('number');
      }
    });

  it(testName('Learning Progress: should provide actionable recommendations'), async () => {
      const token = await createToken();
      const learningUrl = buildTestPlayersApiUrl(testUserId, 'learning');
      const response = await worker.fetch(learningUrl, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(testUserId),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        recommended_practice: Array<{
          game_type: number;
          reason: string;
          priority: string;
        }>;
      };

      for (const practice of data.recommended_practice) {
        expect(typeof practice.game_type).toBe('number');
        expect(typeof practice.reason).toBe('string');
        expect(practice.reason.length).toBeGreaterThan(0);
        expect(['high', 'medium', 'low']).toContain(practice.priority);
      }
    });

  it(testName('Performance Report: should return performance report for all time'), async () => {
      const token = await createToken();
      const baseUrl = buildTestPlayersApiUrl(testUserId, 'report');
      const url = new URL(baseUrl);
      url.searchParams.set('period', 'all_time');
      const reportUrl = url.toString();
      const response = await worker.fetch(reportUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(testUserId),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        user_id: string;
        period: string;
        summary: {
          games_played: number;
          wins: number;
          losses: number;
          win_rate: number;
          average_score: number;
        };
        trends: {
          win_rate_trend: string;
          score_trend: string;
          consistency_trend: string;
        };
        insights: string[];
        recommendations: string[];
        graph_data: {
          dates: string[];
          win_rates: number[];
          average_scores: number[];
          games_played: number[];
        };
      };

      expect(data.user_id).toBe(testUserId);
      expect(data.period).toBe('all_time');
      expect(typeof data.summary).toBe('object');
      expect(typeof data.summary.games_played).toBe('number');
      expect(typeof data.summary.win_rate).toBe('number');
      expect(typeof data.trends).toBe('object');
      expect(['improving', 'declining', 'stable']).toContain(data.trends.win_rate_trend);
      expect(Array.isArray(data.insights)).toBe(true);
      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(typeof data.graph_data).toBe('object');
      expect(Array.isArray(data.graph_data.dates)).toBe(true);
      expect(Array.isArray(data.graph_data.win_rates)).toBe(true);
      expect(data.graph_data.dates.length).toBe(data.graph_data.win_rates.length);
    });

  it(testName('Performance Report: should return performance report for different periods'), async () => {
      const token = await createToken();
      const periods: Array<'daily' | 'weekly' | 'monthly' | 'all_time'> = ['daily', 'weekly', 'monthly', 'all_time'];

      for (const period of periods) {
        const baseUrl = buildTestPlayersApiUrl(testUserId, 'report');
        const url = new URL(baseUrl);
        url.searchParams.set('period', period);
        const reportUrl = url.toString();
        const response = await worker.fetch(reportUrl, {
            method: HttpMethod.Get,
            headers: {
              ...getValidRequestHeaders(testUserId),
              [HttpHeader.Origin]: TestConfig.LocalhostOrigin
            }
          },
          token
        );

        expect(response.status).toBe(HttpStatus.Ok);
        const data = await response.json() as { period: string };
        expect(data.period).toBe(period);
      }
    });

  it(testName('Performance Report: should include graph data for visualization'), async () => {
      const token = await createToken();
      const reportUrl = buildTestPlayersApiUrl(testUserId, 'report');
      const response = await worker.fetch(reportUrl, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(testUserId),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        graph_data: {
          dates: string[];
          win_rates: number[];
          average_scores: number[];
          games_played: number[];
        };
      };

      expect(Array.isArray(data.graph_data.dates)).toBe(true);
      expect(Array.isArray(data.graph_data.win_rates)).toBe(true);
      expect(Array.isArray(data.graph_data.average_scores)).toBe(true);
      expect(Array.isArray(data.graph_data.games_played)).toBe(true);
      
      const length = data.graph_data.dates.length;
      expect(data.graph_data.win_rates.length).toBe(length);
      expect(data.graph_data.average_scores.length).toBe(length);
      expect(data.graph_data.games_played.length).toBe(length);
    });

  it(testName('Skill Progression: should track skill improvement over time'), async () => {
      const token = await createToken();
      const statsUrl = buildTestPlayersApiUrl(testUserId, 'stats');
      const response = await worker.fetch(statsUrl, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(testUserId),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        skill_progression: {
          starting_win_rate: number;
          current_win_rate: number;
          improvement: number;
          games_to_improve: number;
        };
      };

      expect(typeof data.skill_progression.starting_win_rate).toBe('number');
      expect(typeof data.skill_progression.current_win_rate).toBe('number');
      expect(typeof data.skill_progression.improvement).toBe('number');
      expect(typeof data.skill_progression.games_to_improve).toBe('number');
    });

  it(testName('Confidence Metrics: should calculate readiness score for real money games'), async () => {
      const token = await createToken();
      const statsUrl = buildTestPlayersApiUrl(testUserId, 'stats');
      const response = await worker.fetch(statsUrl, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(testUserId),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Ok);
      const data = await response.json() as {
        confidence_metrics: {
          recent_performance: number;
          consistency: number;
          improvement_rate: number;
          readiness_score: number;
        };
      };

      expect(data.confidence_metrics.readiness_score).toBeGreaterThanOrEqual(0);
      expect(data.confidence_metrics.readiness_score).toBeLessThanOrEqual(100);
      expect(typeof data.confidence_metrics.recent_performance).toBe('number');
      expect(typeof data.confidence_metrics.consistency).toBe('number');
      expect(typeof data.confidence_metrics.improvement_rate).toBe('number');
    });

  it(testName('Authorization: should require authentication'), async () => {
      const token = await createToken();
      const statsUrl = buildTestPlayersApiUrl(testUserId, 'stats');
      const response = await worker.fetch(statsUrl, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Unauthorized);
      await response.text().catch(() => undefined);
    });

  it(testName('Authorization: should only allow users to access their own data'), async () => {
      const token = await createToken();
      const otherUserId = generateTestUserId('other-user');
      const statsUrl = buildTestPlayersApiUrl(testUserId, 'stats');
      const response = await worker.fetch(statsUrl, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(otherUserId),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.Forbidden);
      const data = await response.json() as { error: string; message: string };
      expect(data.error).toBe('Forbidden');
      expect(data.message).toContain('own player data');
    });

  it(testName('Error Handling: should return 404 for unknown action'), async () => {
      const token = await createToken();
      const unknownActionUrl = buildTestPlayersApiUrl(testUserId, 'unknown-action');
      const response = await worker.fetch(unknownActionUrl, {
          method: HttpMethod.Get,
          headers: {
            ...getValidRequestHeaders(testUserId),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin
          }
        },
        token
      );

      expect(response.status).toBe(HttpStatus.NotFound);
      const data = await response.json() as { error: string; message: string };
      expect(data.error).toBe('Not Found');
      expect(data.message).toContain('Unknown action');
    });
});
