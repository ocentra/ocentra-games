export interface IMatchRecordStorage {
  getMatchRecord(key: string): Promise<string | null>;
  uploadMatchRecord(key: string, content: string): Promise<string>;
}

export interface IMetricsCollector {
  recordTransactionSubmission(): void;
  recordTransactionConfirmation?(latencySeconds: number): void;
  recordTransactionFailure?(): void;
  recordMatchCreated?(): void;
  recordMatchCompleted?(durationSeconds: number): void;
  recordStorageUpload?(success: boolean, latencySeconds: number, sizeBytes: number): void;
  recordDisputeFlagged?(): void;
  recordDisputeResolved?(resolutionTimeSeconds: number): void;
}
