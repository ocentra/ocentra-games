import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestApiUrl } from '@tests/helpers/test-helpers';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-AI-Catalog',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('ai catalog GET: returns 200 with catalog body (version, providers, pricing)', async () => {
    const pathSegment = ApiEndpoint.AI.Catalog;

    await provider
      .addInteraction()
      .given('AI catalog is available')
      .uponReceiving('a request for AI catalog')
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
          version: Matchers.integer(1),
          providers: Matchers.eachLike({
            id: Matchers.string('openai'),
            name: Matchers.string('OpenAI'),
            description: Matchers.string(''),
            website: Matchers.string(''),
            authType: Matchers.string('api_key'),
            category: Matchers.string('cloud_api'),
            supportsStreaming: Matchers.boolean(true),
            supportsModelListing: Matchers.boolean(true),
            configFields: Matchers.eachLike({}),
            defaultModels: Matchers.eachLike({ id: Matchers.string(''), name: Matchers.string(''), contextWindow: Matchers.integer(0) }),
          }),
          pricing: Matchers.like({ 'gpt-4o': { inputPer1k: Matchers.decimal(0.5), outputPer1k: Matchers.decimal(1.5) } }),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { version?: number; providers?: unknown[]; pricing?: Record<string, unknown> };
        expect(typeof data.version).toBe('number');
        expect(Array.isArray(data.providers)).toBe(true);
        expect(data.pricing !== null && typeof data.pricing === 'object').toBe(true);
      });
  });
});
