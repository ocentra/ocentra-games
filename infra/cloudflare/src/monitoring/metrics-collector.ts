import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

export interface TransactionMetrics {
  submissions_total: number;
  confirmations_total: number;
  failures_total: number;
  confirmation_latency_seconds: number[];
  pending_count: number;
}

export interface MatchMetrics {
  created_total: number;
  completed_total: number;
  abandoned_total: number;
  duration_seconds: number[];
}

export interface StorageMetrics {
  uploads_total: number;
  uploads_failed_total: number;
  storage_bytes: number;
  upload_latency_seconds: number[];
}

export interface DisputeMetrics {
  flagged_total: number;
  resolved_total: number;
  resolution_time_seconds: number[];
}

export interface SecurityMetrics {
  auth_failures_total: number;
  rate_limit_hits_total: number;
}

export interface AllMetrics {
  transactions: TransactionMetrics;
  matches: MatchMetrics;
  storage: StorageMetrics;
  disputes: DisputeMetrics;
  security: SecurityMetrics;
  timestamp: string;
}

export class MetricsCollector {
  private readonly log = Logger.instance;
  private readonly LOG_METRICS_DEBUG = false;

  private transactionMetrics: TransactionMetrics = {
    submissions_total: 0,
    confirmations_total: 0,
    failures_total: 0,
    confirmation_latency_seconds: [],
    pending_count: 0,
  };

  private matchMetrics: MatchMetrics = {
    created_total: 0,
    completed_total: 0,
    abandoned_total: 0,
    duration_seconds: [],
  };

  private storageMetrics: StorageMetrics = {
    uploads_total: 0,
    uploads_failed_total: 0,
    storage_bytes: 0,
    upload_latency_seconds: [],
  };

  private disputeMetrics: DisputeMetrics = {
    flagged_total: 0,
    resolved_total: 0,
    resolution_time_seconds: [],
  };

  private securityMetrics: SecurityMetrics = {
    auth_failures_total: 0,
    rate_limit_hits_total: 0,
  };

  constructor() {
    this.log.register(import.meta.url);
  }

  private logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logDebug(message, stackTrace, data, enabled);
  };

  recordTransactionSubmission(): void {
    this.transactionMetrics.submissions_total++;
    this.transactionMetrics.pending_count++;
  }

  recordTransactionConfirmation(latencySeconds: number): void {
    this.transactionMetrics.confirmations_total++;
    this.transactionMetrics.pending_count = Math.max(0, this.transactionMetrics.pending_count - 1);
    this.transactionMetrics.confirmation_latency_seconds.push(latencySeconds);
    if (this.transactionMetrics.confirmation_latency_seconds.length > 1000) {
      this.transactionMetrics.confirmation_latency_seconds.shift();
    }
  }

  recordTransactionFailure(): void {
    this.transactionMetrics.failures_total++;
    this.transactionMetrics.pending_count = Math.max(0, this.transactionMetrics.pending_count - 1);
  }

  recordMatchCreated(): void {
    this.matchMetrics.created_total++;
  }

  recordMatchCompleted(durationSeconds: number): void {
    this.matchMetrics.completed_total++;
    this.matchMetrics.duration_seconds.push(durationSeconds);
    if (this.matchMetrics.duration_seconds.length > 1000) {
      this.matchMetrics.duration_seconds.shift();
    }
  }

  recordMatchAbandoned(): void {
    this.matchMetrics.abandoned_total++;
  }

  recordStorageUpload(success: boolean, latencySeconds: number, sizeBytes: number): void {
    if (success) {
      this.storageMetrics.uploads_total++;
      this.storageMetrics.storage_bytes += sizeBytes;
    } else {
      this.storageMetrics.uploads_failed_total++;
    }
    this.storageMetrics.upload_latency_seconds.push(latencySeconds);
    if (this.storageMetrics.upload_latency_seconds.length > 1000) {
      this.storageMetrics.upload_latency_seconds.shift();
    }
  }

  recordDisputeFlagged(): void {
    this.disputeMetrics.flagged_total++;
  }

  recordDisputeResolved(resolutionTimeSeconds: number): void {
    this.disputeMetrics.resolved_total++;
    this.disputeMetrics.resolution_time_seconds.push(resolutionTimeSeconds);
    if (this.disputeMetrics.resolution_time_seconds.length > 1000) {
      this.disputeMetrics.resolution_time_seconds.shift();
    }
  }

  recordAuthFailure(): void {
    this.securityMetrics.auth_failures_total++;
  }

  recordRateLimitHit(): void {
    this.securityMetrics.rate_limit_hits_total++;
  }

  getMetrics(): AllMetrics {
    this.logDebug('Collecting metrics snapshot', getStackTrace(), undefined, this.LOG_METRICS_DEBUG);
    return {
      transactions: {
        ...this.transactionMetrics,
        confirmation_latency_seconds: [...this.transactionMetrics.confirmation_latency_seconds],
      },
      matches: {
        ...this.matchMetrics,
        duration_seconds: [...this.matchMetrics.duration_seconds],
      },
      storage: {
        ...this.storageMetrics,
        upload_latency_seconds: [...this.storageMetrics.upload_latency_seconds],
      },
      disputes: {
        ...this.disputeMetrics,
        resolution_time_seconds: [...this.disputeMetrics.resolution_time_seconds],
      },
      security: { ...this.securityMetrics },
      timestamp: new Date().toISOString(),
    };
  }

  reset(): void {
    this.transactionMetrics = {
      submissions_total: 0,
      confirmations_total: 0,
      failures_total: 0,
      confirmation_latency_seconds: [],
      pending_count: 0,
    };
    this.matchMetrics = {
      created_total: 0,
      completed_total: 0,
      abandoned_total: 0,
      duration_seconds: [],
    };
    this.storageMetrics = {
      uploads_total: 0,
      uploads_failed_total: 0,
      storage_bytes: 0,
      upload_latency_seconds: [],
    };
    this.disputeMetrics = {
      flagged_total: 0,
      resolved_total: 0,
      resolution_time_seconds: [],
    };
    this.securityMetrics = {
      auth_failures_total: 0,
      rate_limit_hits_total: 0,
    };
  }
}

export const metricsCollector = new MetricsCollector();
