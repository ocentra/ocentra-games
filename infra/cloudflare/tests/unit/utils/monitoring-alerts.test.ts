import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import {
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
import { AlertThreshold } from '@/constants/monitoring';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('getTxFailureRateCriticalMessage: formats critical transaction failure rate message'), () => {
    logInfo('[TEST] Testing getTxFailureRateCriticalMessage', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const rate = 15.5;
    const result = getTxFailureRateCriticalMessage(rate);
    const expected = `Transaction failure rate 15.50% exceeds critical threshold of ${AlertThreshold.TxFailureRateCritical}%`;
    expect(result).toBe(expected);
    if (result !== expected) {
      logError('[TEST] Monitoring alert message generation failed', getStackTrace(), { result, expected });
    }
    logInfo('[TEST] Monitoring alert message validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('getTxFailureRateCriticalMessage: formats message with zero rate'), () => {
    const result = getTxFailureRateCriticalMessage(0);
    expect(result).toBe(`Transaction failure rate 0.00% exceeds critical threshold of ${AlertThreshold.TxFailureRateCritical}%`);
  });

  it(testName('getTxFailureRateWarningMessage: formats warning transaction failure rate message'), () => {
    const rate = 7.25;
    const result = getTxFailureRateWarningMessage(rate);
    expect(result).toBe(`Transaction failure rate 7.25% exceeds warning threshold of ${AlertThreshold.TxFailureRateWarning}%`);
  });

  it(testName('getTxPendingCountCriticalMessage: formats critical pending transaction count message'), () => {
    const count = 1500;
    const result = getTxPendingCountCriticalMessage(count);
    expect(result).toBe(`Pending transaction queue ${count} exceeds critical threshold of ${AlertThreshold.TxPendingCountCritical}`);
  });

  it(testName('getTxPendingCountCriticalMessage: formats message with zero count'), () => {
    const result = getTxPendingCountCriticalMessage(0);
    expect(result).toBe(`Pending transaction queue 0 exceeds critical threshold of ${AlertThreshold.TxPendingCountCritical}`);
  });

  it(testName('getR2ErrorRateCriticalMessage: formats critical R2 error rate message'), () => {
    const rate = 8.75;
    const result = getR2ErrorRateCriticalMessage(rate);
    expect(result).toBe(`R2 error rate 8.75% exceeds critical threshold of ${AlertThreshold.R2ErrorRateCritical}%`);
  });

  it(testName('getMatchAbandonmentRateCriticalMessage: formats critical match abandonment rate message'), () => {
    const rate = 25.5;
    const result = getMatchAbandonmentRateCriticalMessage(rate);
    expect(result).toBe(`Match abandonment rate 25.50% exceeds critical threshold of ${AlertThreshold.MatchAbandonmentRateCritical}%`);
  });

  it(testName('getTxAvgLatencyWarningMessage: formats warning transaction latency message'), () => {
    const latency = 7.5;
    const result = getTxAvgLatencyWarningMessage(latency);
    expect(result).toBe(`Average confirmation latency 7.50s exceeds warning threshold of ${AlertThreshold.TxAvgLatencyWarning}s`);
  });

  it(testName('getStorageUsageWarningMessage: formats warning storage usage message'), () => {
    const usage = 85.25;
    const result = getStorageUsageWarningMessage(usage);
    expect(result).toBe(`Storage usage 85.25% exceeds warning threshold of ${AlertThreshold.StorageUsageWarning}%`);
  });

  it(testName('getDisputeResolutionTimeWarningMessage: formats warning dispute resolution time message'), () => {
    const hours = 50.5;
    const result = getDisputeResolutionTimeWarningMessage(hours);
    expect(result).toBe(`Average dispute resolution time 50.50h exceeds warning threshold of ${AlertThreshold.DisputeResolutionTimeWarningHours}h`);
  });

  it(testName('getAuthFailuresCriticalMessage: formats critical authentication failures message'), () => {
    const count = 100;
    const result = getAuthFailuresCriticalMessage(count);
    expect(result).toBe(`Critical level of authentication failures: ${count}`);
  });

  it(testName('getAuthFailuresCriticalMessage: formats message with zero count'), () => {
    const result = getAuthFailuresCriticalMessage(0);
    expect(result).toBe('Critical level of authentication failures: 0');
  });

  it(testName('getRateLimitHitsWarningMessage: formats warning rate limit hits message'), () => {
    const count = 750;
    const result = getRateLimitHitsWarningMessage(count);
    expect(result).toBe(`High volume of rate limit hits: ${count}`);
  });
});
