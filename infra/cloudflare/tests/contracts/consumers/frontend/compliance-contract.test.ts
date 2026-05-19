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
    consumer: 'Frontend-Compliance',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('compliance report GET: returns 401 when authentication is missing', async () => {
    const pathSegment = ApiEndpoint.Compliance.Report;

    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a request for compliance report without auth')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
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
          method: HttpMethod.Get,
          headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
        });
        expect(response.status).toBe(HttpStatus.Unauthorized);
        await response.text().catch(() => undefined);
      });
  });

  it('compliance report GET: returns 200 with report shape for admin user', async () => {
    const pathSegment = ApiEndpoint.Compliance.Report;

    await provider
      .addInteraction()
      .given('admin user requests compliance report')
      .uponReceiving('a request for compliance report with admin auth')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestAdminUserId, true)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          reportType: Matchers.string('soc2'),
          startDate: Matchers.date('yyyy-MM-dd', '2026-01-01'),
          endDate: Matchers.date('yyyy-MM-dd', '2026-02-01'),
          summary: Matchers.like({
            totalEvents: Matchers.integer(0),
            warnings: Matchers.integer(0),
          }),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestAdminUserId, true)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as Record<string, unknown>;
        expect(data !== null && typeof data === 'object').toBe(true);
      });
  });

  it('compliance report POST: returns 200 with report shape for admin user', async () => {
    const pathSegment = ApiEndpoint.Compliance.Report;

    await provider
      .addInteraction()
      .given('admin user posts compliance report request')
      .uponReceiving('a POST request for compliance report with admin auth')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestAdminUserId, true)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        });
        builder.jsonBody({ reportType: 'soc2' });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          reportType: Matchers.string('soc2'),
          summary: Matchers.like({
            totalEvents: Matchers.integer(0),
          }),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Post,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestAdminUserId, true)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
            [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
          },
          body: JSON.stringify({ reportType: 'soc2' }),
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as Record<string, unknown>;
        expect(data !== null && typeof data === 'object').toBe(true);
      });
  });
});
