import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import type { SetupContextToken } from '@tests/test-setup-core';
import { buildTestApiUrlForEndpoint } from '@tests/helpers/test-helpers';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { CorsOrigin } from '@/constants/cors';
import { HttpHeader, HttpStatus, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';

const log = Logger.instance;
log.register(import.meta.url);

export class CorsTestHelper {
  static async createProductionWorker(origin: string): Promise<TestWorker> {
    if (origin === '*' || origin === CorsOrigin.Wildcard) {
      throw new Error('Test helper: Cannot create production worker with wildcard CORS');
    }

    log.logInfo('[CorsTestHelper] Creating production worker with origin', getStackTrace(), { origin });
    const worker = await getTestWorker({
      ENVIRONMENT: Environment.Production,
      CORS_ORIGIN: origin
    });
    log.logInfo('[CorsTestHelper] Production worker created', getStackTrace(), { hasStop: !!worker.stop });
    return worker;
  }

  static async createDevelopmentWorker(options?: {
    allowedOrigins?: string[];
  }): Promise<TestWorker> {
    log.logInfo('[CorsTestHelper] Creating development worker', getStackTrace(), { allowedOrigins: options?.allowedOrigins });
    const workerConfig: Record<string, string> = {
      ENVIRONMENT: Environment.Development,
      CORS_ORIGIN: CorsOrigin.Wildcard
    };
    if (options?.allowedOrigins && options.allowedOrigins.length > 0) {
      workerConfig.CORS_ALLOWED_ORIGINS = options.allowedOrigins.join(',');
    }
    const worker = await getTestWorker(workerConfig);
    log.logInfo('[CorsTestHelper] Development worker created', getStackTrace(), { hasStop: !!worker.stop });
    return worker;
  }

  static async expectOriginAllowed(
    worker: TestWorker,
    requestOrigin: string,
    expectedAllowedOrigin: string,
    token: SetupContextToken
  ): Promise<void> {
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: requestOrigin }
    }, token);

    const actualOrigin = response.headers.get(HttpHeader.AccessControlAllowOrigin);
    if (actualOrigin !== expectedAllowedOrigin) {
      throw new Error(
        `Expected CORS origin "${expectedAllowedOrigin}", got "${actualOrigin}"` +
        ` (status: ${response.status})`
      );
    }
  }

  static async expectOriginRejected(
    worker: TestWorker,
    requestOrigin: string,
    token: SetupContextToken
  ): Promise<void> {
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {
      headers: { [HttpHeader.Origin]: requestOrigin }
    }, token);

    const allowedOrigin = response.headers.get(HttpHeader.AccessControlAllowOrigin);
    const isRejected =
      response.status >= HttpStatus.BadRequest ||
      !allowedOrigin ||
      allowedOrigin !== requestOrigin;

    if (!isRejected) {
      throw new Error(
        `Expected origin "${requestOrigin}" to be rejected, but it was allowed` +
        ` (status: ${response.status}, allowed-origin: ${allowedOrigin})`
      );
    }
  }
}
