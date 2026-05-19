import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { PactV4, Matchers } from '@pact-foundation/pact';
import * as path from 'path';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';

const pactDir = path.resolve(process.cwd(), 'tests/contracts/pacts');

describe(extractName(import.meta.url), TestSuiteType.Contract, () => {
  const provider = new PactV4({
    consumer: 'Frontend-Shop',
    provider: 'Cloudflare Worker',
    dir: pactDir,
    logLevel: 'info',
  });

  it('shop products list: returns 200 with products array', async () => {
    const pathSegment = ApiEndpoint.Shop.Products;

    await provider
      .addInteraction()
      .given('shop has zero or more products')
      .uponReceiving('a request for shop products list')
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
          products: Matchers.eachLike(
            {
              productId: Matchers.string('prod-1'),
              productType: Matchers.string('AC_CREDITS'),
              displayName: Matchers.string('100 AC'),
              description: Matchers.string('Starter refill'),
              shopTab: Matchers.string('Treasury'),
              badge: Matchers.string('Starter'),
              benefits: Matchers.eachLike(Matchers.string('AI analysis fuel'), 1),
              entitlementKind: Matchers.string('credits'),
              availability: Matchers.string('live'),
              acAmount: Matchers.integer(100),
              unitPriceCents: Matchers.integer(199),
              currency: Matchers.string('usd'),
              active: Matchers.boolean(true),
            },
            1
          ),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = buildApiUrl(ApiEndpoint.Shop.Products, { baseUrl });
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
        });
        expect(response.status).toBe(HttpStatus.Ok);
        const data = (await response.json()) as { products: unknown[] };
        expect(Array.isArray(data.products)).toBe(true);
      });
  });

  it('shop product by id: returns 404 when product not found', async () => {
    const productId = 'no-such-product';
    const pathSegment = `${ApiEndpoint.Shop.Products}/${productId}`;

    await provider
      .addInteraction()
      .given('product does not exist')
      .uponReceiving('a request for single product by id')
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
          error: Matchers.string('Product not found'),
        });
      })
      .executeTest(async (mockServer) => {
        const baseUrl = typeof mockServer.url === 'string' ? mockServer.url : String(mockServer.url);
        const url = `${baseUrl}${ApiEndpoint.Shop.Products}/${productId}`;
        const response = await fetch(url, {
          method: HttpMethod.Get,
          headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
        });
        expect(response.status).toBe(HttpStatus.NotFound);
        await response.text().catch(() => undefined);
      });
  });
});
