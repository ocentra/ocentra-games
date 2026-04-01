import { AlertThreshold } from '@/constants/monitoring';

export function getTxFailureRateCriticalMessage(rate: number): string {
  return `Transaction failure rate ${rate.toFixed(2)}% exceeds critical threshold of ${AlertThreshold.TxFailureRateCritical}%`;
}

export function getTxFailureRateWarningMessage(rate: number): string {
  return `Transaction failure rate ${rate.toFixed(2)}% exceeds warning threshold of ${AlertThreshold.TxFailureRateWarning}%`;
}

export function getErrorBudgetBurnRateCriticalMessage(burnRate: number): string {
  return `Error budget burn rate ${burnRate.toFixed(2)} exceeds critical threshold of ${AlertThreshold.ErrorBudgetBurnRateCritical}`;
}

export function getErrorBudgetBurnRateWarningMessage(burnRate: number): string {
  return `Error budget burn rate ${burnRate.toFixed(2)} exceeds warning threshold of ${AlertThreshold.ErrorBudgetBurnRateWarning}`;
}

export function getTxPendingCountCriticalMessage(count: number): string {
  return `Pending transaction queue ${count} exceeds critical threshold of ${AlertThreshold.TxPendingCountCritical}`;
}

export function getR2ErrorRateCriticalMessage(rate: number): string {
  return `R2 error rate ${rate.toFixed(2)}% exceeds critical threshold of ${AlertThreshold.R2ErrorRateCritical}%`;
}

export function getMatchAbandonmentRateCriticalMessage(rate: number): string {
  return `Match abandonment rate ${rate.toFixed(2)}% exceeds critical threshold of ${AlertThreshold.MatchAbandonmentRateCritical}%`;
}

export function getTxAvgLatencyWarningMessage(latency: number): string {
  return `Average confirmation latency ${latency.toFixed(2)}s exceeds warning threshold of ${AlertThreshold.TxAvgLatencyWarning}s`;
}

export function getStorageUsageWarningMessage(usage: number): string {
  return `Storage usage ${usage.toFixed(2)}% exceeds warning threshold of ${AlertThreshold.StorageUsageWarning}%`;
}

export function getDisputeResolutionTimeWarningMessage(hours: number): string {
  return `Average dispute resolution time ${hours.toFixed(2)}h exceeds warning threshold of ${AlertThreshold.DisputeResolutionTimeWarningHours}h`;
}

export function getAuthFailuresCriticalMessage(count: number): string {
  return `Critical level of authentication failures: ${count}`;
}

export function getRateLimitHitsWarningMessage(count: number): string {
  return `High volume of rate limit hits: ${count}`;
}
