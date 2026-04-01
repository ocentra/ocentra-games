import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestPlayersApiUrl, createTestToken } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Players',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('players: returns player stats and credits for authenticated user', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = `${ApiEndpoint.Players.Base}/${encodeURIComponent(userId)}`;

    await provider
      .addInteraction()
      .given('user has player stats')
      .uponReceiving('a request for player stats')
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
          credits: Matchers.like({
            gp_balance: Matchers.integer(0),
            ac_balance: Matchers.integer(0),
            total_gp_earned: Matchers.integer(0),
            total_ac_purchased: Matchers.integer(0),
            total_ac_spent: Matchers.integer(0),
          }),
          total_games: Matchers.integer(0),
          wins: Matchers.integer(0),
          losses: Matchers.integer(0),
          win_rate: Matchers.integer(0),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestPlayersApiUrl(userId, undefined, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(userId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as {
          credits: { gp_balance: number; ac_balance: number; total_gp_earned: number; total_ac_purchased: number; total_ac_spent: number };
          total_games?: number;
          wins?: number;
          losses?: number;
          win_rate?: number;
        };
        expect(data.credits).not.toBeNull();
        expect(typeof data.credits.gp_balance).toBe('number');
        expect(typeof data.credits.ac_balance).toBe('number');
      });
  });

  it('players: returns 401 when authentication is missing', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = `${ApiEndpoint.Players.Base}/${encodeURIComponent(userId)}`;

    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a request for player stats without authentication')
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
        const url = buildTestPlayersApiUrl(userId, undefined, baseUrl);
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
});
