import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { AIEventType } from '@/constants/ai';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestApiUrlForEndpoint, createTestToken } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-AI',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('ai on_event: returns 200 with action for valid event', async () => {
    const pathSegment = ApiEndpoint.AI.OnEvent;

    await provider
      .addInteraction()
      .given('AI service is available')
      .uponReceiving('a valid AI event request')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          matchId: TestConfig.TestMatchId,
          playerId: TestConfig.TestPlayerId,
          eventType: AIEventType.MatchStart,
          eventData: {},
          currentState: {},
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          action: Matchers.like({
            type: Matchers.string('noop'),
            playerId: TestConfig.TestPlayerId,
            data: Matchers.like({}),
            timestamp: Matchers.iso8601DateTimeWithMillis('2026-02-05T12:00:00.000Z'),
          }),
          chainOfThought: Matchers.eachLike(Matchers.like({})),
          modelMetadata: Matchers.like({}),
          responseTimeMs: Matchers.integer(10),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({
            matchId: TestConfig.TestMatchId,
            playerId: TestConfig.TestPlayerId,
            eventType: AIEventType.MatchStart,
            eventData: {},
            currentState: {},
          }),
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { action: { type: string }; responseTimeMs: number };
        expect(data.action !== null && data.action !== undefined).toBe(true);
        expect(typeof data.action).toBe('object');
        expect(data.action).toHaveProperty('type');
        expect(typeof data.action.type).toBe('string');
        expect(typeof data.responseTimeMs).toBe('number');
      });
  });

  it('ai on_event: returns 401 when authentication is missing', async () => {
    const pathSegment = ApiEndpoint.AI.OnEvent;

    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('an AI event request without authentication')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          matchId: TestConfig.TestMatchId,
          playerId: TestConfig.TestPlayerId,
          eventType: AIEventType.MatchStart,
          eventData: {},
          currentState: {},
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
        const url = buildTestApiUrlForEndpoint(ApiEndpoint.AI.OnEvent, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({
            matchId: TestConfig.TestMatchId,
            playerId: TestConfig.TestPlayerId,
            eventType: AIEventType.MatchStart,
            eventData: {},
            currentState: {},
          }),
        });
        expect(response.status).toBe(HttpStatus.Unauthorized);
        const data = (await response.json()) as { error: string };
        expect(data.error).toBe('Unauthorized');
      });
  });
});
