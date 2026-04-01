import type { AllMetrics } from '@/monitoring/metrics-collector';
import type { R2Bucket } from '@cloudflare/workers-types';
import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { AlertLevel, MetricName, AlertThreshold, StorageLimits, MonitoringWebhookDomain, MonitoringErrorMessage } from '@/constants/monitoring';
import {
  getErrorBudgetBurnRateCriticalMessage,
  getErrorBudgetBurnRateWarningMessage,
  getTxFailureRateCriticalMessage,
  getTxFailureRateWarningMessage,
  getTxPendingCountCriticalMessage,
  getR2ErrorRateCriticalMessage,
  getMatchAbandonmentRateCriticalMessage,
  getTxAvgLatencyWarningMessage,
  getStorageUsageWarningMessage,
  getDisputeResolutionTimeWarningMessage,
  getAuthFailuresCriticalMessage,
  getRateLimitHitsWarningMessage,
} from '@/utils/monitoring-alerts';
import { TimeInSeconds } from '@/constants/time';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_MONITORING_INFO = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

export async function emitMetrics(
  metrics: AllMetrics,
  env: {
    MATCHES_BUCKET?: R2Bucket | { put: (key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: { httpMetadata?: { contentType?: string } }) => Promise<void>; head: (key: string) => Promise<{ writeHttpMetadata: (headers: Headers) => void } | null> } | unknown;
    ALERT_WEBHOOK_URL?: string;
    ALERT_EMAIL?: string;
  }
): Promise<void> {
  logInfo('Metrics', getStackTrace(), metrics, LOG_MONITORING_INFO);

  if (env.MATCHES_BUCKET && typeof env.MATCHES_BUCKET === 'object' && 'put' in env.MATCHES_BUCKET) {
    try {
      const metricsKey = `${BucketPath.Metrics}${new Date().toISOString().split('T')[0]}/${Date.now()}.json`;
      const bucket = env.MATCHES_BUCKET as { put: (key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: { httpMetadata?: { contentType?: string } }) => Promise<void> }
      await bucket.put(metricsKey, JSON.stringify(metrics), {
        httpMetadata: {
          contentType: HttpContentType.ApplicationJson,
        },
      });
    } catch (error) {
      logError(MonitoringErrorMessage.FailedToStoreMetrics, getStackTrace(), error);
    }
  }

  const alerts = checkAlertThresholds(metrics);
  if (alerts.length > 0 && env.ALERT_WEBHOOK_URL) {
    const ALLOWED_WEBHOOK_DOMAINS = [
      MonitoringWebhookDomain.Slack,
      MonitoringWebhookDomain.Discord,
      MonitoringWebhookDomain.DiscordApp,
    ];

    try {
      const url = new URL(env.ALERT_WEBHOOK_URL);
      const isAllowed = ALLOWED_WEBHOOK_DOMAINS.some(domain =>
        url.hostname === domain || url.hostname.endsWith('.' + domain)
      );

      if (!isAllowed) {
        logError(`${MonitoringErrorMessage.WebhookDomainNotAllowed} ${url.hostname}`, getStackTrace(), undefined);
        return;
      }

      const webhookResponse = await fetch(env.ALERT_WEBHOOK_URL, {
        method: HttpMethod.Post,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        body: JSON.stringify({
          alerts,
          metrics: {
            timestamp: metrics.timestamp,
            transactions: {
              submissions: metrics.transactions.submissions_total,
              failures: metrics.transactions.failures_total,
              pending: metrics.transactions.pending_count,
            },
            matches: {
              created: metrics.matches.created_total,
              completed: metrics.matches.completed_total,
              abandoned: metrics.matches.abandoned_total,
            },
          },
        }),
      });
      if (!webhookResponse.bodyUsed) {
        try {
          await webhookResponse.arrayBuffer();
        } catch {
          try {
            await webhookResponse.text();
          } catch {
            void 0;
          }
        }
      }
    } catch (error) {
      logError(MonitoringErrorMessage.FailedToSendAlertWebhook, getStackTrace(), error);
    }
  }
}

