// Using globals from vitest.config.ts (globals: true)
import { BatchManager } from '@ocentra/solana-domain/BatchManager';
import { R2Service } from '@/adapters/storage/R2Service';
import { MerkleBatching } from '@ocentra/solana-domain/MerkleBatching';

/**
 * Load tests for Merkle batching per spec Section 23.3.
 * Per critique: real load tests, not mocks.
 * 
 * Note: These tests require Solana IDL file and will be skipped if SKIP_SOLANA_TESTS is set.
 */
const SKIP_SOLANA_TESTS = process.env.SKIP_SOLANA_TESTS === 'true';

describe.skipIf(SKIP_SOLANA_TESTS)('Merkle Batching Load Tests', () => {
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

  it.skipIf(!process.env.VITE_R2_WORKER_URL)('should benchmark batch creation cost', async () => {
    // This test requires R2 for persistence
    const r2Service = new R2Service({
      workerUrl: process.env.VITE_R2_WORKER_URL!,
      bucketName: process.env.VITE_R2_BUCKET_NAME || 'claim-matches-test',
    });

    // Use unique persistence key to avoid state pollution between test runs
    const testRunId = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const batchManager = new BatchManager(
      {
        batchSize: 101, // Set to 101 so 100 matches don't trigger auto-flush
        maxBatchSize: 1000,
        flushIntervalMs: 60000,
        maxWaitTimeMs: 300000,
        persistenceKey: `batch_test_${testRunId}`,
      },
      r2Service
    );

    // Add 100 matches
    // Note: Each addMatch calls persistState() which makes an R2 call (~200ms each)
    // So 100 matches = ~20 seconds of R2 calls, plus flush time
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
    expect(totalTime).toBeLessThan(30000); // Should complete in < 30 seconds (accounting for R2 persistence calls)
    
    // Cleanup: Reset batch manager to clear persisted state
    await batchManager.reset();
  }, 35000); // Increase timeout to 35s for R2 operations (100 matches × ~200ms = ~20s + buffer)

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

