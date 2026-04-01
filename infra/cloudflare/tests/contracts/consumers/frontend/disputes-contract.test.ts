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
    consumer: 'Frontend-Disputes',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('disputes POST create: returns 200/201 or 400/401 with body shape', async () => {
    const pathSegment = ApiEndpoint.Disputes.Base;

    await provider
      .addInteraction()
      .given('user is authenticated')
      .uponReceiving('a request to create a dispute')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        });
        builder.jsonBody({
          matchId: Matchers.string('00000000-0000-4000-8000-000000000001'),
          reason: Matchers.string('test reason'),
          category: Matchers.string('other'),
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          disputeId: Matchers.string('disp-1'),
          matchId: Matchers.string('00000000-0000-4000-8000-000000000001'),
          status: Matchers.string('open'),
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
          body: JSON.stringify({ matchId: '00000000-0000-4000-8000-000000000001', reason: 'test', category: 'other' }),
        });
        expect([HttpStatus.Ok, HttpStatus.Created, HttpStatus.BadRequest, HttpStatus.Unauthorized]).toContain(response.status);
        const data = (await response.json()) as { error?: string; disputeId?: string };
        if (response.ok) {
          expect(typeof data.disputeId === 'string' || data.disputeId === undefined).toBe(true);
        } else {
          expect(typeof data.error === 'string' || data.error === undefined).toBe(true);
        }
      });
  });

  it('disputes POST create: returns 401 when authentication is missing', async () => {
    const pathSegment = ApiEndpoint.Disputes.Base;

    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a request to create dispute without auth')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        });
        builder.jsonBody({ matchId: '00000000-0000-4000-8000-000000000001', reason: 'test', category: 'other' });
      })
      .willRespondWith(HttpStatus.Unauthorized, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({ error: Matchers.string('Unauthorized') });
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
          body: JSON.stringify({ matchId: '00000000-0000-4000-8000-000000000001', reason: 'test', category: 'other' }),
        });
        expect(response.status).toBe(HttpStatus.Unauthorized);
        await response.text().catch(() => undefined);
      });
  });
});
