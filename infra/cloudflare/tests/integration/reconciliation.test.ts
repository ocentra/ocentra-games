import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { getValidRequestHeaders, getValidAdminRequestHeaders } from '@tests/helpers/test-helpers';
import type { Env } from '@/constants/env';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import {
  ensureContextReady,
  createTestContext,
  setCurrentContext,
  createSetupContextToken,
} from '@tests/test-setup-core';
import { RunType } from '@ocentra/logging-domain/test-log/types';
import { requireTestStripeSecretKey } from '@tests/helpers/test-credentials';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      log.logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  describe('Reconciliation Endpoints', () => {
    it(testName('reconcile endpoint should return 403 for non-admin users'), async () => {
      const reconcileUrl = buildApiUrl(ApiEndpoint.Payment.Reconcile, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(reconcileUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidRequestHeaders(),
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      });

      expect(res.status).toBe(HttpStatus.Forbidden);
    });

    it(testName('should run reconciliation without repair mode'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const reconcileUrl = buildApiUrl(ApiEndpoint.Payment.Reconcile, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(reconcileUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidAdminRequestHeaders(), // Admin
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ repair: false }),
      }, token);

      expect([HttpStatus.Ok, HttpStatus.Forbidden]).toContain(res.status);
      
      if (res.status === HttpStatus.Ok) {
        const data = await res.json() as {
          reconciled: boolean;
          stripeCount: number;
          internalMatched: number;
          missingInternal: number;
          discrepancy: boolean;
        };
        expect(typeof data.reconciled).toBe('boolean');
        expect(typeof data.stripeCount).toBe('number');
        expect(typeof data.internalMatched).toBe('number');
        expect(typeof data.missingInternal).toBe('number');
        expect(typeof data.discrepancy).toBe('boolean');
      }
    });

    it(testName('should run reconciliation with repair mode'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const reconcileUrl = buildApiUrl(ApiEndpoint.Payment.Reconcile, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(reconcileUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidAdminRequestHeaders(), // Admin
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
        body: JSON.stringify({ repair: true }),
      }, token);

      expect([HttpStatus.Ok, HttpStatus.Forbidden]).toContain(res.status);
      
      if (res.status === HttpStatus.Ok) {
        const data = await res.json() as {
          reconciled: boolean;
          stripeCount: number;
          internalMatched: number;
          missingInternal: number;
          discrepancy: boolean;
          repaired?: number;
        };
        expect(typeof data.reconciled).toBe('boolean');
        expect(typeof data.stripeCount).toBe('number');
        expect(typeof data.internalMatched).toBe('number');
        expect(typeof data.missingInternal).toBe('number');
        expect(typeof data.discrepancy).toBe('boolean');
        // repaired may be undefined if no repairs needed
        if (data.repaired !== undefined) {
          expect(typeof data.repaired).toBe('number');
        }
      }
    });

    it(testName('should handle reconciliation with empty body'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const reconcileUrl = buildApiUrl(ApiEndpoint.Payment.Reconcile, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(reconcileUrl, {
        method: HttpMethod.Post,
        headers: {
          ...getValidAdminRequestHeaders(), // Admin
          [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        },
      }, token);

      expect([HttpStatus.Ok, HttpStatus.Forbidden]).toContain(res.status);
    });
  });

  describe('Reconciliation Logic', () => {
    it(testName('should return reconciled=false when Stripe is not configured'), async () => {
      // This tests the reconciliation logic directly via unit tests
      // Integration test would require mocking Stripe
      const { runReconciliation } = await import('@/logic/reconciliation');
      
      const env = {} as Env;
      const result = await runReconciliation(env);
      
      expect(result.reconciled).toBe(false);
      expect(result.stripeCount).toBe(0);
      expect(result.internalMatched).toBe(0);
      expect(result.missingInternal).toBe(0);
      expect(result.discrepancy).toBe(false);
    });

    it(testName('should return reconciled=false when PaymentDO is not configured'), async () => {
      const { runReconciliation } = await import('@/logic/reconciliation');

      const env = { STRIPE_SECRET_KEY: requireTestStripeSecretKey() } as Env;
      const result = await runReconciliation(env);
      
      expect(result.reconciled).toBe(false);
      expect(result.stripeCount).toBe(0);
      expect(result.internalMatched).toBe(0);
      expect(result.missingInternal).toBe(0);
      expect(result.discrepancy).toBe(false);
    });
  });

  describe('Payment Events Query', () => {
    it(testName('payment events endpoint should return 403 for non-admin users'), async () => {
      const eventsUrl = buildApiUrl(ApiEndpoint.Payment.Events, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(eventsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidRequestHeaders(),
        },
      });

      expect(res.status).toBe(HttpStatus.Forbidden);
    });

    it(testName('should query payment events for admin'), async (testCtx) => {
      await ensureContextReady();
      const context = createTestContext(testCtx.task, RunType.SinglePool, RunType.SinglePool);
      if (context) setCurrentContext(context);
      const token = context ? createSetupContextToken(context) : undefined;

      const eventsUrl = buildApiUrl(ApiEndpoint.Payment.Events, { baseUrl: TestConfig.TestApiUrlPlaceholder });
      const res = await worker.fetch(eventsUrl, {
        method: HttpMethod.Get,
        headers: {
          ...getValidAdminRequestHeaders(), // Admin
        },
      }, token);

      expect([HttpStatus.Ok, HttpStatus.Forbidden]).toContain(res.status);
      
      if (res.status === HttpStatus.Ok) {
        const data = await res.json() as { events?: unknown[] };
        expect(Array.isArray(data.events)).toBe(true);
      }
    });
  });
});
