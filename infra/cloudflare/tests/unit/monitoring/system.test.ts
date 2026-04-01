import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { checkAlertThresholds, calculateErrorBudgetBurnRate } from '@/monitoring/system';
import type { AllMetrics } from '@/monitoring/metrics-collector';
import { AlertLevel, MetricName, AlertThreshold } from '@/constants/monitoring';
import { TimeInSeconds } from '@/constants/time';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

function createBaselineMetrics(): AllMetrics {
  return {
    transactions: {
      submissions_total: 100,
      confirmations_total: 90,
      failures_total: 0,
      confirmation_latency_seconds: [],
      pending_count: 0,
    },
    matches: {
      created_total: 100,
      completed_total: 95,
      abandoned_total: 0,
      duration_seconds: [],
    },
    storage: {
      uploads_total: 100,
      uploads_failed_total: 0,
      storage_bytes: 1024,
      upload_latency_seconds: [],
    },
    disputes: {
      flagged_total: 0,
      resolved_total: 0,
      resolution_time_seconds: [],
    },
    security: {
      auth_failures_total: 0,
      rate_limit_hits_total: 0,
    },
    timestamp: new Date().toISOString(),
  };
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('checkAlertThresholds: returns no alerts for baseline-safe metrics'), () => {
    const alerts = checkAlertThresholds(createBaselineMetrics());
    expect(alerts).toHaveLength(0);
  });

  it(testName('checkAlertThresholds: fires warning tx failure alert when over warning and below critical'), () => {
    const metrics = createBaselineMetrics();
    metrics.transactions.failures_total = 6;

    const alerts = checkAlertThresholds(metrics);
    const txFailureAlerts = alerts.filter((alert) => alert.metric === MetricName.TxFailureRate);

    expect(txFailureAlerts).toHaveLength(1);
    expect(txFailureAlerts[0]?.level).toBe(AlertLevel.Warning);
    expect(txFailureAlerts[0]?.threshold).toBe(AlertThreshold.TxFailureRateWarning);
  });

  it(testName('checkAlertThresholds: fires critical tx failure alert and suppresses warning duplicate at critical breach'), () => {
    const metrics = createBaselineMetrics();
    metrics.transactions.failures_total = 11;

    const alerts = checkAlertThresholds(metrics);
    const txFailureAlerts = alerts.filter((alert) => alert.metric === MetricName.TxFailureRate);

    expect(txFailureAlerts).toHaveLength(1);
    expect(txFailureAlerts[0]?.level).toBe(AlertLevel.Critical);
    expect(txFailureAlerts[0]?.threshold).toBe(AlertThreshold.TxFailureRateCritical);
  });

  it(testName('calculateErrorBudgetBurnRate: computes deterministic burn-rate from submission failure ratio'), () => {
    const metrics = createBaselineMetrics();
    metrics.transactions.submissions_total = 200;
    metrics.transactions.failures_total = 20;

    const result = calculateErrorBudgetBurnRate(metrics);

    expect(result.availabilityTargetPercent).toBe(AlertThreshold.ErrorBudgetAvailabilityTargetPercent);
    expect(result.observedErrorRatePercent).toBe(10);
    expect(result.allowedErrorRatePercent).toBeCloseTo(0.1, 10);
    expect(result.burnRate).toBeCloseTo(100, 8);
  });

  it(testName('checkAlertThresholds: emits warning burn-rate alert above warning threshold and below critical'), () => {
    const metrics = createBaselineMetrics();
    metrics.transactions.submissions_total = 100;
    metrics.transactions.failures_total = 8;

    const alerts = checkAlertThresholds(metrics);
    const burnAlerts = alerts.filter((alert) => alert.metric === MetricName.ErrorBudgetBurnRate);

    expect(burnAlerts).toHaveLength(1);
    expect(burnAlerts[0]?.level).toBe(AlertLevel.Warning);
    expect(burnAlerts[0]?.threshold).toBe(AlertThreshold.ErrorBudgetBurnRateWarning);
  });

  it(testName('checkAlertThresholds: emits critical burn-rate alert above critical threshold'), () => {
    const metrics = createBaselineMetrics();
    metrics.transactions.submissions_total = 100;
    metrics.transactions.failures_total = 12;

    const alerts = checkAlertThresholds(metrics);
    const burnAlerts = alerts.filter((alert) => alert.metric === MetricName.ErrorBudgetBurnRate);

    expect(burnAlerts).toHaveLength(1);
    expect(burnAlerts[0]?.level).toBe(AlertLevel.Critical);
    expect(burnAlerts[0]?.threshold).toBe(AlertThreshold.ErrorBudgetBurnRateCritical);
  });

  it(testName('checkAlertThresholds: threshold equality does not trigger because checks are strict greater-than'), () => {
    const metrics = createBaselineMetrics();
    metrics.transactions.failures_total = AlertThreshold.TxFailureRateWarning;
    metrics.transactions.pending_count = AlertThreshold.TxPendingCountCritical;
    metrics.storage.uploads_total = 95;
    metrics.storage.uploads_failed_total = 5;
    metrics.matches.abandoned_total = AlertThreshold.MatchAbandonmentRateCritical;
    metrics.transactions.confirmation_latency_seconds = [AlertThreshold.TxAvgLatencyWarning];
    metrics.storage.storage_bytes = 8 * 1024 * 1024 * 1024;
    metrics.disputes.resolution_time_seconds = [AlertThreshold.DisputeResolutionTimeWarningHours * TimeInSeconds.Hour];
    metrics.security.auth_failures_total = AlertThreshold.AuthFailuresCritical;
    metrics.security.rate_limit_hits_total = AlertThreshold.RateLimitHitsWarning;

    const alerts = checkAlertThresholds(metrics);
    expect(alerts).toHaveLength(0);
  });

  it(testName('checkAlertThresholds: fires multi-metric critical and warning alerts when multiple thresholds are exceeded'), () => {
    const metrics = createBaselineMetrics();
    metrics.transactions.failures_total = 15;
    metrics.transactions.pending_count = 1500;
    metrics.storage.uploads_total = 90;
    metrics.storage.uploads_failed_total = 10;
    metrics.matches.abandoned_total = 25;
    metrics.transactions.confirmation_latency_seconds = [6, 7];
    metrics.storage.storage_bytes = 9 * 1024 * 1024 * 1024;
    metrics.disputes.resolution_time_seconds = [49 * TimeInSeconds.Hour];
    metrics.security.auth_failures_total = 60;
    metrics.security.rate_limit_hits_total = 700;

    const alerts = checkAlertThresholds(metrics);
    const metricsInAlerts = new Set(alerts.map((alert) => alert.metric));

    expect(alerts).toHaveLength(10);
    expect(metricsInAlerts.has(MetricName.TxFailureRate)).toBe(true);
    expect(metricsInAlerts.has(MetricName.ErrorBudgetBurnRate)).toBe(true);
    expect(metricsInAlerts.has(MetricName.TxPendingCount)).toBe(true);
    expect(metricsInAlerts.has(MetricName.R2ErrorRate)).toBe(true);
    expect(metricsInAlerts.has(MetricName.MatchAbandonmentRate)).toBe(true);
    expect(metricsInAlerts.has(MetricName.TxAvgLatency)).toBe(true);
    expect(metricsInAlerts.has(MetricName.StorageUsage)).toBe(true);
    expect(metricsInAlerts.has(MetricName.DisputeResolutionTime)).toBe(true);
    expect(metricsInAlerts.has(MetricName.AuthFailures)).toBe(true);
    expect(metricsInAlerts.has(MetricName.RateLimitHits)).toBe(true);
  });
});
