// Using globals from vitest.config.ts (globals: true)
import { vi } from 'vitest' // vi is NOT a global, must be imported
import { R2Service } from '@/adapters/storage/R2Service';
import { loadMatchRecord } from '@test-data';

/**
 * Integration tests for R2Service using real test data from test-data/ folder.
 * Tests full write/read cycles, error handling, and edge cases.
 * Uses canonical match records that flow through the entire system.
 */

describe('R2Service Integration Tests with Real Test Data', () => {
  let r2Service: R2Service;
  const mockConfig = {
    workerUrl: 'https://test-worker.workers.dev',
    bucketName: 'test-bucket',
  };

  // Helper to create a match record from test-data with custom match_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMatchRecordFromTestData = (matchId: string, testDataName: string = 'claim-4player-complete'): any => {
    const baseRecord = loadMatchRecord(testDataName);
    return {
      ...baseRecord,
      match_id: matchId, // Override match_id for test isolation
    };
  };

  beforeEach(() => {
    r2Service = new R2Service(mockConfig);
    vi.clearAllMocks();
  });

  describe('Full Write/Read Cycle', () => {
    it('should upload and retrieve a complete match record', async () => {
      const matchId = 'test-match-full-cycle';
      const matchRecord = createMatchRecordFromTestData(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      // Mock upload - R2Service calls response.text() first
      const mockResponse = { success: true, matchId, url: `matches/${matchId}.json` };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
        json: async () => mockResponse,
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
      expect(parsed.players).toHaveLength(4); // claim-4player-complete has 4 players
      expect(parsed.moves).toBeDefined(); // Test data uses 'moves' not 'events'
    });

    it('should handle large match records with many events', async () => {
      const matchId = 'test-match-large';
      const matchRecord = createMatchRecordFromTestData(matchId);
      
      // Initialize events array if it doesn't exist
      if (!matchRecord.events) {
        matchRecord.events = [];
      }
      
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

      const mockResponse = { success: true, matchId, url: `matches/${matchId}.json` };
      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
        json: async () => mockResponse,
      });

      const result = await r2Service.uploadMatchRecord(matchId, matchRecordJSON);
      expect(result).toBe(`matches/${matchId}.json`);
    });

    it('should handle match records with AI chain-of-thought', async () => {
      const matchId = 'test-match-ai';
      const matchRecord = createMatchRecordFromTestData(matchId);
      
      // Initialize metadata if it doesn't exist
      if (!matchRecord.metadata) {
        matchRecord.metadata = {};
      }
      
      matchRecord.metadata.model_version = 'gpt-4-turbo';
      matchRecord.metadata.chain_of_thought_hash = 'hash-of-cot-123';
      
      // Initialize events array if it doesn't exist
      if (!matchRecord.events) {
        matchRecord.events = [];
      }
      
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

      const mockResponse = { success: true, matchId, url: `matches/${matchId}.json` };
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify(mockResponse),
          json: async () => mockResponse,
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
        ...createMatchRecordFromTestData(matchId),
        large_data: largeData,
      };
      const matchRecordJSON = JSON.stringify(matchRecord);

      await expect(r2Service.uploadMatchRecord(matchId, matchRecordJSON)).rejects.toThrow(
        'exceeds size limit'
      );
    });

    it('should handle network errors during upload with retry', async () => {
      const matchId = 'test-match-retry';
      const matchRecord = createMatchRecordFromTestData(matchId);
      const matchRecordJSON = JSON.stringify(matchRecord);

      // First two attempts fail, third succeeds
      const mockResponse = { success: true, matchId, url: `matches/${matchId}.json` };
      global.fetch = vi
        .fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify(mockResponse),
          json: async () => mockResponse,
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
      const originalRecord = createMatchRecordFromTestData(matchId);
      const originalJSON = JSON.stringify(originalRecord, null, 2);

      const mockResponse = { success: true, matchId, url: `matches/${matchId}.json` };
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify(mockResponse),
          json: async () => mockResponse,
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
      expect(retrievedRecord.moves).toEqual(originalRecord.moves); // Test data uses 'moves'
      // events and metadata may not exist in test data, so check conditionally
      if (originalRecord.events) {
        expect(retrievedRecord.events).toEqual(originalRecord.events);
      }
      if (originalRecord.metadata) {
        expect(retrievedRecord.metadata).toEqual(originalRecord.metadata);
      }
      expect(retrievedRecord.signatures).toEqual(originalRecord.signatures);
    });

    it('should handle special characters in match data', async () => {
      const matchId = 'test-match-special-chars';
      const matchRecord = createMatchRecordFromTestData(matchId);
      
      // Initialize events array if it doesn't exist
      if (!matchRecord.events) {
        matchRecord.events = [];
      }
      
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

      const mockResponse = { success: true, matchId, url: `matches/${matchId}.json` };
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify(mockResponse),
          json: async () => mockResponse,
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
        const matchRecord = createMatchRecordFromTestData(matchId);
        const matchRecordJSON = JSON.stringify(matchRecord);

        const mockResponse = { success: true, matchId, url: `matches/${matchId}.json` };
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          text: async () => JSON.stringify(mockResponse),
          json: async () => mockResponse,
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
        const matchRecord = createMatchRecordFromTestData(matchId);
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

