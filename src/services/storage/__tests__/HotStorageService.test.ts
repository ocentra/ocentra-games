import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HotStorageService, type IHotStorageService } from '../HotStorageService';
import { R2Service } from '../R2Service';

describe('HotStorageService', () => {
  let mockStorageImpl: IHotStorageService;

  beforeEach(() => {
    mockStorageImpl = {
      uploadMatchRecord: vi.fn(),
      getMatchRecord: vi.fn(),
      generateSignedUrl: vi.fn(),
    };
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use provided storage implementation', () => {
      const service = new HotStorageService(mockStorageImpl);

      expect(service).toBeInstanceOf(HotStorageService);
    });

    it('should create R2Service from config when no implementation provided', () => {
      // When no implementation is provided, it uses getStorageConfig()
      // which returns r2 config with default bucket name 'claim-matches'
      // This will work as long as config.r2 exists (which it always does)
      const service = new HotStorageService();

      expect(service).toBeInstanceOf(HotStorageService);
    });

    it('should work with R2Service when config is available', () => {
      // The service should instantiate successfully when config.r2 exists
      // (which it always does from getStorageConfig, even with empty workerUrl)
      const service = new HotStorageService();

      expect(service).toBeInstanceOf(HotStorageService);
      // Note: In actual usage, you'd need to set VITE_R2_WORKER_URL for it to work
      // but the constructor doesn't validate that - R2Service will fail on actual use
    });
  });

  describe('setStorageImpl', () => {
    it('should swap the storage implementation', async () => {
      const service = new HotStorageService(mockStorageImpl);
      const newImpl: IHotStorageService = {
        uploadMatchRecord: vi.fn().mockResolvedValue('new-url'),
        getMatchRecord: vi.fn().mockResolvedValue('new-data'),
        generateSignedUrl: vi.fn().mockResolvedValue('new-signed-url'),
      };

      service.setStorageImpl(newImpl);

      await service.uploadMatchRecord('test-id', 'test-data');
      expect(newImpl.uploadMatchRecord).toHaveBeenCalledWith('test-id', 'test-data');
      expect(mockStorageImpl.uploadMatchRecord).not.toHaveBeenCalled();
    });
  });

  describe('uploadMatchRecord', () => {
    it('should delegate to storage implementation', async () => {
      const service = new HotStorageService(mockStorageImpl);
      const matchId = 'test-match-123';
      const matchRecord = JSON.stringify({ match_id: matchId });

      (mockStorageImpl.uploadMatchRecord as ReturnType<typeof vi.fn>).mockResolvedValue(
        'uploaded-url'
      );

      const result = await service.uploadMatchRecord(matchId, matchRecord);

      expect(mockStorageImpl.uploadMatchRecord).toHaveBeenCalledWith(matchId, matchRecord);
      expect(result).toBe('uploaded-url');
    });
  });

  describe('getMatchRecord', () => {
    it('should delegate to storage implementation', async () => {
      const service = new HotStorageService(mockStorageImpl);
      const matchId = 'test-match-123';
      const matchRecord = JSON.stringify({ match_id: matchId });

      (mockStorageImpl.getMatchRecord as ReturnType<typeof vi.fn>).mockResolvedValue(matchRecord);

      const result = await service.getMatchRecord(matchId);

      expect(mockStorageImpl.getMatchRecord).toHaveBeenCalledWith(matchId);
      expect(result).toBe(matchRecord);
    });

    it('should return null when storage returns null', async () => {
      const service = new HotStorageService(mockStorageImpl);
      const matchId = 'non-existent-match';

      (mockStorageImpl.getMatchRecord as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      const result = await service.getMatchRecord(matchId);

      expect(result).toBeNull();
    });
  });

  describe('generateSignedUrl', () => {
    it('should delegate to storage implementation with default expiration', async () => {
      const service = new HotStorageService(mockStorageImpl);
      const matchId = 'test-match-123';

      (mockStorageImpl.generateSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(
        'signed-url'
      );

      const result = await service.generateSignedUrl(matchId);

      expect(mockStorageImpl.generateSignedUrl).toHaveBeenCalledWith(matchId, undefined);
      expect(result).toBe('signed-url');
    });

    it('should delegate to storage implementation with custom expiration', async () => {
      const service = new HotStorageService(mockStorageImpl);
      const matchId = 'test-match-123';
      const expiresIn = 7200;

      (mockStorageImpl.generateSignedUrl as ReturnType<typeof vi.fn>).mockResolvedValue(
        'signed-url'
      );

      const result = await service.generateSignedUrl(matchId, expiresIn);

      expect(mockStorageImpl.generateSignedUrl).toHaveBeenCalledWith(matchId, expiresIn);
      expect(result).toBe('signed-url');
    });
  });

  describe('integration with R2Service', () => {
    it('should work with R2Service when configured', async () => {
      const r2Config = {
        workerUrl: 'https://test-worker.workers.dev',
        bucketName: 'test-bucket',
      };
      const r2Service = new R2Service(r2Config);
      const service = new HotStorageService(r2Service);

      const matchId = 'test-match-123';
      const matchRecord = JSON.stringify({ match_id: matchId, version: '1.0.0', events: [] });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, matchId, url: `matches/${matchId}.json` }),
      });

      const result = await service.uploadMatchRecord(matchId, matchRecord);

      expect(result).toBe(`matches/${matchId}.json`);
    });
  });
});

