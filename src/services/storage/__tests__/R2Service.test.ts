import { describe, it, expect, beforeEach, vi } from 'vitest';
import { R2Service } from '../R2Service';

describe('R2Service', () => {
  let r2Service: R2Service;
  const mockConfig = {
    workerUrl: 'https://test-worker.workers.dev',
    bucketName: 'test-bucket',
  };

  beforeEach(() => {
    r2Service = new R2Service(mockConfig);
    vi.clearAllMocks();
  });

  describe('uploadMatchRecord', () => {
    it('should upload a match record successfully', async () => {
      const matchId = 'test-match-123';
      const matchRecord = JSON.stringify({ match_id: matchId, version: '1.0.0', events: [] });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, matchId, url: `matches/${matchId}.json` }),
      });

      const result = await r2Service.uploadMatchRecord(matchId, matchRecord);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.workerUrl}/api/matches/${matchId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: matchRecord,
        }
      );
      expect(result).toBe(`matches/${matchId}.json`);
    });

    it('should throw error if record exceeds size limit', async () => {
      const matchId = 'test-match-123';
      // Create a string larger than 10MB
      const largeRecord = 'x'.repeat(11 * 1024 * 1024);

      await expect(r2Service.uploadMatchRecord(matchId, largeRecord)).rejects.toThrow(
        'exceeds size limit'
      );
    });

    it('should retry on network errors', async () => {
      const matchId = 'test-match-123';
      const matchRecord = JSON.stringify({ match_id: matchId, version: '1.0.0', events: [] });

      // First two calls fail, third succeeds
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, matchId, url: `matches/${matchId}.json` }),
        });

      const result = await r2Service.uploadMatchRecord(matchId, matchRecord);

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toBe(`matches/${matchId}.json`);
    });

    it('should not retry on 4xx client errors', async () => {
      const matchId = 'test-match-123';
      const matchRecord = JSON.stringify({ match_id: matchId, version: '1.0.0', events: [] });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(r2Service.uploadMatchRecord(matchId, matchRecord)).rejects.toThrow('400');

      // Should only be called once (no retry)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should throw error after max retries', async () => {
      const matchId = 'test-match-123';
      const matchRecord = JSON.stringify({ match_id: matchId, version: '1.0.0', events: [] });

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(r2Service.uploadMatchRecord(matchId, matchRecord)).rejects.toThrow(
        'Failed to upload match record after 3 attempts'
      );

      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('getMatchRecord', () => {
    it('should retrieve a match record successfully', async () => {
      const matchId = 'test-match-123';
      const matchRecord = JSON.stringify({ match_id: matchId, version: '1.0.0', events: [] });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => matchRecord,
      });

      const result = await r2Service.getMatchRecord(matchId);

      expect(global.fetch).toHaveBeenCalledWith(`${mockConfig.workerUrl}/api/matches/${matchId}`, {
        method: 'GET',
      });
      expect(result).toBe(matchRecord);
    });

    it('should return null for 404 responses', async () => {
      const matchId = 'non-existent-match';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await r2Service.getMatchRecord(matchId);

      expect(result).toBeNull();
    });

    it('should retry on network errors', async () => {
      const matchId = 'test-match-123';
      const matchRecord = JSON.stringify({ match_id: matchId, version: '1.0.0', events: [] });

      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: async () => matchRecord,
        });

      const result = await r2Service.getMatchRecord(matchId);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(result).toBe(matchRecord);
    });

    it('should not retry on 404 or 4xx errors', async () => {
      const matchId = 'test-match-123';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(r2Service.getMatchRecord(matchId)).rejects.toThrow('400');

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate a signed URL successfully', async () => {
      const matchId = 'test-match-123';
      const signedUrl = `${mockConfig.workerUrl}/api/matches/${matchId}?token=abc123`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl, expiresIn: 3600 }),
      });

      const result = await r2Service.generateSignedUrl(matchId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.workerUrl}/api/signed-url/${matchId}?expires=3600`,
        { method: 'GET' }
      );
      expect(result).toBe(signedUrl);
    });

    it('should use custom expiration time', async () => {
      const matchId = 'test-match-123';
      const expiresIn = 7200;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'test-url', expiresIn }),
      });

      await r2Service.generateSignedUrl(matchId, expiresIn);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.workerUrl}/api/signed-url/${matchId}?expires=${expiresIn}`,
        { method: 'GET' }
      );
    });

    it('should throw error on failed request', async () => {
      const matchId = 'test-match-123';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      await expect(r2Service.generateSignedUrl(matchId)).rejects.toThrow('Internal Server Error');
    });
  });

  describe('deleteMatchRecord', () => {
    it('should delete a match record successfully', async () => {
      const matchId = 'test-match-123';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      await r2Service.deleteMatchRecord(matchId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.workerUrl}/api/matches/${matchId}`,
        { method: 'DELETE' }
      );
    });

    it('should throw error on failed deletion', async () => {
      const matchId = 'test-match-123';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      await expect(r2Service.deleteMatchRecord(matchId)).rejects.toThrow('Not Found');
    });
  });
});

