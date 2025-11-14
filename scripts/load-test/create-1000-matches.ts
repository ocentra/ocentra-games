#!/usr/bin/env tsx
/**
 * Load test: Create 1000 matches per spec Section 23.3.
 * Measures success rate, latency, and cost per operation.
 */

import { Connection, Keypair } from '@solana/web3.js';
import { AnchorClient } from '@services/solana/AnchorClient';
import { GameClient } from '@services/solana/GameClient';
// MatchCoordinator and R2Service not used in this test - matches are created directly via gameClient
// import { MatchCoordinator } from '@services/solana/MatchCoordinator';
// import { R2Service } from '@services/storage/R2Service';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface LoadTestResult {
  totalMatches: number;
  successful: number;
  failed: number;
  successRate: number;
  latencies: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
  };
  costs: {
    totalSOL: number;
    avgPerMatch: number;
  };
  errors: string[];
}

function calculatePercentile(values: number[], percentile: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function create1000Matches(): Promise<LoadTestResult> {
  console.log('Starting 1000 match creation load test...');

  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  
  // Create AnchorClient - use a keypair as wallet for testing
  const stubKeypair = Keypair.generate();
  const stubWallet = {
    publicKey: stubKeypair.publicKey,
    signTransaction: async (tx: unknown) => {
      const transaction = tx as { sign: (keypair: Keypair) => void };
      transaction.sign(stubKeypair);
      return transaction as never;
    },
    signAllTransactions: async (txs: unknown[]) => {
      return txs.map(tx => {
        const transaction = tx as { sign: (keypair: Keypair) => void };
        transaction.sign(stubKeypair);
        return transaction;
      }) as never[];
    },
  };
  // Use type assertion to match Wallet interface (not NodeWallet which requires payer)
  const anchorClient = new AnchorClient(connection, stubWallet as never);
  const gameClient = new GameClient(anchorClient);


  const results: LoadTestResult = {
    totalMatches: 1000,
    successful: 0,
    failed: 0,
    successRate: 0,
    latencies: {
      avg: 0,
      p50: 0,
      p95: 0,
      p99: 0,
      min: 0,
      max: 0,
    },
    costs: {
      totalSOL: 0,
      avgPerMatch: 0,
    },
    errors: [],
  };

  const latencies: number[] = [];
  const errors: string[] = [];

  // Generate test keypairs
  const players = Array.from({ length: 4 }, () => Keypair.generate());

  console.log(`Creating ${results.totalMatches} matches...`);

  for (let i = 0; i < results.totalMatches; i++) {
    try {
      const startTime = Date.now();

      // Create match
      const gameType = 0; // Default game type
      const seed = Math.floor(Math.random() * 1000000);
      await gameClient.createMatch(
        gameType,
        seed,
        { publicKey: players[0].publicKey, signTransaction: async (tx: unknown) => tx as never }
      );

      const latency = Date.now() - startTime;
      latencies.push(latency);
      results.successful++;

      if ((i + 1) % 100 === 0) {
        console.log(`Created ${i + 1}/${results.totalMatches} matches...`);
      }
    } catch (error) {
      results.failed++;
      const errorMsg = error instanceof Error ? error.message : String(error);
      errors.push(`Match ${i + 1}: ${errorMsg}`);
      console.error(`Failed to create match ${i + 1}:`, errorMsg);
    }
  }

  // Calculate statistics
  results.successRate = (results.successful / results.totalMatches) * 100;

  if (latencies.length > 0) {
    results.latencies.avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    results.latencies.p50 = calculatePercentile(latencies, 50);
    results.latencies.p95 = calculatePercentile(latencies, 95);
    results.latencies.p99 = calculatePercentile(latencies, 99);
    results.latencies.min = Math.min(...latencies);
    results.latencies.max = Math.max(...latencies);
  }

  // Cost estimation (per spec Section 26.1: ~0.0005 SOL per match creation)
  results.costs.avgPerMatch = 0.0005; // Estimated from spec
  results.costs.totalSOL = results.successful * results.costs.avgPerMatch;

  results.errors = errors.slice(0, 10); // Keep first 10 errors

  return results;
}

// Run load test
create1000Matches()
  .then((results) => {
    console.log('\n=== Load Test Results ===');
    console.log(`Total matches: ${results.totalMatches}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success rate: ${results.successRate.toFixed(2)}%`);
    console.log(`\nLatency (ms):`);
    console.log(`  Average: ${results.latencies.avg.toFixed(2)}`);
    console.log(`  P50: ${results.latencies.p50.toFixed(2)}`);
    console.log(`  P95: ${results.latencies.p95.toFixed(2)}`);
    console.log(`  P99: ${results.latencies.p99.toFixed(2)}`);
    console.log(`  Min: ${results.latencies.min}`);
    console.log(`  Max: ${results.latencies.max}`);
    console.log(`\nCosts:`);
    console.log(`  Total: ${results.costs.totalSOL.toFixed(6)} SOL`);
    console.log(`  Per match: ${results.costs.avgPerMatch.toFixed(6)} SOL`);

    // Save results
    const resultsDir = join(process.cwd(), 'load-test-results');
    mkdirSync(resultsDir, { recursive: true });
    const resultsPath = join(resultsDir, 'create-1000-matches.json');
    writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to ${resultsPath}`);

    // Check against targets (per spec Section 26.2)
    const targets = {
      successRate: 95,
      avgLatency: 2000,
      p95Latency: 5000,
      p99Latency: 10000,
    };

    console.log('\n=== Target Comparison ===');
    console.log(`Success rate: ${results.successRate.toFixed(2)}% (target: >${targets.successRate}%) ${results.successRate >= targets.successRate ? '✓' : '✗'}`);
    console.log(`Avg latency: ${results.latencies.avg.toFixed(2)}ms (target: <${targets.avgLatency}ms) ${results.latencies.avg < targets.avgLatency ? '✓' : '✗'}`);
    console.log(`P95 latency: ${results.latencies.p95.toFixed(2)}ms (target: <${targets.p95Latency}ms) ${results.latencies.p95 < targets.p95Latency ? '✓' : '✗'}`);
    console.log(`P99 latency: ${results.latencies.p99.toFixed(2)}ms (target: <${targets.p99Latency}ms) ${results.latencies.p99 < targets.p99Latency ? '✓' : '✗'}`);

    if (results.successRate < targets.successRate) {
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Load test failed:', error);
    process.exit(1);
  });

