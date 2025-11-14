/**
 * Unified storage interface for match records.
 * Per critique Phase 4.1: Create unified storage interface per spec Section 4.2.
 * Allows swapping storage providers (R2, Firebase, etc.) without changing client code.
 */

import { R2Service } from './R2Service';
import { getStorageConfig } from './StorageConfig';

export interface IHotStorageService {
  /**
   * Uploads a match record to hot storage.
   * @param matchId - Match UUID
   * @param matchRecord - Canonical match record JSON string
   * @returns Public URL or signed URL for the uploaded record
   */
  uploadMatchRecord(matchId: string, matchRecord: string): Promise<string>;

  /**
   * Retrieves a match record from hot storage.
   * @param matchId - Match UUID
   * @returns Canonical match record JSON string, or null if not found
   */
  getMatchRecord(matchId: string): Promise<string | null>;

  /**
   * Generates a signed URL for time-limited access to a match record.
   * @param matchId - Match UUID
   * @param expiresInSeconds - URL expiration time in seconds (default: 3600)
   * @returns Signed URL with expiration
   */
  generateSignedUrl(matchId: string, expiresInSeconds?: number): Promise<string>;
}

/**
 * HotStorageService - Unified interface for match record storage.
 * Currently uses R2Service as the implementation, but can be swapped for other providers.
 */
export class HotStorageService implements IHotStorageService {
  private storageImpl: IHotStorageService;

  constructor(storageImpl?: IHotStorageService) {
    // Default to R2Service if no implementation provided
    if (storageImpl) {
      this.storageImpl = storageImpl;
    } else {
      // Get config from environment or use defaults
      const config = getStorageConfig();
      if (!config.r2) {
        throw new Error('R2Service requires configuration. Please provide storageImpl or set VITE_R2_WORKER_URL and VITE_R2_BUCKET_NAME environment variables.');
      }
      this.storageImpl = new R2Service(config.r2);
    }
  }

  /**
   * Swaps the underlying storage implementation.
   * Useful for testing or switching providers.
   */
  setStorageImpl(impl: IHotStorageService): void {
    this.storageImpl = impl;
  }

  async uploadMatchRecord(matchId: string, matchRecord: string): Promise<string> {
    return this.storageImpl.uploadMatchRecord(matchId, matchRecord);
  }

  async getMatchRecord(matchId: string): Promise<string | null> {
    return this.storageImpl.getMatchRecord(matchId);
  }

  async generateSignedUrl(matchId: string, expiresInSeconds?: number): Promise<string> {
    return this.storageImpl.generateSignedUrl(matchId, expiresInSeconds);
  }
}

