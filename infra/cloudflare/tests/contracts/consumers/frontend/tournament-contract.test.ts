import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestApiUrl, createTestToken } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Tournament',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  const tournamentId = 'contract-tournament-1';

  it('tournament get bracket by id: returns 200 with bracket or tournament data', async () => {
    const pathSegment = `${ApiEndpoint.Tournament.ById(tournamentId)}/bracket`;

    await provider
      .addInteraction()
      .given('tournament exists')
      .uponReceiving('a request for tournament bracket by id')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody(
          Matchers.like({
            tournamentId: Matchers.string(tournamentId),
            rounds: Matchers.eachLike({ round: Matchers.integer(1), matches: Matchers.eachLike({}) }),
          })
        );
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as Record<string, unknown>;
        expect(data !== null && typeof data === 'object').toBe(true);
      });
  });

  it('tournament get without id: returns 400', async () => {
    const pathSegment = ApiEndpoint.Tournament.Base;

    await provider
      .addInteraction()
      .given('request has no tournament id')
      .uponReceiving('a request for tournament list or base without id')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.BadRequest, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ error: Matchers.string('Tournament ID required') });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
        });
        expect(response.status).toBe(HttpStatus.BadRequest);
        await response.text().catch(() => undefined);
      });
  });

  it('tournament post register: returns 200 or 400 for authenticated or unauthenticated', async () => {
    const pathSegment = `${ApiEndpoint.Tournament.ById(tournamentId)}/register`;

    await provider
      .addInteraction()
      .given('tournament exists and accepts registration')
      .uponReceiving('a request to register for tournament')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        });
        builder.jsonBody({});
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody(Matchers.like({ registered: Matchers.boolean(true) }));
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({}),
        });
        expect([HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.NotFound]).toContain(response.status);
      });
  });

  it('tournament post start: returns 403 for non-admin scheduling mutation', async () => {
    const pathSegment = ApiEndpoint.Tournament.Start(tournamentId);

    await provider
      .addInteraction()
      .given('user is authenticated but not an admin')
      .uponReceiving('a non-admin tournament start request')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        });
        builder.jsonBody({});
      })
      .willRespondWith(HttpStatus.Forbidden, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Forbidden: Admin required'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({}),
        });
        expect(response.status).toBe(HttpStatus.Forbidden);
        const body = (await response.json()) as { error?: string };
        expect(body.error).toBe('Forbidden: Admin required');
      });
  });

  it('tournament post result: returns 403 for non-admin result mutation', async () => {
    const pathSegment = ApiEndpoint.Tournament.Result(tournamentId);

    await provider
      .addInteraction()
      .given('user is authenticated but not an admin')
      .uponReceiving('a non-admin tournament result request')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        });
        builder.jsonBody({
          matchId: 'match-1',
          winnerId: TestConfig.TestUserId,
        });
      })
      .willRespondWith(HttpStatus.Forbidden, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Forbidden: Admin required'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({
            matchId: 'match-1',
            winnerId: TestConfig.TestUserId,
          }),
        });
        expect(response.status).toBe(HttpStatus.Forbidden);
        const body = (await response.json()) as { error?: string };
        expect(body.error).toBe('Forbidden: Admin required');
      });
  });
});
