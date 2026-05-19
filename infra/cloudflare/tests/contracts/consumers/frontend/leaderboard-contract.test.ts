import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestLeaderboardApiUrl } from '@tests/helpers/test-helpers';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Leaderboard',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('leaderboard: returns entries for game type', async () => {
    const gameType = 1;
    const pathSegment = `${ApiEndpoint.Leaderboard.Base}/${encodeURIComponent(String(gameType))}`;

    await provider
      .addInteraction()
      .given('leaderboard has entries for game type 1')
      .uponReceiving('a request for leaderboard entries')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          game_type: Matchers.integer(gameType),
          season_id: Matchers.string('current'),
          entries: Matchers.like([]),
          total_entries: Matchers.integer(0),
          last_updated: Matchers.iso8601DateTimeWithMillis('2026-02-05T12:00:00.000Z'),
          ai_only: Matchers.boolean(false),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestLeaderboardApiUrl(gameType, undefined, undefined, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as {
          game_type: number;
          entries: unknown[];
          total_entries: number;
          last_updated: string;
        };
        expect(data.game_type).toBe(gameType);
        expect(Array.isArray(data.entries)).toBe(true);
        expect(typeof data.total_entries).toBe('number');
        expect(typeof data.last_updated).toBe('string');
      });
  });

  it('leaderboard user: returns user rank for game type', async () => {
    const gameType = 1;
    const userId = TestConfig.TestUserId;
    const pathSegment = `${ApiEndpoint.Leaderboard.Base}/${encodeURIComponent(String(gameType))}/user/${encodeURIComponent(userId)}`;

    await provider
      .addInteraction()
      .given('user has leaderboard entry for game type 1')
      .uponReceiving('a request for user leaderboard entry')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          user_id: Matchers.string(userId),
          rank: Matchers.integer(1),
          tier: Matchers.string('bronze'),
          score: Matchers.integer(0),
          wins: Matchers.integer(0),
          losses: Matchers.integer(0),
          games_played: Matchers.integer(0),
          season_id: Matchers.string('current'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestLeaderboardApiUrl(gameType, 'user', userId, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as {
          user_id: string;
          rank: number;
          tier: string;
          score: number;
          wins: number;
          losses: number;
          games_played: number;
          season_id: string;
        };
        expect(data.user_id).toBe(userId);
        expect(typeof data.rank).toBe('number');
        expect(typeof data.tier).toBe('string');
        expect(typeof data.season_id).toBe('string');
      });
  });

  it('leaderboard user: returns 404 when user not found', async () => {
    const gameType = 1;
    const userId = 'nonexistent-user-id';
    const pathSegment = `${ApiEndpoint.Leaderboard.Base}/${encodeURIComponent(String(gameType))}/user/${encodeURIComponent(userId)}`;

    await provider
      .addInteraction()
      .given('user has no leaderboard entry')
      .uponReceiving('a request for nonexistent user leaderboard entry')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.NotFound, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('User not found'),
          user_id: Matchers.string(userId),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestLeaderboardApiUrl(gameType, 'user', userId, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.NotFound);
        const data = (await response.json()) as { error: string; user_id: string };
        expect(data.error).toBe('User not found');
        expect(data.user_id).toBe(userId);
      });
  });

  it('leaderboard nearby: returns above user below for game type', async () => {
    const gameType = 1;
    const userId = TestConfig.TestUserId;
    const pathSegment = `${ApiEndpoint.Leaderboard.Base}/${encodeURIComponent(String(gameType))}/nearby/${encodeURIComponent(userId)}`;

    await provider
      .addInteraction()
      .given('leaderboard has nearby entries for user')
      .uponReceiving('a request for nearby leaderboard entries')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          above: Matchers.like([]),
          user: Matchers.like({
            user_id: Matchers.string(userId),
            rank: Matchers.integer(1),
            tier: Matchers.string('bronze'),
            score: Matchers.integer(0),
            wins: Matchers.integer(0),
            losses: Matchers.integer(0),
            games_played: Matchers.integer(0),
          }),
          below: Matchers.like([]),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestLeaderboardApiUrl(gameType, 'nearby', userId, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as {
          above: unknown[];
          user: { user_id: string; rank: number; tier: string; score: number; wins: number; losses: number; games_played: number };
          below: unknown[];
        };
        expect(Array.isArray(data.above)).toBe(true);
        expect(Array.isArray(data.below)).toBe(true);
        expect(data.user !== null && data.user !== undefined).toBe(true);
        expect(typeof data.user).toBe('object');
        expect(data.user.user_id).toBe(userId);
        expect(typeof data.user.rank).toBe('number');
      });
  });
});
