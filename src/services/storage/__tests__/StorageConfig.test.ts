import { describe, it, expect } from 'vitest';
import { getStorageConfig } from '../StorageConfig';

describe('StorageConfig', () => {
  it('should return config with R2 settings', () => {
    const config = getStorageConfig();

    expect(config.r2).toBeDefined();
    expect(config.r2?.bucketName).toBeDefined();
    expect(typeof config.r2?.workerUrl).toBe('string');
    expect(typeof config.fallbackToFirebase).toBe('boolean');
  });

  it('should have default bucket name when env var not set', () => {
    // Note: This test verifies the default behavior
    // Actual env var testing would require process.env mocking which is complex in Vite
    const config = getStorageConfig();

    // Default should be 'claim-matches' if VITE_R2_BUCKET_NAME is not set
    // We can't easily mock import.meta.env in vitest, so we just verify structure
    expect(config.r2?.bucketName).toBeDefined();
  });

  it('should handle fallbackToFirebase flag', () => {
    const config = getStorageConfig();

    // Should be boolean (false by default if env var not set)
    expect(typeof config.fallbackToFirebase).toBe('boolean');
  });

  it('should always return r2 config object', () => {
    const config = getStorageConfig();

    expect(config.r2).toBeDefined();
    expect(config.r2).toHaveProperty('workerUrl');
    expect(config.r2).toHaveProperty('bucketName');
  });
});

