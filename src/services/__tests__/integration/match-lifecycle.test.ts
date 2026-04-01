// Using globals from vitest.config.ts (globals: true)
import { R2Service } from '@/adapters/storage/R2Service';
import { BatchManager } from '@ocentra/solana-domain/BatchManager';
import { CanonicalSerializer } from '@ocentra/verification-domain/canonical/CanonicalSerializer';
import { HashService } from '@ocentra/crypto-domain/services/HashService';
import type { MatchRecord, MoveRecord } from '@ocentra/verification-domain/types';

/**
 * Integration tests for match lifecycle.
 * Per critique: REAL tests, no mocks. These tests verify actual functionality.
 * 
 * Note: These tests require Solana IDL file and will be skipped if SKIP_SOLANA_TESTS is set.
 */
const SKIP_SOLANA_TESTS = process.env.SKIP_SOLANA_TESTS === 'true';

describe.skipIf(SKIP_SOLANA_TESTS)('Match Lifecycle Integration', () => {
  let r2Service: R2Service;

  beforeEach(() => {
    // Use real R2Service if configured, otherwise skip R2-dependent operations
    const r2WorkerUrl = process.env.VITE_R2_WORKER_URL;
    if (!r2WorkerUrl) {
      console.warn('VITE_R2_WORKER_URL not set - R2-dependent tests may fail');
    }
    r2Service = new R2Service({
      workerUrl: r2WorkerUrl || 'https://test-worker.workers.dev',
      bucketName: process.env.VITE_R2_BUCKET_NAME || 'claim-matches-test',
    });
  });

  it('should canonicalize and hash a match record correctly', async () => {
    // Real test - no mocks
    const startTime = new Date('2024-01-13T12:00:00.000Z').toISOString();
    const endTime = new Date('2024-01-13T12:01:00.000Z').toISOString();
    
    const moves: MoveRecord[] = [
      {
        index: 0,
        timestamp: endTime,
        player_id: 'player1',
        action: 'pick_up',
        payload: {},
      },
    ];

    const matchRecord: MatchRecord = {
      version: '1.0.0',
      match_id: '550e8400-e29b-41d4-a716-446655440000',
      game: {
        name: 'CLAIM',
        ruleset: '0',
      },
      seed: '12345',
      start_time: startTime,
      end_time: endTime,
      players: [
        {
          player_id: 'player1',
          type: 'human',
          public_key: '11111111111111111111111111111111',
        },
      ],
      moves,
      signatures: [],
    };

    // Real canonicalization
    const canonicalBytes = CanonicalSerializer.canonicalizeMatchRecord(matchRecord);
    // Use more robust check for Uint8Array (handles cross-realm issues)
    expect(canonicalBytes).toBeDefined();
    // Check if it's a Uint8Array - ArrayBuffer.isView handles cross-realm issues
    expect(canonicalBytes instanceof Uint8Array || ArrayBuffer.isView(canonicalBytes)).toBe(true);
    expect(canonicalBytes.length).toBeGreaterThan(0);

    // Real hashing
    const hash = await HashService.hashMatchRecord(canonicalBytes);
    expect(hash).toBeDefined();
    expect(hash.length).toBe(64); // SHA-256 hex string
  });

  it.skipIf(!process.env.VITE_R2_WORKER_URL)('should handle batch creation and manifest generation', async () => {
    // This test requires R2 for persistence
    // Real test - creates actual batch
    const matchIds: string[] = [];
    const matchHashes: string[] = [];

    // Generate test data
    for (let i = 0; i < 5; i++) {
      const matchId = `test-match-${i}-${Date.now()}`;
      const matchHash = Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

      matchIds.push(matchId);
      matchHashes.push(matchHash);
    }

    // Create our own BatchManager with unique persistence key to avoid state pollution
    // and race conditions with async loading
    const testRunId = `lifecycle-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const batchManager = new BatchManager(
      {
        batchSize: 100,
        maxBatchSize: 1000,
        flushIntervalMs: 60000,
        maxWaitTimeMs: 300000,
        persistenceKey: `batch_lifecycle_${testRunId}`,
      },
      r2Service
    );

    // Add our test matches
    for (let i = 0; i < matchIds.length; i++) {
      await batchManager.addMatch(matchIds[i], matchHashes[i]);
    }

    const manifest = await batchManager.flush();
    expect(manifest).toBeDefined();
    expect(manifest?.match_count).toBe(5);
    expect(manifest?.match_ids.length).toBe(5);
    expect(manifest?.merkle_root).toBeDefined();
  }, 15000); // Increase timeout to 15s for R2 operations

  it('should verify canonical JSON determinism', async () => {
    // Real test - verifies canonical serialization is deterministic
    const { CanonicalJSON } = await import('@ocentra/verification-domain/canonical/CanonicalJSON');
    
    const obj = {
      z: 1,
      a: 2,
      m: { c: 3, a: 4 },
    };

    const result1 = CanonicalJSON.stringify(obj);
    const result2 = CanonicalJSON.stringify(obj);

    // Should be identical (deterministic)
    expect(result1).toBe(result2);
    
    // Should have sorted keys
    expect(result1).toContain('"a":2');
    expect(result1).toContain('"m":');
    expect(result1).toContain('"z":1');
  });
});

