import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { InventoryDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildTestApiUrl, createTestToken } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Inventory',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('inventory by user: returns 200 with items array for authenticated user', async () => {
    const userId = TestConfig.TestUserId;
    const pathSegment = ApiEndpoint.Inventory.ByUser(userId);

    await provider
      .addInteraction()
      .given('user has inventory')
      .uponReceiving('a request for inventory by user')
      .withRequest(HttpMethod.Get, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        });
      })
      .willRespondWith(HttpStatus.Ok, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          items: Matchers.eachLike({
            itemId: Matchers.string('item-1'),
            quantity: Matchers.integer(1),
          }),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildTestApiUrl(pathSegment, baseUrl);
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: {
            [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
            [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { items?: unknown[] };
        expect(data !== null && typeof data === 'object').toBe(true);
      });
  });

  it('inventory: returns 401 when authentication is missing', async () => {
    const pathSegment = ApiEndpoint.Inventory.ByUser(TestConfig.TestUserId);

    await provider
      .addInteraction()
      .given('no authentication')
      .uponReceiving('a request for inventory without auth')
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

  it('inventory add-item: returns 403 for client-authoritative inventory mint', async () => {
    const pathSegment = `${ApiEndpoint.Inventory.ByUser(TestConfig.TestUserId)}/${InventoryDOSegment.AddItem}`;

    await provider
      .addInteraction()
      .given('user cannot directly mint inventory items')
      .uponReceiving('a direct inventory add-item mutation')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          itemId: 'premium-card-back',
          type: 'cosmetic',
          count: 10,
        });
      })
      .willRespondWith(HttpStatus.Forbidden, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Forbidden'),
          message: Matchers.string('Inventory items must be issued by trusted server workflows'),
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
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({
            itemId: 'premium-card-back',
            type: 'cosmetic',
            count: 10,
          }),
        });
        expect(response.status).toBe(HttpStatus.Forbidden);
        const body = (await response.json()) as { message?: string };
        expect(body.message).toBe('Inventory items must be issued by trusted server workflows');
      });
  });

  it('inventory remove-item: returns 403 for client-authoritative inventory removal', async () => {
    const pathSegment = `${ApiEndpoint.Inventory.ByUser(TestConfig.TestUserId)}/${InventoryDOSegment.RemoveItem}`;

    await provider
      .addInteraction()
      .given('user cannot directly remove inventory items')
      .uponReceiving('a direct inventory remove-item mutation')
      .withRequest(HttpMethod.Post, pathSegment, (builder) => {
        builder.headers({
          [HttpHeader.Authorization]: formatBearerToken(createTestToken(TestConfig.TestUserId)),
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          itemId: 'premium-card-back',
        });
      })
      .willRespondWith(HttpStatus.Forbidden, (builder) => {
        builder.headers({
          [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
        });
        builder.jsonBody({
          error: Matchers.string('Forbidden'),
          message: Matchers.string('Inventory item removal must be issued by trusted server workflows'),
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
            [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
          },
          body: JSON.stringify({
            itemId: 'premium-card-back',
          }),
        });
        expect(response.status).toBe(HttpStatus.Forbidden);
        const body = (await response.json()) as { message?: string };
        expect(body.message).toBe('Inventory item removal must be issued by trusted server workflows');
      });
  });
});
