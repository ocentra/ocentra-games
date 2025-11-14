#!/usr/bin/env tsx
/**
 * Concurrent move submission test per spec Section 23.3.
 * Tests throughput, conflict rate, retry rate, and average confirmation time.
 */

import { Connection, Keypair } from '@solana/web3.js';
import { AnchorClient } from '@services/solana/AnchorClient';
import { GameClient } from '@services/solana/GameClient';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface ConcurrentTestResult {
  totalMoves: number;
  successful: number;
  failed: number;
  conflicts: number;
  retries: number;
  throughput: number; // moves/second
  latencies: {
    avg: number;
    p95: number;
    p99: number;
  };
  conflictRate: number;
  retryRate: number;
}

async function testConcurrentMoves(): Promise<ConcurrentTestResult> {
  console.log('Starting concurrent move submission test...');

  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpcUrl, 'confirmed');
  
  // Create AnchorClient - use a keypair as wallet for testing
  // Note: AnchorClient constructor accepts Wallet interface from @coral-xyz/anchor
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

  // Create a test match
  const players = Array.from({ length: 4 }, () => Keypair.generate());
  const gameType = 0; // Default game type
  const seed = Math.floor(Math.random() * 1000000);
  const matchId = await gameClient.createMatch(
    gameType,
    seed,
    { publicKey: players[0].publicKey, signTransaction: async (tx: unknown) => tx as never }
  );

  console.log(`Created test match: ${matchId}`);

  // Start match
  await gameClient.startMatch(matchId, { publicKey: players[0].publicKey, signTransaction: async (tx: unknown) => tx as never });

  const totalMoves = 100;
  const concurrentMoves = 10; // Submit 10 moves concurrently
  const latencies: number[] = [];
  let successful = 0;
  let failed = 0;
  let conflicts = 0;
  let retries = 0;

  console.log(`Submitting ${totalMoves} moves with ${concurrentMoves} concurrent submissions...`);

  const startTime = Date.now();

  for (let batch = 0; batch < totalMoves; batch += concurrentMoves) {
    const batchPromises: Promise<void>[] = [];

    for (let i = 0; i < concurrentMoves && (batch + i) < totalMoves; i++) {
      const moveIndex = batch + i;
      const playerIndex = moveIndex % 4;
      const player = players[playerIndex];

      const promise = (async () => {
        const moveStartTime = Date.now();
        let attempts = 0;
        let success = false;

        while (attempts < 3 && !success) {
          try {
            await gameClient.submitMove(
              matchId,
              {
                type: 'pick_up',
                playerId: player.publicKey.toBase58(),
                data: { card: '2H' },
                timestamp: new Date(),
              },
              { publicKey: player.publicKey, signTransaction: async (tx: unknown) => tx as never }
            );

            const latency = Date.now() - moveStartTime;
            latencies.push(latency);
            successful++;
            success = true;
          } catch (error) {
            attempts++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            
            if (errorMsg.includes('conflict') || errorMsg.includes('already') || errorMsg.includes('duplicate')) {
              conflicts++;
              if (attempts > 1) {
                retries++;
              }
              break; // Don't retry conflicts
            }

            if (attempts < 3) {
              retries++;
              await new Promise(resolve => setTimeout(resolve, 100 * attempts)); // Exponential backoff
            } else {
              failed++;
              console.error(`Failed to submit move ${moveIndex} after ${attempts} attempts:`, errorMsg);
            }
          }
        }
      })();

      batchPromises.push(promise);
    }

    await Promise.all(batchPromises);

    if ((batch + concurrentMoves) % 50 === 0) {
      console.log(`Submitted ${Math.min(batch + concurrentMoves, totalMoves)}/${totalMoves} moves...`);
    }
  }

  const totalTime = Date.now() - startTime;
  const throughput = (successful / totalTime) * 1000; // moves per second

  // Calculate percentiles
  const sortedLatencies = [...latencies].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedLatencies.length * 0.95);
  const p99Index = Math.floor(sortedLatencies.length * 0.99);

  const results: ConcurrentTestResult = {
    totalMoves,
    successful,
    failed,
    conflicts,
    retries,
    throughput,
    latencies: {
      avg: latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0,
      p95: sortedLatencies[p95Index] || 0,
      p99: sortedLatencies[p99Index] || 0,
    },
    conflictRate: (conflicts / totalMoves) * 100,
    retryRate: (retries / totalMoves) * 100,
  };

  return results;
}

// Run test
testConcurrentMoves()
  .then((results) => {
    console.log('\n=== Concurrent Move Test Results ===');
    console.log(`Total moves: ${results.totalMoves}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Conflicts: ${results.conflicts}`);
    console.log(`Retries: ${results.retries}`);
    console.log(`Throughput: ${results.throughput.toFixed(2)} moves/second`);
    console.log(`\nLatency (ms):`);
    console.log(`  Average: ${results.latencies.avg.toFixed(2)}`);
    console.log(`  P95: ${results.latencies.p95.toFixed(2)}`);
    console.log(`  P99: ${results.latencies.p99.toFixed(2)}`);
    console.log(`\nRates:`);
    console.log(`  Conflict rate: ${results.conflictRate.toFixed(2)}%`);
    console.log(`  Retry rate: ${results.retryRate.toFixed(2)}%`);

    // Save results
    const resultsDir = join(process.cwd(), 'load-test-results');
    mkdirSync(resultsDir, { recursive: true });
    const resultsPath = join(resultsDir, 'concurrent-moves.json');
    writeFileSync(resultsPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to ${resultsPath}`);

    // Check against targets (per spec Section 26.2)
    const targets = {
      throughput: 100, // moves/second
      conflictRate: 1, // <1%
      retryRate: 5, // <5%
      avgLatency: 1500, // <1.5s
    };

    console.log('\n=== Target Comparison ===');
    console.log(`Throughput: ${results.throughput.toFixed(2)} moves/s (target: >${targets.throughput}) ${results.throughput >= targets.throughput ? '✓' : '✗'}`);
    console.log(`Conflict rate: ${results.conflictRate.toFixed(2)}% (target: <${targets.conflictRate}%) ${results.conflictRate < targets.conflictRate ? '✓' : '✗'}`);
    console.log(`Retry rate: ${results.retryRate.toFixed(2)}% (target: <${targets.retryRate}%) ${results.retryRate < targets.retryRate ? '✓' : '✗'}`);
    console.log(`Avg latency: ${results.latencies.avg.toFixed(2)}ms (target: <${targets.avgLatency}ms) ${results.latencies.avg < targets.avgLatency ? '✓' : '✗'}`);
  })
  .catch((error) => {
    console.error('Concurrent move test failed:', error);
    process.exit(1);
  });

