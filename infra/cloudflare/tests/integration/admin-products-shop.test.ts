import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import type { ShopPaymentProvider, ShopProduct } from '@ocentra/endpoint-domain/schemas/shop';

const SHOP_PRODUCTS_PATH = (ApiEndpoint as { Shop?: { Products: string } }).Shop?.Products ?? '/api/v1/shop/products';
const ADMIN_PRODUCTS_PATH = (ApiEndpoint as { Admin?: { Products: string } }).Admin?.Products ?? '/api/v1/admin/products';
const SHOP_PURCHASE_PATH = ApiEndpoint.Shop.Purchase;
const TEST_SEED_PRODUCTS_PATH = ApiEndpoint.Test.SeedProducts;
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders, getValidAdminRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

async function consumeResponse(response: Response): Promise<void> {
  await response.text().catch(() => undefined);
}

async function seedShopProducts(worker: TestWorker): Promise<void> {
  const response = await worker.fetch(`${TestConfig.TestApiUrlPlaceholder}${TEST_SEED_PRODUCTS_PATH}`, {
    method: HttpMethod.Post,
    headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
  });
  expect(response.status).toBe(HttpStatus.Ok);
  await consumeResponse(response);
}

async function getFirstShopProduct(worker: TestWorker): Promise<ShopProduct> {
  const response = await worker.fetch(`${TestConfig.TestApiUrlPlaceholder}${SHOP_PRODUCTS_PATH}`, {
    method: HttpMethod.Get,
    headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
  });
  expect(response.status).toBe(HttpStatus.Ok);
  const data = (await response.json()) as { products?: ShopProduct[] };
  const product = data.products?.find((item) => item.productId && item.productType);
  expect(product).toBeDefined();
  return product!;
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Shop GET products: returns 200 with products array when PRODUCT_KV configured'), async () => {
    await seedShopProducts(worker);
    const url = `${TestConfig.TestApiUrlPlaceholder}${SHOP_PRODUCTS_PATH}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { products?: unknown[] };
    expect(Array.isArray(data.products)).toBe(true);
  });

  it(testName('Shop POST purchase: non-Stripe providers route through provider layer without falling into Stripe'), async () => {
    await seedShopProducts(worker);
    const product = await getFirstShopProduct(worker);
    const providers: ShopPaymentProvider[] = ['paypal', 'razorpay', 'solana'];

    for (const provider of providers) {
      const response = await worker.fetch(`${TestConfig.TestApiUrlPlaceholder}${SHOP_PURCHASE_PATH}`, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(`shop-${provider}-user`),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({
          productId: product.productId,
          productType: product.productType,
          quantity: 1,
          provider,
          returnUrl: `${TestConfig.LocalhostOrigin2}/shop?checkout=success`,
          cancelUrl: `${TestConfig.LocalhostOrigin2}/shop?checkout=cancel`,
        }),
      });
      expect([HttpStatus.Ok, HttpStatus.NotImplemented]).toContain(response.status);
      const data = (await response.json()) as {
        provider?: string;
        status?: string;
        code?: string;
      };
      expect(data.provider).toBe(provider);
      expect(['provider_not_configured', 'failed']).toContain(data.status);
      expect(['provider_not_configured', 'checkout_unavailable']).toContain(data.code);
    }
  });

  it(testName('Shop GET products/:id: returns 404 when product does not exist'), async () => {
    const url = `${TestConfig.TestApiUrlPlaceholder}${SHOP_PRODUCTS_PATH}/no-such-product-999`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.NotFound);
    await response.text().catch(() => undefined);
  });

  it(testName('Admin GET products: returns 401 when auth missing'), async () => {
    const url = `${TestConfig.TestApiUrlPlaceholder}${ADMIN_PRODUCTS_PATH}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Unauthorized);
    await response.text().catch(() => undefined);
  });

  it(testName('Admin GET products: returns 403 when authenticated but not admin'), async () => {
    const url = `${TestConfig.TestApiUrlPlaceholder}${ADMIN_PRODUCTS_PATH}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidRequestHeaders(TestConfig.TestUserId),
    });
    expect(response.status).toBe(HttpStatus.Forbidden);
    await response.text().catch(() => undefined);
  });

  it(testName('Admin GET products: returns 200 with products array when admin'), async () => {
    const url = `${TestConfig.TestApiUrlPlaceholder}${ADMIN_PRODUCTS_PATH}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: getValidAdminRequestHeaders(),
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { products?: unknown[] };
    expect(Array.isArray(data.products)).toBe(true);
  });
});
