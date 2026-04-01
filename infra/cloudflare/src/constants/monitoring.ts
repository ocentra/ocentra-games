import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';

export const AlertLevel = {
  Critical: 'critical',
  Warning: 'warning',
  Info: 'info',
} as const;

export type AlertLevel = typeof AlertLevel[keyof typeof AlertLevel];

export const MetricName = {
  TxFailureRate: 'tx_failure_rate',
  ErrorBudgetBurnRate: 'error_budget_burn_rate',
  TxPendingCount: 'tx_pending_count',
  R2ErrorRate: 'r2_error_rate',
  MatchAbandonmentRate: 'match_abandonment_rate',
  TxAvgLatency: 'tx_avg_latency',
  StorageUsage: 'storage_usage',
  DisputeResolutionTime: 'dispute_resolution_time',
  AuthFailures: 'auth_failures',
  RateLimitHits: 'rate_limit_hits',
} as const;

export type MetricName = typeof MetricName[keyof typeof MetricName];

export const AlertThreshold = {
  TxFailureRateCritical: 10,
  TxFailureRateWarning: 5,
  ErrorBudgetAvailabilityTargetPercent: 99.9,
  ErrorBudgetBurnRateCritical: 100,
  ErrorBudgetBurnRateWarning: 50,
  TxPendingCountCritical: 1000,
  R2ErrorRateCritical: 5,
  MatchAbandonmentRateCritical: 20,
  TxAvgLatencyWarning: 5,
  StorageUsageWarning: 80,
  DisputeResolutionTimeWarningHours: 48,
  AuthFailuresCritical: 50,
  RateLimitHitsWarning: 500,
} as const;

export type AlertThreshold = typeof AlertThreshold[keyof typeof AlertThreshold];

export const StorageLimits = {
  BytesPerGB: 1024 * 1024 * 1024,
  FreeTierGB: 10,
  PercentageMultiplier: 100,
} as const;

export type StorageLimits = typeof StorageLimits[keyof typeof StorageLimits];


export const MonitoringWebhookDomain = {
  Slack: 'hooks.slack.com',
  Discord: 'discord.com',
  DiscordApp: 'discordapp.com',
} as const;

export type MonitoringWebhookDomain = typeof MonitoringWebhookDomain[keyof typeof MonitoringWebhookDomain];

export const MonitoringBucketPath = {
  Metrics: BucketPath.Metrics,
} as const;

export type MonitoringBucketPath = typeof MonitoringBucketPath[keyof typeof MonitoringBucketPath];

export const MonitoringErrorMessage = {
  FailedToStoreMetrics: 'Failed to store metrics',
  WebhookDomainNotAllowed: 'Webhook domain not allowed:',
  FailedToSendAlertWebhook: 'Failed to send alert webhook',
} as const;

export type MonitoringErrorMessage = typeof MonitoringErrorMessage[keyof typeof MonitoringErrorMessage];

