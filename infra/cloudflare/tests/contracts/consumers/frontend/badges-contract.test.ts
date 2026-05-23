import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { BadgeAction, BadgeId } from '@/constants/badges';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestBadgesApiUrl, createTestToken } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

function badgesPath(userId: string, action?: string): string {
  const base = `${ApiEndpoint.Badges.Base}/${encodeURIComponent(userId)}`;
  return action ? `${base}/${encodeURIComponent(action)}` : base;
}

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Badges',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('badges profile: returns badge profile for authenticated user', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = `${ApiEndpoint.Badges.Base}/${encodeURIComponent(userId)}`;

    await provider
      .addInteraction()
      .given('user has badge profile')
      .uponReceiving('a request for badge profile')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          user_id: userId,
          badges: Matchers.like([]),
          badge_counts: Matchers.like({
            total: Matchers.integer(0),
          }),
          active_badges: Matchers.like([]),
          badge_progress: Matchers.like({}),
          last_updated: Matchers.string('2026-02-05T12:00:00.000Z'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestBadgesApiUrl(userId, undefined, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as {
          user_id: string;
          badges: unknown[];
          badge_counts: { total: number };
          last_updated: string;
        };
        expect(data.user_id).toBe(userId);
        expect(Array.isArray(data.badges)).toBe(true);
        expect(typeof data.badge_counts.total).toBe('number');
        expect(typeof data.last_updated).toBe('string');
      });
  });

  it('badges profile: returns 401 when authentication is missing', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = `${ApiEndpoint.Badges.Base}/${encodeURIComponent(userId)}`;

    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a request for badge profile without authentication')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Unauthorized, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Unauthorized'),
          message: Matchers.string('Authentication required'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestBadgesApiUrl(userId, undefined, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Unauthorized);
        const data = (await response.json()) as { error: string; message: string };
        expect(data.error).toBe('Unauthorized');
      });
  });

  it('badges definitions: returns definitions for authenticated user', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = badgesPath(userId, BadgeAction.Definitions);

    await provider
      .addInteraction()
      .given('user has badge definitions')
      .uponReceiving('a request for badge definitions')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          definitions: Matchers.like([]),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestBadgesApiUrl(userId, BadgeAction.Definitions, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { definitions: unknown[] };
        expect(Array.isArray(data.definitions)).toBe(true);
      });
  });

  it('badges progress: returns progress for authenticated user', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = badgesPath(userId, BadgeAction.Progress);

    await provider
      .addInteraction()
      .given('user has badge progress')
      .uponReceiving('a request for badge progress')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          progress: Matchers.like([]),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestBadgesApiUrl(userId, BadgeAction.Progress, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { progress: unknown[] };
        expect(Array.isArray(data.progress)).toBe(true);
      });
  });

  it('badges active: returns 200 when setting valid active badges', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = badgesPath(userId, BadgeAction.Active);
    const badgeIds: string[] = [];

    await provider
      .addInteraction()
      .given('user has unlocked badges')
      .uponReceiving('a request to set active badges')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ badge_ids: badgeIds });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ success: Matchers.boolean(true) });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestBadgesApiUrl(userId, BadgeAction.Active, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({ badge_ids: badgeIds }),
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { success: boolean };
        expect(data.success).toBe(true);
      });
  });

  it('badges active: returns 400 when more than max active badges', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = badgesPath(userId, BadgeAction.Active);
    const tooMany = Array.from({ length: 6 }, (_, i) => `badge_${i}`);

    await provider
      .addInteraction()
      .given('user requests more than max active badges')
      .uponReceiving('a request to set more than 5 active badges')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ badge_ids: tooMany });
      })
      .willRespondWith(HttpStatus.BadRequest, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Bad Request'),
          message: Matchers.string('Maximum 5 active badges allowed'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestBadgesApiUrl(userId, BadgeAction.Active, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({ badge_ids: tooMany }),
        });
        expect(response.status).toBe(HttpStatus.BadRequest);
        const data = (await response.json()) as { error: string; message: string };
        expect(data.error).toBe('Bad Request');
        expect(data.message).toContain('5');
      });
  });

  it('badges claim: returns 403 for client-authoritative badge unlock', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = badgesPath(userId, BadgeAction.Claim);

    await provider
      .addInteraction()
      .given('user has not unlocked the badge')
      .uponReceiving('a client-authoritative request to claim a badge')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ badge_id: BadgeId.ProBronze });
      })
      .willRespondWith(HttpStatus.Forbidden, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Forbidden'),
          message: Matchers.string('Badge unlocks must be issued by trusted server workflows'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestBadgesApiUrl(userId, BadgeAction.Claim, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({ badge_id: BadgeId.ProBronze }),
        });
        expect(response.status).toBe(HttpStatus.Forbidden);
        const data = (await response.json()) as { error: string; message: string };
        expect(data.error).toBe('Forbidden');
        expect(data.message).toContain('trusted server workflows');
      });
  });

  it('badges track-login: returns 200 with consecutive_days', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = badgesPath(userId, BadgeAction.TrackLogin);

    await provider
      .addInteraction()
      .given('user has login tracking')
      .uponReceiving('a request to track daily login')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          success: Matchers.boolean(true),
          consecutive_days: Matchers.integer(1),
          badges_unlocked: Matchers.like([]),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestBadgesApiUrl(userId, BadgeAction.TrackLogin, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { success: boolean; consecutive_days: number; badges_unlocked: string[] };
        expect(data.success).toBe(true);
        expect(typeof data.consecutive_days).toBe('number');
        expect(Array.isArray(data.badges_unlocked)).toBe(true);
      });
  });

  it('badges claim-daily-rewards: returns 200 with rewards_claimed', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = badgesPath(userId, BadgeAction.ClaimDailyRewards);

    await provider
      .addInteraction()
      .given('user can claim daily rewards')
      .uponReceiving('a request to claim daily rewards')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          success: Matchers.boolean(true),
          rewards_claimed: Matchers.integer(0),
          gp_earned: Matchers.integer(0),
          ac_earned: Matchers.integer(0),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestBadgesApiUrl(userId, BadgeAction.ClaimDailyRewards, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { success: boolean; rewards_claimed: number; gp_earned: number; ac_earned: number };
        expect(data.success).toBe(true);
        expect(typeof data.rewards_claimed).toBe('number');
        expect(typeof data.gp_earned).toBe('number');
        expect(typeof data.ac_earned).toBe('number');
      });
  });
});
