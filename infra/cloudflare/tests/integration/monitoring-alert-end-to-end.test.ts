import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll, beforeEach } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpoint, getValidRequestHeaders } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { AlertLevel, AlertThreshold, MetricName } from '@/constants/monitoring';
import { metricsCollector } from '@/monitoring/metrics-collector';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

type AlertPayload = {
  level: AlertLevel;
  metric: string;
  threshold: number;
};

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  beforeEach(() => {
    metricsCollector.reset();
  });

  afterAll(async () => {
    metricsCollector.reset();
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('monitoring alert end-to-end: alerts endpoint emits critical auth-failure alert after threshold breach'), async () => {
    const token = await createToken();

    for (let i = 0; i < AlertThreshold.AuthFailuresCritical + 1; i++) {
      metricsCollector.recordAuthFailure();
    }

    const response = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.Alerts),
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { alerts: AlertPayload[] };
    expect(Array.isArray(data.alerts)).toBe(true);
    expect(data.alerts.length).toBeGreaterThan(0);

    const authFailureAlert = data.alerts.find((alert) => alert.metric === MetricName.AuthFailures);
    expect(authFailureAlert?.level).toBe(AlertLevel.Critical);
    expect(authFailureAlert?.threshold).toBe(AlertThreshold.AuthFailuresCritical);
  });

  it(testName('monitoring alert end-to-end: metrics endpoint includes alerts when thresholds are breached'), async () => {
    const token = await createToken();

    for (let i = 0; i < AlertThreshold.RateLimitHitsWarning + 5; i++) {
      metricsCollector.recordRateLimitHit();
    }

    const response = await worker.fetch(
      buildTestApiUrlForEndpoint(ApiEndpoint.Metrics),
      {
        method: HttpMethod.Get,
        headers: getValidRequestHeaders(),
      },
      token
    );

    expect(response.status).toBe(HttpStatus.Ok);
    const data = (await response.json()) as { alerts: AlertPayload[] };
    expect(Array.isArray(data.alerts)).toBe(true);

    const rateLimitAlert = data.alerts.find((alert) => alert.metric === MetricName.RateLimitHits);
    expect(rateLimitAlert?.level).toBe(AlertLevel.Warning);
    expect(rateLimitAlert?.threshold).toBe(AlertThreshold.RateLimitHitsWarning);
  });
});
