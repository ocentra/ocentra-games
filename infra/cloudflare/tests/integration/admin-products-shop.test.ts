import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';

const SHOP_PRODUCTS_PATH = (ApiEndpoint as { Shop?: { Products: string } }).Shop?.Products ?? '/api/v1/shop/products';
const ADMIN_PRODUCTS_PATH = (ApiEndpoint as { Admin?: { Products: string } }).Admin?.Products ?? '/api/v1/admin/products';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders, getValidAdminRequestHeaders } from '@tests/helpers/test-helpers';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

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
    const url = `${TestConfig.TestApiUrlPlaceholder}${SHOP_PRODUCTS_PATH}`;
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    });
    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { products?: unknown[] };
    expect(Array.isArray(data.products)).toBe(true);
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