export interface Alert {
  level: AlertLevel;
  metric: string;
  value: number;
  threshold: number;
  message: string;
}

export interface ErrorBudgetBurnRate {
  availabilityTargetPercent: number;
  observedErrorRatePercent: number;
  allowedErrorRatePercent: number;
  burnRate: number;
}

export function calculateErrorBudgetBurnRate(
  metrics: AllMetrics,
  availabilityTargetPercent: number = AlertThreshold.ErrorBudgetAvailabilityTargetPercent
): ErrorBudgetBurnRate {
  const totalTransactions = metrics.transactions.submissions_total;
  const failures = metrics.transactions.failures_total;
  const observedErrorRatePercent = totalTransactions > 0
    ? (failures / totalTransactions) * StorageLimits.PercentageMultiplier
    : 0;
  const allowedErrorRatePercent = Math.max(
    StorageLimits.PercentageMultiplier - availabilityTargetPercent,
    Number.EPSILON
  );
  const burnRate = Number((observedErrorRatePercent / allowedErrorRatePercent).toFixed(10));

  return {
    availabilityTargetPercent,
    observedErrorRatePercent,
    allowedErrorRatePercent,
    burnRate,
  };
}

export function checkAlertThresholds(metrics: AllMetrics): Alert[] {
  const alerts: Alert[] = [];

  const txFailureRate = metrics.transactions.submissions_total > 0
    ? (metrics.transactions.failures_total / metrics.transactions.submissions_total) * StorageLimits.PercentageMultiplier
    : 0;

  if (txFailureRate > AlertThreshold.TxFailureRateCritical) {
    alerts.push({
      level: AlertLevel.Critical,
      metric: MetricName.TxFailureRate,
      value: txFailureRate,
      threshold: AlertThreshold.TxFailureRateCritical,
      message: getTxFailureRateCriticalMessage(txFailureRate),
    });
  }

  const errorBudgetBurn = calculateErrorBudgetBurnRate(metrics);
  if (errorBudgetBurn.burnRate > AlertThreshold.ErrorBudgetBurnRateCritical) {
    alerts.push({
      level: AlertLevel.Critical,
      metric: MetricName.ErrorBudgetBurnRate,
      value: errorBudgetBurn.burnRate,
      threshold: AlertThreshold.ErrorBudgetBurnRateCritical,
      message: getErrorBudgetBurnRateCriticalMessage(errorBudgetBurn.burnRate),
    });
  } else if (errorBudgetBurn.burnRate > AlertThreshold.ErrorBudgetBurnRateWarning) {
    alerts.push({
      level: AlertLevel.Warning,
      metric: MetricName.ErrorBudgetBurnRate,
      value: errorBudgetBurn.burnRate,
      threshold: AlertThreshold.ErrorBudgetBurnRateWarning,
      message: getErrorBudgetBurnRateWarningMessage(errorBudgetBurn.burnRate),
    });
  }

  if (metrics.transactions.pending_count > AlertThreshold.TxPendingCountCritical) {
    alerts.push({
      level: AlertLevel.Critical,
      metric: MetricName.TxPendingCount,
      value: metrics.transactions.pending_count,
      threshold: AlertThreshold.TxPendingCountCritical,
      message: getTxPendingCountCriticalMessage(metrics.transactions.pending_count),
    });
  }

  const r2ErrorRate = metrics.storage.uploads_total > 0
    ? (metrics.storage.uploads_failed_total / (metrics.storage.uploads_total + metrics.storage.uploads_failed_total)) * StorageLimits.PercentageMultiplier
    : 0;

  if (r2ErrorRate > AlertThreshold.R2ErrorRateCritical) {
    alerts.push({
      level: AlertLevel.Critical,
      metric: MetricName.R2ErrorRate,
      value: r2ErrorRate,
      threshold: AlertThreshold.R2ErrorRateCritical,
      message: getR2ErrorRateCriticalMessage(r2ErrorRate),
    });
  }

  const abandonmentRate = metrics.matches.created_total > 0
    ? (metrics.matches.abandoned_total / metrics.matches.created_total) * StorageLimits.PercentageMultiplier
    : 0;

  if (abandonmentRate > AlertThreshold.MatchAbandonmentRateCritical) {
    alerts.push({
      level: AlertLevel.Critical,
      metric: MetricName.MatchAbandonmentRate,
      value: abandonmentRate,
      threshold: AlertThreshold.MatchAbandonmentRateCritical,
      message: getMatchAbandonmentRateCriticalMessage(abandonmentRate),
    });
  }

  if (txFailureRate > AlertThreshold.TxFailureRateWarning && txFailureRate <= AlertThreshold.TxFailureRateCritical) {
    alerts.push({
      level: AlertLevel.Warning,
      metric: MetricName.TxFailureRate,
      value: txFailureRate,
      threshold: AlertThreshold.TxFailureRateWarning,
      message: getTxFailureRateWarningMessage(txFailureRate),
    });
  }

  const avgLatency = metrics.transactions.confirmation_latency_seconds.length > 0
    ? metrics.transactions.confirmation_latency_seconds.reduce((a, b) => a + b, 0) / metrics.transactions.confirmation_latency_seconds.length
    : 0;

  if (avgLatency > AlertThreshold.TxAvgLatencyWarning) {
    alerts.push({
      level: AlertLevel.Warning,
      metric: MetricName.TxAvgLatency,
      value: avgLatency,
      threshold: AlertThreshold.TxAvgLatencyWarning,
      message: getTxAvgLatencyWarningMessage(avgLatency),
    });
  }

  const storageUsageGB = metrics.storage.storage_bytes / StorageLimits.BytesPerGB;
  const storageUsagePercent = (storageUsageGB / StorageLimits.FreeTierGB) * StorageLimits.PercentageMultiplier;

  if (storageUsagePercent > AlertThreshold.StorageUsageWarning) {
    alerts.push({
      level: AlertLevel.Warning,
      metric: MetricName.StorageUsage,
      value: storageUsagePercent,
      threshold: AlertThreshold.StorageUsageWarning,
      message: getStorageUsageWarningMessage(storageUsagePercent),
    });
  }

  const avgResolutionTime = metrics.disputes.resolution_time_seconds.length > 0
    ? metrics.disputes.resolution_time_seconds.reduce((a, b) => a + b, 0) / metrics.disputes.resolution_time_seconds.length
    : 0;

  const disputeResolutionThresholdSeconds = AlertThreshold.DisputeResolutionTimeWarningHours * TimeInSeconds.Hour;
  if (avgResolutionTime > disputeResolutionThresholdSeconds) {
    alerts.push({
      level: AlertLevel.Warning,
      metric: MetricName.DisputeResolutionTime,
      value: avgResolutionTime,
      threshold: disputeResolutionThresholdSeconds,
      message: getDisputeResolutionTimeWarningMessage(avgResolutionTime / TimeInSeconds.Hour),
    });
  }

  if (metrics.security && metrics.security.auth_failures_total > AlertThreshold.AuthFailuresCritical) {
    alerts.push({
      level: AlertLevel.Critical,
      metric: MetricName.AuthFailures,
      value: metrics.security.auth_failures_total,
      threshold: AlertThreshold.AuthFailuresCritical,
      message: getAuthFailuresCriticalMessage(metrics.security.auth_failures_total),
    });
  }

  if (metrics.security && metrics.security.rate_limit_hits_total > AlertThreshold.RateLimitHitsWarning) {
    alerts.push({
      level: AlertLevel.Warning,
      metric: MetricName.RateLimitHits,
      value: metrics.security.rate_limit_hits_total,
      threshold: AlertThreshold.RateLimitHitsWarning,
      message: getRateLimitHitsWarningMessage(metrics.security.rate_limit_hits_total),
    });
  }

  return alerts;
}
