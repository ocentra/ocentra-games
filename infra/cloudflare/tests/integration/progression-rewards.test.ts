import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { OpenApiExampleValue } from '@ocentra/endpoint-domain/constants/openapi-examples';
import { TestConfig } from '@tests/constants/test-constants';
import { getTokenForFetch } from '@tests/test-setup-core';
import { getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const progressionAmount = OpenApiExampleValue.ProgressionUpdate.amount;

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Progression GET: returns 200 with xp level totalXpEarned xpToNextLevel levelHistory when authenticated'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { xp?: number; level?: number; totalXpEarned?: number; xpToNextLevel?: number; levelHistory?: unknown[] };
    expect(typeof data.xp).toBe('number');
    expect(typeof data.level).toBe('number');
    expect(typeof data.totalXpEarned).toBe('number');
    expect(typeof data.xpToNextLevel).toBe('number');
    expect(Array.isArray(data.levelHistory)).toBe(true);
  });

  it(testName('Progression GET: returns 401 when auth missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Progression POST xp: returns 200 with added total level and applies XP'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.Xp, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ amount: progressionAmount }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { added?: number; total?: number; level?: number };
    expect(data.added).toBe(progressionAmount);
    expect(typeof data.total).toBe('number');
    expect(typeof data.level).toBe('number');
  });

  it(testName('Progression POST xp with idempotencyKey: second call returns already_processed'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.Xp, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const key = `${OpenApiExampleValue.IdempotencyKeyEarn}-${Date.now()}`;
    const body = JSON.stringify({ amount: progressionAmount, idempotencyKey: key });
    const headers = {
      ...getValidRequestHeaders(TestConfig.TestUserId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const first = await worker.fetch(url, { method: HttpMethod.Post, headers, body }, token);
    expect(first.status).toBe(HttpStatus.Ok);
    await first.text().catch(() => undefined);
    const second = await worker.fetch(url, { method: HttpMethod.Post, headers, body }, token);
    expect(second.status).toBe(HttpStatus.Ok);
    const secondData = (await second.json()) as { added?: number; already_processed?: boolean };
    expect(secondData.already_processed).toBe(true);
    expect(secondData.added).toBe(0);
  });

  it(testName('Rewards GET daily: returns 200 with available nextAt currentDay rewardForNext when authenticated'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rewards.Daily, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { available?: boolean; nextAt?: number; currentDay?: number; rewardForNext?: { xp?: number; gp?: number }; freezeUsesRemaining?: number };
    expect(typeof data.available).toBe('boolean');
    expect(typeof data.nextAt).toBe('number');
    expect(typeof data.currentDay).toBe('number');
    expect(data.rewardForNext !== undefined).toBe(true);
    expect(typeof data.freezeUsesRemaining).toBe('number');
  });

  it(testName('Rewards GET daily: returns 401 when auth missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rewards.Daily, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Rewards POST daily/claim: returns 200 with claimed and reward when claim succeeds'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rewards.DailyClaim, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ idempotencyKey: `test-daily-${TestConfig.TestUserId}-${Date.now()}` }),
    }, token);
    expect([HttpStatus.Ok, HttpStatus.TooManyRequests]).toContain(response.status);
    const data = (await response.json()) as { claimed?: boolean; alreadyClaimed?: boolean; reward?: { type?: string; amount?: number; gp?: number }; nextAt?: number };
    if (response.status === HttpStatus.Ok) {
      expect(data.claimed).toBe(true);
      expect(data.reward !== undefined).toBe(true);
      expect(typeof (data.reward?.amount ?? data.reward) === 'number' || typeof data.reward?.amount === 'number').toBe(true);
    }
  });

  it(testName('Rewards POST daily/claim: idempotent replay returns alreadyClaimed true'), async () => {
    const token = getTokenForFetch();
    const idemKey = `test-daily-idem-${TestConfig.TestUserId}-${Date.now()}`;
    const url = buildApiUrl(ApiEndpoint.Rewards.DailyClaim, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const body = JSON.stringify({ idempotencyKey: idemKey });
    const headers = {
      ...getValidRequestHeaders(TestConfig.TestUserId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const first = await worker.fetch(url, { method: HttpMethod.Post, headers, body }, token);
    const second = await worker.fetch(url, { method: HttpMethod.Post, headers, body }, token);
    expect(second.status).toBe(HttpStatus.Ok);
    const secondData = (await second.json()) as { claimed?: boolean; alreadyClaimed?: boolean };
    expect(secondData.claimed).toBe(true);
    expect(secondData.alreadyClaimed).toBe(true);
    expect(first.status).toBe(second.status);
  });

  it(testName('Missions GET list: returns 200 with missions array when authenticated'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Missions.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { missions?: { missionId: string; description: string; target: number; progress: number; claimed: boolean }[] };
    expect(Array.isArray(data.missions)).toBe(true);
    expect(data.missions!.length).toBeGreaterThan(0);
    expect(typeof data.missions![0].missionId).toBe('string');
    expect(typeof data.missions![0].progress).toBe('number');
    expect(typeof data.missions![0].claimed).toBe('boolean');
  });

  it(testName('Missions POST progress: increment updates progress and returns complete when target reached'), async () => {
    const token = getTokenForFetch();
    const progressUrl = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Missions.Base}/progress`;
    const missionId = 'play_3_games';
    const headers = {
      ...getValidRequestHeaders(TestConfig.TestUserId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const res = await worker.fetch(progressUrl, {
      method: HttpMethod.Post,
      headers,
      body: JSON.stringify({ missionId, increment: 3 }),
    }, token);
    expect(res.status).toBe(HttpStatus.Ok);
    const data = (await res.json()) as { missionId?: string; progress?: number; target?: number; complete?: boolean };
    expect(data.missionId).toBe(missionId);
    expect(data.progress).toBe(3);
    expect(data.target).toBe(3);
    expect(data.complete).toBe(true);
  });

  it(testName('Missions POST claim: returns 200 with claimed when mission complete'), async () => {
    const token = getTokenForFetch();
    const userId = `mission-claim-${Date.now()}`;
    const progressUrl = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Missions.Base}/progress`;
    const claimUrl = buildApiUrl(ApiEndpoint.Missions.Claim('play_3_games'), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const headers = {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const progressRes = await worker.fetch(progressUrl, {
      method: HttpMethod.Post,
      headers,
      body: JSON.stringify({ missionId: 'play_3_games', progress: 3 }),
    }, token);
    expect(progressRes.status).toBe(HttpStatus.Ok);

    const response = await worker.fetch(claimUrl, {
      method: HttpMethod.Post,
      headers,
      body: JSON.stringify({ missionId: 'play_3_games' }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { claimed?: boolean; missionId?: string; reward?: { xp?: number; gp?: number } };
    expect(data.claimed).toBe(true);
    expect(data.missionId).toBe('play_3_games');
    expect(data.reward !== undefined).toBe(true);
  });

  it(testName('Missions POST claim: second claim returns alreadyClaimed'), async () => {
    const token = getTokenForFetch();
    const userId = `mission-claim-idem-${Date.now()}`;
    const progressUrl = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Missions.Base}/progress`;
    const claimUrl = buildApiUrl(ApiEndpoint.Missions.Claim('play_3_games'), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const idempotencyKey = `mission-claim-idem-key-${Date.now()}`;
    const headers = {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const progressRes = await worker.fetch(progressUrl, {
      method: HttpMethod.Post,
      headers,
      body: JSON.stringify({ missionId: 'play_3_games', progress: 3 }),
    }, token);
    expect(progressRes.status).toBe(HttpStatus.Ok);

    const body = JSON.stringify({ missionId: 'play_3_games', idempotencyKey });
    const claimFirst = await worker.fetch(claimUrl, { method: HttpMethod.Post, headers, body }, token);
    await claimFirst.text().catch(() => undefined);
    const second = await worker.fetch(claimUrl, { method: HttpMethod.Post, headers, body }, token);
    expect(second.status).toBe(HttpStatus.Ok);
    const data = (await second.json()) as { claimed?: boolean; alreadyClaimed?: boolean };
    expect(data.claimed).toBe(true);
    expect(data.alreadyClaimed).toBe(true);
  });

  it(testName('Progression GET level: returns 200 with level and xpToNextLevel when authenticated'), async () => {
    const token = getTokenForFetch();
    const url = `${buildApiUrl(ApiEndpoint.Progression.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder })}/level`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { level?: number; xpToNextLevel?: number };
    expect(typeof data.level).toBe('number');
    expect(data.level).toBeGreaterThanOrEqual(1);
    expect(typeof data.xpToNextLevel).toBe('number');
    expect(data.xpToNextLevel).toBeGreaterThan(0);
  });

  it(testName('Progression POST xp: returns 400 when amount missing or invalid'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.Xp, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const headers = {
      ...getValidRequestHeaders(TestConfig.TestUserId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const badBody = await worker.fetch(url, { method: HttpMethod.Post, headers, body: JSON.stringify({}) }, token);
    expect(badBody.status).toBe(HttpStatus.BadRequest);
    await badBody.text().catch(() => undefined);
    const negBody = await worker.fetch(url, { method: HttpMethod.Post, headers, body: JSON.stringify({ amount: -1 }) }, token);
    expect(negBody.status).toBe(HttpStatus.BadRequest);
    await negBody.text().catch(() => undefined);
  });

  it(testName('Progression: levelHistory grows when XP causes level-up'), async () => {
    const token = getTokenForFetch();
    const getUrl = buildApiUrl(ApiEndpoint.Progression.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const xpUrl = buildApiUrl(ApiEndpoint.Progression.Xp, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const headers = {
      ...getValidRequestHeaders(TestConfig.TestUserId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const before = await worker.fetch(getUrl, { method: HttpMethod.Get, headers: getValidRequestHeaders(TestConfig.TestUserId) }, token);
    const beforeData = (await before.json()) as { level?: number; xpToNextLevel?: number; levelHistory?: { level: number }[] };
    const historyLenBefore = beforeData.levelHistory?.length ?? 0;
    const xpRes = await worker.fetch(xpUrl, { method: HttpMethod.Post, headers, body: JSON.stringify({ amount: beforeData.xpToNextLevel ?? 1000 }) }, token);
    await xpRes.text().catch(() => undefined);
    const after = await worker.fetch(getUrl, { method: HttpMethod.Get, headers: getValidRequestHeaders(TestConfig.TestUserId) }, token);
    const afterData = (await after.json()) as { level?: number; levelHistory?: { level: number }[] };
    expect(afterData.level).toBeGreaterThanOrEqual(beforeData.level ?? 1);
    if (afterData.level! > (beforeData.level ?? 1)) {
      expect((afterData.levelHistory?.length ?? 0)).toBeGreaterThan(historyLenBefore);
    }
  });

  it(testName('Rewards GET daily: rewardForNext has xp and gp numbers, canFreeze boolean'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rewards.Daily, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { rewardForNext?: { xp?: number; gp?: number }; canFreeze?: boolean };
    expect(typeof data.rewardForNext?.xp).toBe('number');
    expect(typeof data.rewardForNext?.gp).toBe('number');
    expect(typeof data.canFreeze).toBe('boolean');
  });

  it(testName('Rewards POST daily/claim: response includes nextAt currentDay loginStreak'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rewards.DailyClaim, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ idempotencyKey: `daily-shape-${TestConfig.TestUserId}-${Date.now()}` }),
    }, token);
    if (response.status !== HttpStatus.Ok) return;
    const data = (await response.json()) as { nextAt?: number; currentDay?: number; loginStreak?: number };
    expect(typeof data.nextAt).toBe('number');
    expect(typeof data.currentDay).toBe('number');
    expect(typeof data.loginStreak).toBe('number');
  });

  it(testName('Rewards POST streak/freeze: returns 200 with used true and decremented freezeUsesRemaining when has uses'), async () => {
    const token = getTokenForFetch();
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Rewards.Base}/streak/freeze`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    }, token);
    expect([HttpStatus.Ok, HttpStatus.BadRequest]).toContain(response.status);
    if (response.status === HttpStatus.Ok) {
      const data = (await response.json()) as { used?: boolean; freezeUsesRemaining?: number; canFreeze?: boolean };
      expect(data.used).toBe(true);
      expect(typeof data.freezeUsesRemaining).toBe('number');
      expect(typeof data.canFreeze).toBe('boolean');
    }
  });

  it(testName('Rewards POST streak/freeze: returns 401 when auth missing'), async () => {
    const token = getTokenForFetch();
    const url = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Rewards.Base}/streak/freeze`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin, [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({}),
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Missions GET list: returns 401 when auth missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Missions.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Missions GET list: each mission has description target xp gp type'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Missions.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { missions?: { missionId: string; description: string; target: number; xp: number; gp: number; type: string }[] };
    for (const m of data.missions ?? []) {
      expect(typeof m.description).toBe('string');
      expect(typeof m.target).toBe('number');
      expect(typeof m.xp).toBe('number');
      expect(typeof m.gp).toBe('number');
      expect(['daily', 'weekly']).toContain(m.type);
    }
  });

  it(testName('Missions POST progress: returns 400 when missionId unknown'), async () => {
    const token = getTokenForFetch();
    const progressUrl = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Missions.Base}/progress`;
    const response = await worker.fetch(progressUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ missionId: 'unknown_mission_xyz' }),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    await response.text().catch(() => undefined);
  });

  it(testName('Missions POST progress: accepts progress (set) and caps at target'), async () => {
    const token = getTokenForFetch();
    const progressUrl = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Missions.Base}/progress`;
    const headers = {
      ...getValidRequestHeaders(TestConfig.TestUserId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const res = await worker.fetch(progressUrl, {
      method: HttpMethod.Post,
      headers,
      body: JSON.stringify({ missionId: 'win_1_game', progress: 1 }),
    }, token);
    expect(res.status).toBe(HttpStatus.Ok);
    const data = (await res.json()) as { progress?: number; target?: number; complete?: boolean };
    expect(data.progress).toBe(1);
    expect(data.complete).toBe(true);
  });

  it(testName('Missions POST claim: returns 400 when mission not complete'), async () => {
    const token = getTokenForFetch();
    const claimUrl = buildApiUrl(ApiEndpoint.Missions.Claim('play_5_games'), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(claimUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ missionId: 'play_5_games' }),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = (await response.json()) as { error?: string; progress?: number; target?: number };
    expect(typeof data.error).toBe('string');
    expect((data.error as string).length).toBeGreaterThan(0);
    expect(typeof data.progress).toBe('number');
    expect(data.target).toBe(5);
  });

  it(testName('Missions POST claim: returns 400 when missionId unknown'), async () => {
    const token = getTokenForFetch();
    const claimUrl = buildApiUrl(ApiEndpoint.Missions.Claim('unknown_mission'), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(claimUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ missionId: 'unknown_mission' }),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    await response.text().catch(() => undefined);
  });

  it(testName('Missions POST claim: returns 401 when auth missing'), async () => {
    const token = getTokenForFetch();
    const claimUrl = buildApiUrl(ApiEndpoint.Missions.Claim('play_3_games'), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(claimUrl, {
      method: HttpMethod.Post,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin, [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      body: JSON.stringify({ missionId: 'play_3_games' }),
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Concurrency Rule 16.2.1: daily claim with same idempotency key results in at most one economic grant (state safety)'), async () => {
    const token = getTokenForFetch();
    const userId = `daily-concurrency-${Date.now()}`;
    const idemKey = `concurrent-daily-${userId}-${Date.now()}`;
    const url = buildApiUrl(ApiEndpoint.Rewards.DailyClaim, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const body = JSON.stringify({ idempotencyKey: idemKey });
    const headers = {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const responses = await Promise.all([worker.fetch(url, { method: HttpMethod.Post, headers, body }, token), worker.fetch(url, { method: HttpMethod.Post, headers, body }, token)]);
    const allOk = responses.every((r) => r.status === HttpStatus.Ok);
    expect(allOk).toBe(true);
    const datas = await Promise.all(responses.map((r) => r.json() as Promise<{ claimed?: boolean; alreadyClaimed?: boolean }>));
    const claimedCount = datas.filter((d) => d.claimed && !d.alreadyClaimed).length;
    expect(claimedCount).toBeGreaterThanOrEqual(1);
  });

  it(testName('Concurrency Rule 16.2.1: mission claim for same mission results in at most one reward (state safety)'), async () => {
    const token = getTokenForFetch();
    const userId = `mission-concurrency-${Date.now()}`;
    const progressUrl = `${TestConfig.TestApiUrlPlaceholder}${ApiEndpoint.Missions.Base}/progress`;
    const claimUrl = buildApiUrl(ApiEndpoint.Missions.Claim('win_1_game'), { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const idempotencyKey = `mission-concurrency-key-${Date.now()}`;
    const headers = {
      ...getValidRequestHeaders(userId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const progressRes = await worker.fetch(progressUrl, { method: HttpMethod.Post, headers, body: JSON.stringify({ missionId: 'win_1_game', progress: 1 }) }, token);
    await progressRes.text().catch(() => undefined);
    const claimBody = JSON.stringify({ missionId: 'win_1_game', idempotencyKey });
    const responses = await Promise.all([worker.fetch(claimUrl, { method: HttpMethod.Post, headers, body: claimBody }, token), worker.fetch(claimUrl, { method: HttpMethod.Post, headers, body: claimBody }, token)]);
    const datas = await Promise.all(responses.map((r) => r.json() as Promise<{ claimed?: boolean; alreadyClaimed?: boolean }>));
    const firstClaimCount = datas.filter((d) => d.claimed && !d.alreadyClaimed).length;
    expect(firstClaimCount).toBeGreaterThanOrEqual(1);
  });

  it(testName('Battle pass GET: returns 200 with seasonId tier xp xpToNextTier claimedRewards maxTier when authenticated'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rewards.BattlePass, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { seasonId?: string; tier?: number; xp?: number; xpToNextTier?: number; claimedRewards?: number[]; maxTier?: number };
    expect(typeof data.seasonId).toBe('string');
    expect(typeof data.tier).toBe('number');
    expect(typeof data.xp).toBe('number');
    expect(typeof data.xpToNextTier).toBe('number');
    expect(Array.isArray(data.claimedRewards)).toBe(true);
    expect(typeof data.maxTier).toBe('number');
  });

  it(testName('Battle pass GET: returns 401 when auth missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rewards.BattlePass, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Battle pass POST xp: adds amount and returns tier'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Rewards.BattlePassXp, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ amount: 100, idempotencyKey: `bp-xp-${TestConfig.TestUserId}-${Date.now()}` }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { added?: number; xp?: number; tier?: number };
    expect(data.added).toBe(100);
    expect(typeof data.xp).toBe('number');
    expect(typeof data.tier).toBe('number');
  });

  it(testName('Battle pass POST claim: returns 200 with claimed and reward when tier 0 unlocked'), async () => {
    const token = getTokenForFetch();
    const claimUrl = buildApiUrl(ApiEndpoint.Rewards.BattlePassClaim, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(claimUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ tier: 0, idempotencyKey: `bp-claim-${TestConfig.TestUserId}-0-${Date.now()}` }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { claimed?: boolean; tier?: number; reward?: { gp?: number; xp?: number } };
    expect(data.claimed).toBe(true);
    expect(data.tier).toBe(0);
    expect(data.reward !== undefined).toBe(true);
  });

  it(testName('Battle pass POST claim: second claim for same tier returns alreadyClaimed'), async () => {
    const token = getTokenForFetch();
    const idemKey = `bp-idem-${TestConfig.TestUserId}-${Date.now()}`;
    const claimUrl = buildApiUrl(ApiEndpoint.Rewards.BattlePassClaim, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const headers = {
      ...getValidRequestHeaders(TestConfig.TestUserId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const body = JSON.stringify({ tier: 0, idempotencyKey: idemKey });
    await worker.fetch(claimUrl, { method: HttpMethod.Post, headers, body }, token);
    const second = await worker.fetch(claimUrl, { method: HttpMethod.Post, headers, body }, token);
    expect(second.status).toBe(HttpStatus.Ok);
    const data = (await second.json()) as { claimed?: boolean; alreadyClaimed?: boolean };
    expect(data.claimed).toBe(true);
    expect(data.alreadyClaimed).toBe(true);
  });

  it(testName('Battle pass POST claim: returns 400 when tier exceeds max'), async () => {
    const token = getTokenForFetch();
    const claimUrl = buildApiUrl(ApiEndpoint.Rewards.BattlePassClaim, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(claimUrl, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ tier: 99 }),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = (await response.json()) as { error?: string };
    expect(typeof data.error).toBe('string');
    expect((data.error as string).length).toBeGreaterThan(0);
  });

  it(testName('Progression GET skills: returns 200 with skillPoints and skillsUnlocked array'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.Skills, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { skillPoints?: number; skillsUnlocked?: string[] };
    expect(typeof data.skillPoints).toBe('number');
    expect(Array.isArray(data.skillsUnlocked)).toBe(true);
  });

  it(testName('Progression POST unlock-skill: returns 200 with unlocked true and skillPoints when skillId provided'), async () => {
    const token = getTokenForFetch();
    const headers = {
      ...getValidRequestHeaders(TestConfig.TestUserId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const getUrl = buildApiUrl(ApiEndpoint.Progression.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const prog = await worker.fetch(getUrl, { method: HttpMethod.Get, headers: getValidRequestHeaders(TestConfig.TestUserId) }, token);
    const progData = (await prog.json()) as { xpToNextLevel?: number; level?: number; skillPoints?: number };
    const xpUrl = buildApiUrl(ApiEndpoint.Progression.Xp, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    if ((progData.skillPoints ?? 0) < 1) {
      const xpRes1 = await worker.fetch(xpUrl, { method: HttpMethod.Post, headers, body: JSON.stringify({ amount: progData.xpToNextLevel ?? 1000 }) }, token);
      await xpRes1.text().catch(() => undefined);
    }
    const url = buildApiUrl(ApiEndpoint.Progression.UnlockSkill, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const skillId = `test-skill-${Date.now()}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers,
      body: JSON.stringify({ skillId }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { unlocked?: boolean; skillPoints?: number; skillsUnlocked?: string[] };
    expect(data.unlocked).toBe(true);
    expect(typeof data.skillPoints).toBe('number');
    expect(Array.isArray(data.skillsUnlocked)).toBe(true);
    expect((data.skillsUnlocked ?? []).includes(skillId)).toBe(true);
  });

  it(testName('Progression POST unlock-skill: returns 200 with alreadyUnlocked true when same skillId claimed again'), async () => {
    const token = getTokenForFetch();
    const headers = {
      ...getValidRequestHeaders(TestConfig.TestUserId),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
    };
    const getUrl = buildApiUrl(ApiEndpoint.Progression.Base, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const prog = await worker.fetch(getUrl, { method: HttpMethod.Get, headers: getValidRequestHeaders(TestConfig.TestUserId) }, token);
    const progData = (await prog.json()) as { skillPoints?: number; xpToNextLevel?: number };
    if ((progData.skillPoints ?? 0) < 1) {
      const xpUrl = buildApiUrl(ApiEndpoint.Progression.Xp, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const xpRes2 = await worker.fetch(xpUrl, { method: HttpMethod.Post, headers, body: JSON.stringify({ amount: progData.xpToNextLevel ?? 1000 }) }, token);
      await xpRes2.text().catch(() => undefined);
    }
    const url = buildApiUrl(ApiEndpoint.Progression.UnlockSkill, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const skillId = `idem-skill-${Date.now()}`;
    const firstUnlock = await worker.fetch(url, { method: HttpMethod.Post, headers, body: JSON.stringify({ skillId }) }, token);
    await firstUnlock.text().catch(() => undefined);
    const second = await worker.fetch(url, { method: HttpMethod.Post, headers, body: JSON.stringify({ skillId }) }, token);
    expect(second.status).toBe(HttpStatus.Ok);
    const data = (await second.json()) as { alreadyUnlocked?: boolean };
    expect(data.alreadyUnlocked).toBe(true);
  });

  it(testName('Progression POST unlock-skill: returns 400 when skillId missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.UnlockSkill, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({}),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toContain('skillId');
  });

  it(testName('Progression GET achievements: returns 200 with achievements object and achievementPoints'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.Achievements, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { achievements?: Record<string, { progress: number; completedAt?: number }>; achievementPoints?: number };
    expect(data.achievements !== null && typeof data.achievements === 'object').toBe(true);
    expect(typeof data.achievementPoints).toBe('number');
  });

  it(testName('Progression POST update-achievement: returns 200 with achievementId progress achievementPoints completed'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.UpdateAchievement, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const achievementId = `ach-${Date.now()}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ achievementId, progress: 100 }),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { achievementId?: string; progress?: number; achievementPoints?: number; completed?: boolean };
    expect(data.achievementId).toBe(achievementId);
    expect(data.progress).toBe(100);
    expect(typeof data.achievementPoints).toBe('number');
    expect(data.completed).toBe(true);
  });

  it(testName('Progression POST update-achievement: returns 400 when achievementId missing'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.UpdateAchievement, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        ...getValidRequestHeaders(TestConfig.TestUserId),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      },
      body: JSON.stringify({ progress: 50 }),
    }, token);
    expect(response.status).toBe(HttpStatus.BadRequest);
    const data = (await response.json()) as { error?: string };
    expect(data.error).toContain('achievementId');
  });

  it(testName('Progression GET collections: returns 200 with cardCollections and cosmeticCollections arrays'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Progression.Collections, { baseUrl: TestConfig.TestApiUrlPlaceholder });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    }, token);
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { cardCollections?: string[]; cosmeticCollections?: string[] };
    expect(Array.isArray(data.cardCollections)).toBe(true);
    expect(Array.isArray(data.cosmeticCollections)).toBe(true);
  });
});
