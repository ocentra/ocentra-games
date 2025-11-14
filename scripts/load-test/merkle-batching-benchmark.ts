#!/usr/bin/env tsx
/**
 * Merkle batching benchmark per spec Section 23.3.
 * Measures batch creation time, cost per match, and verification time.
 */

import { MerkleBatching } from '@services/solana/MerkleBatching';
// BatchManager and R2Service not used in this benchmark - only MerkleBatching is needed
// import { BatchManager } from '@services/solana/BatchManager';
// import { R2Service } from '@services/storage/R2Service';
import { HashService } from '@lib/crypto/HashService';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface BenchmarkResult {
  batchSize: number;
  batchCreationTime: number;
  costPerMatch: number;
  verificationTime: number;
  totalMatches: number;
  totalBatches: number;
}

async function benchmarkMerkleBatching(): Promise<BenchmarkResult> {
  console.log('Starting Merkle batching benchmark...');

  const batchSize = 100; // Per spec Section 34.1
  const totalMatches = 1000;

  // Generate match hashes
  const matchHashes: string[] = [];
  const matchIds: string[] = [];

  console.log(`Generating ${totalMatches} match hashes...`);
  for (let i = 0; i < totalMatches; i++) {
    const matchId = `match-${i}`;
    const matchData = new TextEncoder().encode(JSON.stringify({ matchId, index: i }));
    const hash = await HashService.hashMatchRecord(matchData);
    matchHashes.push(hash);
    matchIds.push(matchId);
  }

  // Benchmark batch creation
  console.log('Benchmarking batch creation...');
  const startTime = Date.now();

  const batches: string[][] = [];
  for (let i = 0; i < totalMatches; i += batchSize) {
    const batchHashes = matchHashes.slice(i, i + batchSize);
    await MerkleBatching.buildMerkleTree(batchHashes); // Build tree for timing
    batches.push(batchHashes);
  }

  const batchCreationTime = Date.now() - startTime;

  // Benchmark verification
  console.log('Benchmarking proof verification...');
  const verifyStartTime = Date.now();

  // verifiedCount not used - verification timing is what matters for benchmark
  // let verifiedCount = 0;
  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batchHashes = batches[batchIndex];
    const merkleTree = await MerkleBatching.buildMerkleTree(batchHashes);

    // Verify a few proofs from each batch
    for (let i = 0; i < Math.min(10, batchHashes.length); i++) {
      const matchId = matchIds[batchIndex * batchSize + i];
      const matchHash = batchHashes[i];
      const proof = await MerkleBatching.generateMerkleProof(matchId, matchHash, merkleTree);
      const isValid = await MerkleBatching.verifyMerkleProof(proof, merkleTree.root);
      // Verification result used for timing measurement, not counting
      void isValid; // Suppress unused warning
    }
  }

  const verificationTime = Date.now() - verifyStartTime;

  // Cost estimation (per spec Section 26.1: ~0.0002 SOL per batch)
  const costPerBatch = 0.0002;
  const totalBatches = Math.ceil(totalMatches / batchSize);
  const costPerMatch = (costPerBatch * totalBatches) / totalMatches;

  const results: BenchmarkResult = {
    batchSize,
    batchCreationTime,
    costPerMatch,
    verificationTime,
    totalMatches,
    totalBatches,
  };

  return results;
}

// Run benchmark
benchmarkMerkleBatching()
  .then((results) => {
    console.log('\n=== Merkle Batching Benchmark Results ===');
    console.log(`Batch size: ${results.batchSize}`);
    console.log(`Total matches: ${results.totalMatches}`);
    console.log(`Total batches: ${results.totalBatches}`);
    console.log(`Batch creation time: ${results.batchCreationTime}ms`);
    console.log(`Cost per match: ${results.costPerMatch.toFixed(8)} SOL`);
    console.log(`Verification time: ${results.verificationTime}ms`);
    console.log(`Verification time per match: ${(results.verificationTime / results.totalMatches).toFixed(2)}ms`);

    // Save results
    const resultsDir = join(process.cwd(), 'load-test-results');
    mkdirSync(resultsDir, { recursive: true });
    const resultsPath = join(resultsDir, 'merkle-batching-benchmark.json');
    writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to ${resultsPath}`);

    // Check against targets (per spec Section 26.2)
    const targets = {
      batchCreationTime: 1000, // <1s per spec
      verificationTime: 100, // <100ms per match per spec
      costPerMatch: 0.000002, // ~100x reduction per spec
    };

    console.log('\n=== Target Comparison ===');
    console.log(`Batch creation: ${results.batchCreationTime}ms (target: <${targets.batchCreationTime}ms) ${results.batchCreationTime < targets.batchCreationTime ? '✓' : '✗'}`);
    console.log(`Verification: ${(results.verificationTime / results.totalMatches).toFixed(2)}ms/match (target: <${targets.verificationTime}ms) ${(results.verificationTime / results.totalMatches) < targets.verificationTime ? '✓' : '✗'}`);
    console.log(`Cost per match: ${results.costPerMatch.toFixed(8)} SOL (target: <${targets.costPerMatch} SOL) ${results.costPerMatch < targets.costPerMatch ? '✓' : '✗'}`);
  })
  .catch((error) => {
    console.error('Benchmark failed:', error);
    process.exit(1);
  });

