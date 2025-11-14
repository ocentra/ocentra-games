import { describe, it, expect, beforeEach, vi } from 'vitest';
import { R2Service } from '../R2Service';

/**
 * Integration tests for R2Service with mocked realistic match record data.
 * Tests full write/read cycles, error handling, and edge cases.
 */

describe('R2Service Integration Tests with Mocked Data', () => {
  let r2Service: R2Service;
  const mockConfig = {
    workerUrl: 'https://test-worker.workers.dev',
    bucketName: 'test-bucket',
  };

  // Mock realistic match record data (using any for test data flexibility)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMockMatchRecord = (matchId: string): any => ({
    match_id: matchId,
    version: '1.0.0',
    game_type: 'card_game',
    created_at: new Date().toISOString(),
    ended_at: new Date().toISOString(),
    players: [
      {
        player_id: 'player-1',
        wallet_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
        player_type: 'human',
        score: 100,
      },
      {
        player_id: 'player-2',
        wallet_address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
        player_type: 'ai',
        score: 85,
      },
    ],
    events: [
      {
        event_type: 'match_created',
        timestamp: Date.now(),
        player_id: 'player-1',
        data: { game_state: 'initialized' },
      },
      {
        event_type: 'move',
        timestamp: Date.now() + 1000,
        player_id: 'player-1',
        data: { action: 'play_card', card: { suit: 'hearts', value: 'ace' } },
      },
      {
        event_type: 'match_ended',
        timestamp: Date.now() + 5000,
        player_id: 'system',
        data: { winner: 'player-1', reason: 'score' },
      },
    ],
    metadata: {
      rng_seed: 12345,
      model_version: null as string | null,
      chain_of_thought_hash: null as string | null,
    },
    signatures: [
      {
        signer: 'coordinator',
        signature: 'mock-signature-123',
        timestamp: Date.now(),
      },
    ],
    hash: 'mock-hash-abc123',
    hot_url: `https://test-worker.workers.dev/api/matches/${matchId}`,
  });

  beforeEach(() => {
    r2Service = new R2Service(mockConfig);
    vi.clearAllMocks();
  });

  describe('Full Write/Read Cycle', () => {
    it('should upload and retrieve a complete match record', async () => {
      const matchId = 'test-match-full-cycle';
      const matchRecord = createMockMatchRecord(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      // Mock upload
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          matchId,
          url: `matches/${matchId}.json`,
        }),
      });

      const uploadResult = await r2Service.uploadMatchRecord(matchId, matchRecordJSON);

      expect(uploadResult).toBe(`matches/${matchId}.json`);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.workerUrl}/api/matches/${matchId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: matchRecordJSON,
        }
      );

      // Mock retrieval
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => matchRecordJSON,
      });

      const retrievedRecord = await r2Service.getMatchRecord(matchId);

      expect(retrievedRecord).toBe(matchRecordJSON);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.workerUrl}/api/matches/${matchId}`,
        { method: 'GET' }
      );

      // Verify data integrity
      const parsed = JSON.parse(retrievedRecord!);
      expect(parsed.match_id).toBe(matchId);
      expect(parsed.players).toHaveLength(2);
      expect(parsed.events).toHaveLength(3);
    });

    it('should handle large match records with many events', async () => {
      const matchId = 'test-match-large';
      const matchRecord = createMockMatchRecord(matchId);
      
      // Add many events to simulate a long game
      for (let i = 0; i < 50; i++) {
        matchRecord.events.push({
          event_type: 'move',
          timestamp: Date.now() + i * 1000,
          player_id: i % 2 === 0 ? 'player-1' : 'player-2',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { action: 'play_card', move_index: i } as any,
        });
      }

      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
      const sizeBytes = new TextEncoder().encode(matchRecordJSON).length;

      // Should be under 10MB limit
      expect(sizeBytes).toBeLessThan(10 * 1024 * 1024);

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, matchId, url: `matches/${matchId}.json` }),
      });

      const result = await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      expect(result).toBe(`matches/${matchId}.json`);
    });

    it('should handle match records with AI chain-of-thought', async () => {
      const matchId = 'test-match-ai';
      const matchRecord = createMockMatchRecord(matchId);
      
      matchRecord.metadata.model_version = 'gpt-4-turbo';
      matchRecord.metadata.chain_of_thought_hash = 'hash-of-cot-123';
      
      // Add AI decision event
      matchRecord.events.push({
        event_type: 'ai_decision',
        timestamp: Date.now(),
        player_id: 'player-2',
        data: {
          action: 'play_card',
          chain_of_thought: [
            {
              move_index: 1,
              timestamp: new Date().toISOString(),
              thought: 'Considering available moves',
              reasoning: 'Player 1 played ace of hearts, I should...',
              alternatives_considered: ['play_king', 'play_queen'],
              decision: 'play_king',
              confidence: 0.85,
            },
          ],
          metadata: {
            model_name: 'gpt-4-turbo',
            inference_time_ms: 250,
            confidence: 0.85,
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, matchId, url: `matches/${matchId}.json` }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => matchRecordJSON,
        });

      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      const retrieved = await r2Service.getMatchRecord(matchId);

      const parsed = JSON.parse(retrieved!);
      expect(parsed.metadata.model_version).toBe('gpt-4-turbo');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect(parsed.events.some((e: any) => e.event_type === 'ai_decision')).toBe(true);
    });
  });

  describe('Error Handling with Realistic Data', () => {
    it('should reject match records exceeding 10MB limit', async () => {
      const matchId = 'test-match-too-large';
      // Create a string larger than 10MB
      const largeData = 'x'.repeat(11 * 1024 * 1024);
      const matchRecord = {
        ...createMockMatchRecord(matchId),
        large_data: largeData,
      };
      const matchRecordJSON = JSON.stringify(matchRecord);

      await expect(r2Service.uploadMatchRecord(matchId, matchRecordJSON)).rejects.toThrow(
        'exceeds size limit'
      );
    });

    it('should handle network errors during upload with retry', async () => {
      const matchId = 'test-match-retry';
      const matchRecord = createMockMatchRecord(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord);

      // First two attempts fail, third succeeds
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, matchId, url: `matches/${matchId}.json` }),
        });

      const result = await r2Service.uploadMatchRecord(matchId, matchRecordJSON);

      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toBe(`matches/${matchId}.json`);
    });

    it('should not retry on 400 Bad Request (invalid data)', async () => {
      const matchId = 'test-match-invalid';
      const invalidRecord = '{ invalid json }';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      await expect(r2Service.uploadMatchRecord(matchId, invalidRecord)).rejects.toThrow('400');

      // Should only be called once (no retry on 4xx)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return null for non-existent match records', async () => {
      const matchId = 'non-existent-match-123';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await r2Service.getMatchRecord(matchId);

      expect(result).toBeNull();
    });
  });

  describe('Signed URL Generation', () => {
    it('should generate signed URL for match record access', async () => {
      const matchId = 'test-match-signed';
      const signedUrl = `${mockConfig.workerUrl}/api/matches/${matchId}?token=abc123&expires=3600`;

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl, expiresIn: 3600 }),
      });

      const result = await r2Service.generateSignedUrl(matchId, 3600);

      expect(result).toBe(signedUrl);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.workerUrl}/api/signed-url/${matchId}?expires=3600`,
        { method: 'GET' }
      );
    });

    it('should use default expiration (1 hour) when not specified', async () => {
      const matchId = 'test-match-default-expiry';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ signedUrl: 'test-url', expiresIn: 3600 }),
      });

      await r2Service.generateSignedUrl(matchId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.workerUrl}/api/signed-url/${matchId}?expires=3600`,
        { method: 'GET' }
      );
    });
  });

  describe('Delete Operations', () => {
    it('should delete a match record successfully', async () => {
      const matchId = 'test-match-delete';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
      });

      await r2Service.deleteMatchRecord(matchId);

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockConfig.workerUrl}/api/matches/${matchId}`,
        { method: 'DELETE' }
      );
    });

    it('should handle deletion of non-existent match gracefully', async () => {
      const matchId = 'non-existent-match';

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(r2Service.deleteMatchRecord(matchId)).rejects.toThrow('Not Found');
    });
  });

  describe('Data Integrity', () => {
    it('should preserve all match record fields during upload/retrieve', async () => {
      const matchId = 'test-match-integrity';
      const originalRecord = createMockMatchRecord(matchId);
      const originalJSON = JSON.stringify(originalRecord, null, 2);

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, matchId, url: `matches/${matchId}.json` }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => originalJSON,
        });

      await r2Service.uploadMatchRecord(matchId, originalJSON);
      const retrieved = await r2Service.getMatchRecord(matchId);

      const retrievedRecord = JSON.parse(retrieved!);

      // Verify all fields are preserved
      expect(retrievedRecord.match_id).toBe(originalRecord.match_id);
      expect(retrievedRecord.version).toBe(originalRecord.version);
      expect(retrievedRecord.players).toEqual(originalRecord.players);
      expect(retrievedRecord.events).toEqual(originalRecord.events);
      expect(retrievedRecord.metadata).toEqual(originalRecord.metadata);
      expect(retrievedRecord.signatures).toEqual(originalRecord.signatures);
    });

    it('should handle special characters in match data', async () => {
      const matchId = 'test-match-special-chars';
      const matchRecord = createMockMatchRecord(matchId);
      
      // Add special characters in event data
      matchRecord.events.push({
        event_type: 'chat',
        timestamp: Date.now(),
        player_id: 'player-1',
        data: {
          message: 'Hello! 🎮 "quotes" & <tags> and unicode: 你好',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);

      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, matchId, url: `matches/${matchId}.json` }),
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => matchRecordJSON,
        });

      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      const retrieved = await r2Service.getMatchRecord(matchId);

      const parsed = JSON.parse(retrieved!);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chatEvent = parsed.events.find((e: any) => e.event_type === 'chat');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((chatEvent.data as any).message).toContain('🎮');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expect((chatEvent.data as any).message).toContain('你好');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple concurrent uploads', async () => {
      const matchIds = ['match-1', 'match-2', 'match-3'];
      const uploads = matchIds.map(matchId => {
        const matchRecord = createMockMatchRecord(matchId);
        const matchRecordJSON = JSON.stringify(matchRecord);

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, matchId, url: `matches/${matchId}.json` }),
        });

        return r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      });

      const results = await Promise.all(uploads);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        expect(result).toBe(`matches/${matchIds[index]}.json`);
      });
    });

    it('should handle concurrent read operations', async () => {
      const matchIds = ['match-1', 'match-2', 'match-3'];
      const reads = matchIds.map(matchId => {
        const matchRecord = createMockMatchRecord(matchId);
        const matchRecordJSON = JSON.stringify(matchRecord);

        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => matchRecordJSON,
        });

        return r2Service.getMatchRecord(matchId);
      });

      const results = await Promise.all(reads);

      expect(results).toHaveLength(3);
      results.forEach((result, index) => {
        const parsed = JSON.parse(result!);
        expect(parsed.match_id).toBe(matchIds[index]);
      });
    });
  });
});

