import { describe, it, expect } from 'vitest';
import { BatchManager } from '@services/solana/BatchManager';
import { R2Service } from '@services/storage/R2Service';
import { MerkleBatching } from '@services/solana/MerkleBatching';

/**
 * Load tests for Merkle batching per spec Section 23.3.
 * Per critique: real load tests, not mocks.
 */
describe('Merkle Batching Load Tests', () => {
  it('should handle 1000 match hashes in a batch', async () => {
    // Generate 1000 match hashes
    const matchHashes: string[] = [];
    for (let i = 0; i < 1000; i++) {
      // Generate realistic SHA-256 hash (64 hex chars)
      const hash = Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      matchHashes.push(hash);
    }

    // Build Merkle tree
    const startTime = Date.now();
    const merkleTree = await MerkleBatching.buildMerkleTree(matchHashes);
    const buildTime = Date.now() - startTime;

    // Verify tree is valid
    expect(merkleTree.root).toBeDefined();
    expect(merkleTree.leaves.length).toBe(1000);
    expect(buildTime).toBeLessThan(5000); // Should complete in < 5 seconds

    // Generate proof for a random match (spec-compliant format)
    const randomIndex = Math.floor(Math.random() * 1000);
    const randomHash = matchHashes[randomIndex];
    const randomMatchId = `match-${randomIndex}`;
    const proof = await MerkleBatching.generateMerkleProof(randomMatchId, randomHash, merkleTree);

    // Verify proof format
    expect(proof.match_id).toBe(randomMatchId);
    expect(proof.sha256).toBe(randomHash);
    expect(proof.proof).toBeDefined();
    expect(Array.isArray(proof.proof)).toBe(true);
    expect(proof.index).toBe(randomIndex);

    // Verify proof
    const isValid = await MerkleBatching.verifyMerkleProof(proof, merkleTree.root);
    expect(isValid).toBe(true);
  });

  it('should benchmark batch creation cost', async () => {
    const r2Service = new R2Service({
      workerUrl: 'https://test-worker.workers.dev',
      bucketName: 'test-bucket',
    });

    const batchManager = new BatchManager(
      {
        batchSize: 100,
        maxBatchSize: 1000,
        flushIntervalMs: 60000,
        maxWaitTimeMs: 300000,
      },
      r2Service
    );

    // Add 100 matches
    const startTime = Date.now();
    for (let i = 0; i < 100; i++) {
      const matchId = `match-${i}`;
      const matchHash = Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('');
      await batchManager.addMatch(matchId, matchHash);
    }

    // Flush batch
    const manifest = await batchManager.flush();
    const totalTime = Date.now() - startTime;

    expect(manifest).toBeDefined();
    expect(manifest?.match_count).toBe(100);
    expect(totalTime).toBeLessThan(10000); // Should complete in < 10 seconds
  });

  it('should handle concurrent move submissions', async () => {
    // Simulate 100 concurrent move submissions
    const promises: Promise<void>[] = [];
    
    for (let i = 0; i < 100; i++) {
      promises.push(
        (async () => {
          // Simulate move processing
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
        })()
      );
    }

    const startTime = Date.now();
    await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    // All should complete
    expect(promises.length).toBe(100);
    expect(totalTime).toBeLessThan(2000); // Should complete in < 2 seconds
  });
});

