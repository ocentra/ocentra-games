/**
 * Metrics collection per spec Section 32.1.
 * Collects and emits metrics for transactions, matches, storage, and disputes.
 */

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

export interface AllMetrics {
  transactions: TransactionMetrics;
  matches: MatchMetrics;
  storage: StorageMetrics;
  disputes: DisputeMetrics;
  timestamp: string;
}

export class MetricsCollector {
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

  /**
   * Records a transaction submission.
   */
  recordTransactionSubmission(): void {
    this.transactionMetrics.submissions_total++;
    this.transactionMetrics.pending_count++;
  }

  /**
   * Records a transaction confirmation.
   */
  recordTransactionConfirmation(latencySeconds: number): void {
    this.transactionMetrics.confirmations_total++;
    this.transactionMetrics.pending_count = Math.max(0, this.transactionMetrics.pending_count - 1);
    this.transactionMetrics.confirmation_latency_seconds.push(latencySeconds);
    
    // Keep only last 1000 latencies
    if (this.transactionMetrics.confirmation_latency_seconds.length > 1000) {
      this.transactionMetrics.confirmation_latency_seconds.shift();
    }
  }

  /**
   * Records a transaction failure.
   */
  recordTransactionFailure(): void {
    this.transactionMetrics.failures_total++;
    this.transactionMetrics.pending_count = Math.max(0, this.transactionMetrics.pending_count - 1);
  }

  /**
   * Records a match creation.
   */
  recordMatchCreated(): void {
    this.matchMetrics.created_total++;
  }

  /**
   * Records a match completion.
   */
  recordMatchCompleted(durationSeconds: number): void {
    this.matchMetrics.completed_total++;
    this.matchMetrics.duration_seconds.push(durationSeconds);
    
    // Keep only last 1000 durations
    if (this.matchMetrics.duration_seconds.length > 1000) {
      this.matchMetrics.duration_seconds.shift();
    }
  }

  /**
   * Records a match abandonment.
   */
  recordMatchAbandoned(): void {
    this.matchMetrics.abandoned_total++;
  }

  /**
   * Records an R2 upload.
   */
  recordStorageUpload(success: boolean, latencySeconds: number, sizeBytes: number): void {
    if (success) {
      this.storageMetrics.uploads_total++;
      this.storageMetrics.storage_bytes += sizeBytes;
    } else {
      this.storageMetrics.uploads_failed_total++;
    }
    
    this.storageMetrics.upload_latency_seconds.push(latencySeconds);
    
    // Keep only last 1000 latencies
    if (this.storageMetrics.upload_latency_seconds.length > 1000) {
      this.storageMetrics.upload_latency_seconds.shift();
    }
  }

  /**
   * Records a dispute flag.
   */
  recordDisputeFlagged(): void {
    this.disputeMetrics.flagged_total++;
  }

  /**
   * Records a dispute resolution.
   */
  recordDisputeResolved(resolutionTimeSeconds: number): void {
    this.disputeMetrics.resolved_total++;
    this.disputeMetrics.resolution_time_seconds.push(resolutionTimeSeconds);
    
    // Keep only last 1000 resolution times
    if (this.disputeMetrics.resolution_time_seconds.length > 1000) {
      this.disputeMetrics.resolution_time_seconds.shift();
    }
  }

  /**
   * Gets all metrics.
   */
  getMetrics(): AllMetrics {
    return {
      transactions: { ...this.transactionMetrics },
      matches: { ...this.matchMetrics },
      storage: { ...this.storageMetrics },
      disputes: { ...this.disputeMetrics },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Resets all metrics (for testing).
   */
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
  }
}

