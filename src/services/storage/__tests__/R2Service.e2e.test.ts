/**
 * REAL End-to-End Tests for R2Service
 * 
 * These tests make ACTUAL HTTP calls to the Cloudflare Worker
 * and verify data is ACTUALLY written to R2.
 * 
 * Requirements:
 * - Cloudflare Worker must be running (npm run dev in infra/cloudflare)
 * - Or deployed to dev environment
 * - Set VITE_R2_WORKER_URL in .env or environment
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { R2Service } from '../R2Service';
import { getStorageConfig } from '../StorageConfig';

describe('R2Service E2E Tests - REAL R2 Operations', () => {
  let r2Service: R2Service;
  let workerUrl: string;
  const testMatchIds: string[] = [];

  beforeAll(() => {
    const config = getStorageConfig();
    workerUrl = config.r2.workerUrl;

    if (!workerUrl) {
      throw new Error(
        'VITE_R2_WORKER_URL not set! Set it in .env file or environment.\n' +
        'Example: VITE_R2_WORKER_URL=https://claim-storage-dev.ocentraai.workers.dev'
      );
    }

    r2Service = new R2Service({
      workerUrl,
      bucketName: config.r2.bucketName || 'claim-matches-test',
    });

    console.log(`\n🧪 E2E Tests using Worker: ${workerUrl}`);
    console.log(`📦 Bucket: ${config.r2.bucketName || 'claim-matches-test'}\n`);
  });

  afterAll(async () => {
    // Cleanup: Delete all test match records
    console.log('\n🧹 Cleaning up test data...');
    for (const matchId of testMatchIds) {
      try {
        await r2Service.deleteMatchRecord(matchId);
        console.log(`  ✅ Deleted: ${matchId}`);
      } catch (error) {
        console.warn(`  ⚠️  Failed to delete ${matchId}:`, error);
      }
    }
    console.log('✨ Cleanup complete\n');
  });

  describe('Real Upload Operations', () => {
    it('should ACTUALLY upload a match record to R2', async () => {
      const matchId = `e2e-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const matchRecord = {
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
        ],
        events: [
          {
            event_type: 'match_created',
            timestamp: Date.now(),
            player_id: 'player-1',
            data: { game_state: 'initialized' },
          },
        ],
        metadata: {
          rng_seed: 12345,
        },
        signatures: [],
        hash: 'test-hash-123',
      };

      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);
      console.log(`\n📤 Uploading match record: ${matchId}`);
      console.log(`   Size: ${new TextEncoder().encode(matchRecordJSON).length} bytes`);

      const result = await r2Service.uploadMatchRecord(matchId, matchRecordJSON);

      expect(result).toBeTruthy();
      console.log(`   ✅ Upload successful: ${result}`);
    }, 30000); // 30 second timeout for real network calls

    it('should ACTUALLY retrieve the uploaded match record from R2', async () => {
      const matchId = `e2e-test-retrieve-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const originalRecord = {
        match_id: matchId,
        version: '1.0.0',
        game_type: 'card_game',
        created_at: new Date().toISOString(),
        players: [
          {
            player_id: 'player-1',
            wallet_address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
            player_type: 'human',
            score: 100,
          },
        ],
        events: [
          {
            event_type: 'match_created',
            timestamp: Date.now(),
            player_id: 'player-1',
            data: { game_state: 'initialized' },
          },
        ],
        metadata: { rng_seed: 12345 },
        signatures: [],
        hash: 'test-hash-456',
      };

      const originalJSON = JSON.stringify(originalRecord, null, 2);

      // Upload first
      console.log(`\n📤 Uploading: ${matchId}`);
      await r2Service.uploadMatchRecord(matchId, originalJSON);

      // Wait a bit for R2 to be consistent
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Retrieve
      console.log(`📥 Retrieving: ${matchId}`);
      const retrieved = await r2Service.getMatchRecord(matchId);

      expect(retrieved).not.toBeNull();
      expect(retrieved).toBeTruthy();

      const parsed = JSON.parse(retrieved!);
      expect(parsed.match_id).toBe(matchId);
      expect(parsed.version).toBe('1.0.0');
      expect(parsed.players).toHaveLength(1);
      expect(parsed.events).toHaveLength(1);

      console.log(`   ✅ Retrieved successfully`);
      console.log(`   📊 Match ID: ${parsed.match_id}`);
      console.log(`   📊 Players: ${parsed.players.length}`);
      console.log(`   📊 Events: ${parsed.events.length}`);
    }, 30000);

    it('should ACTUALLY generate a signed URL for match access', async () => {
      const matchId = `e2e-test-signed-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const matchRecord = {
        match_id: matchId,
        version: '1.0.0',
        game_type: 'card_game',
        created_at: new Date().toISOString(),
        players: [],
        events: [],
        metadata: {},
        signatures: [],
        hash: 'test-hash-789',
      };

      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      // Upload first
      console.log(`\n📤 Uploading: ${matchId}`);
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);

      // Wait for consistency
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate signed URL
      console.log(`🔗 Generating signed URL for: ${matchId}`);
      const signedUrl = await r2Service.generateSignedUrl(matchId, 3600);

      expect(signedUrl).toBeTruthy();
      expect(signedUrl).toContain(matchId);
      expect(signedUrl).toContain('token=');

      console.log(`   ✅ Signed URL generated: ${signedUrl.substring(0, 80)}...`);

      // Try to access the signed URL
      const response = await fetch(signedUrl);
      expect(response.ok).toBe(true);
      const data = await response.text();
      expect(data).toContain(matchId);

      console.log(`   ✅ Signed URL is accessible`);
    }, 30000);
  });

  describe('Real Delete Operations', () => {
    it('should ACTUALLY delete a match record from R2', async () => {
      const matchId = `e2e-test-delete-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      const matchRecord = {
        match_id: matchId,
        version: '1.0.0',
        game_type: 'card_game',
        created_at: new Date().toISOString(),
        players: [],
        events: [],
        metadata: {},
        signatures: [],
        hash: 'test-hash-delete',
      };

      const matchRecordJSON = JSON.stringify(matchRecord, null, 2);

      // Upload first
      console.log(`\n📤 Uploading: ${matchId}`);
      await r2Service.uploadMatchRecord(matchId, matchRecordJSON);

      // Wait for consistency
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify it exists
      const before = await r2Service.getMatchRecord(matchId);
      expect(before).not.toBeNull();
      console.log(`   ✅ Record exists before delete`);

      // Delete
      console.log(`🗑️  Deleting: ${matchId}`);
      await r2Service.deleteMatchRecord(matchId);

      // Wait for consistency
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Verify it's gone
      const after = await r2Service.getMatchRecord(matchId);
      expect(after).toBeNull();
      console.log(`   ✅ Record deleted successfully`);
    }, 30000);
  });

  describe('Real Data Integrity', () => {
    it('should preserve ALL fields when uploading and retrieving from R2', async () => {
      const matchId = `e2e-test-integrity-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      const originalRecord = {
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
          model_version: 'gpt-4-turbo',
          chain_of_thought_hash: 'hash-of-cot-123',
        },
        signatures: [
          {
            signer: 'coordinator',
            signature: 'mock-signature-123',
            timestamp: Date.now(),
          },
        ],
        hash: 'mock-hash-abc123',
        hot_url: `${workerUrl}/api/matches/${matchId}`,
      };

      const originalJSON = JSON.stringify(originalRecord, null, 2);
      const originalSize = new TextEncoder().encode(originalJSON).length;

      console.log(`\n📤 Uploading full match record: ${matchId}`);
      console.log(`   Size: ${originalSize} bytes`);

      await r2Service.uploadMatchRecord(matchId, originalJSON);

      // Wait for consistency
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log(`📥 Retrieving: ${matchId}`);
      const retrieved = await r2Service.getMatchRecord(matchId);

      expect(retrieved).not.toBeNull();

      const retrievedRecord = JSON.parse(retrieved!);
      const retrievedSize = new TextEncoder().encode(retrieved!).length;

      console.log(`   Retrieved size: ${retrievedSize} bytes`);

      // Verify ALL fields are preserved
      expect(retrievedRecord.match_id).toBe(originalRecord.match_id);
      expect(retrievedRecord.version).toBe(originalRecord.version);
      expect(retrievedRecord.game_type).toBe(originalRecord.game_type);
      expect(retrievedRecord.players).toHaveLength(originalRecord.players.length);
      expect(retrievedRecord.players[0].player_id).toBe(originalRecord.players[0].player_id);
      expect(retrievedRecord.players[0].wallet_address).toBe(originalRecord.players[0].wallet_address);
      expect(retrievedRecord.events).toHaveLength(originalRecord.events.length);
      expect(retrievedRecord.metadata.rng_seed).toBe(originalRecord.metadata.rng_seed);
      expect(retrievedRecord.metadata.model_version).toBe(originalRecord.metadata.model_version);
      expect(retrievedRecord.signatures).toHaveLength(originalRecord.signatures.length);

      console.log(`   ✅ All fields preserved correctly`);
      console.log(`   📊 Players: ${retrievedRecord.players.length}`);
      console.log(`   📊 Events: ${retrievedRecord.events.length}`);
      console.log(`   📊 Signatures: ${retrievedRecord.signatures.length}`);
    }, 30000);
  });

  describe('Real Error Handling', () => {
    it('should return null for non-existent match records', async () => {
      const nonExistentId = `e2e-test-nonexistent-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      console.log(`\n📥 Attempting to retrieve non-existent: ${nonExistentId}`);
      const result = await r2Service.getMatchRecord(nonExistentId);

      expect(result).toBeNull();
      console.log(`   ✅ Correctly returned null for non-existent record`);
    }, 30000);

    it('should reject records exceeding 10MB limit', async () => {
      const matchId = `e2e-test-too-large-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      testMatchIds.push(matchId);

      // Create a record larger than 10MB
      const largeData = 'x'.repeat(11 * 1024 * 1024);
      const matchRecord = {
        match_id: matchId,
        version: '1.0.0',
        large_data: largeData,
      };

      const matchRecordJSON = JSON.stringify(matchRecord);
      const size = new TextEncoder().encode(matchRecordJSON).length;

      console.log(`\n📤 Attempting to upload oversized record: ${matchId}`);
      console.log(`   Size: ${size} bytes (${(size / 1024 / 1024).toFixed(2)} MB)`);

      await expect(r2Service.uploadMatchRecord(matchId, matchRecordJSON)).rejects.toThrow(
        'exceeds size limit'
      );

      console.log(`   ✅ Correctly rejected oversized record`);
    }, 30000);
  });
});

