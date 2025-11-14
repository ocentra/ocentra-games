export interface StorageConfig {
  r2?: {
    workerUrl: string;
    bucketName: string;
  };
  fallbackToFirebase?: boolean;
}

export function getStorageConfig(): StorageConfig {
  return {
    r2: {
      workerUrl: import.meta.env.VITE_R2_WORKER_URL || '',
      bucketName: import.meta.env.VITE_R2_BUCKET_NAME || 'claim-matches',
    },
    fallbackToFirebase: import.meta.env.VITE_STORAGE_FALLBACK_FIREBASE === 'true',
  };
}

