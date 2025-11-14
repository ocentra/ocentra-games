import { describe, it, expect } from 'vitest';
import { CanonicalSerializer } from '@lib/match-recording/canonical/CanonicalSerializer';
import { HashService } from '@lib/crypto/HashService';
import { GameReplayVerifier } from '@services/verification/GameReplayVerifier';
import type { MatchRecord, MoveRecord } from '@lib/match-recording/types';

/**
 * Performance benchmarks for verification operations.
 * Per critique: Benchmark verification time for match records.
 */
describe('Verification Benchmarks', () => {
  const createTestMatchRecord = (numMoves: number): MatchRecord => {
    const playerId = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU';
    const now = new Date();
    const startTime = now.toISOString();
    
    const moves: MoveRecord[] = [];
    for (let i = 0; i < numMoves; i++) {
      const moveTime = new Date(now.getTime() + i * 1000);
      moves.push({
        index: i,
        timestamp: moveTime.toISOString(),
        player_id: playerId,
        action: 'pick_up',
        payload: { card: '2H' },
      });
    }

    const endTime = new Date(now.getTime() + numMoves * 1000).toISOString();

    return {
      version: '1.0.0',
      match_id: '550e8400-e29b-41d4-a716-446655440000',
      game: {
        name: 'CLAIM',
        ruleset: '0',
      },
      seed: '12345',
      players: [
        {
          player_id: playerId,
          type: 'human',
          public_key: playerId,
        },
      ],
      moves,
      start_time: startTime,
      end_time: endTime,
      signatures: [],
    };
  };

  it('should benchmark canonicalization performance', async () => {
    const matchRecord = createTestMatchRecord(100);
    
    const iterations = 100;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      CanonicalSerializer.canonicalizeMatchRecord(matchRecord);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`Canonicalization (100 moves):`);
    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log(`  Min: ${minTime.toFixed(2)}ms`);
    console.log(`  Max: ${maxTime.toFixed(2)}ms`);

    // Target: < 10ms for 100 moves
    expect(avgTime).toBeLessThan(10);
  });

  it('should benchmark hashing performance', async () => {
    const matchRecord = createTestMatchRecord(100);
    const canonicalBytes = CanonicalSerializer.canonicalizeMatchRecord(matchRecord);
    
    const iterations = 100;
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await HashService.hashMatchRecord(canonicalBytes);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`Hashing (100 moves):`);
    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log(`  Min: ${minTime.toFixed(2)}ms`);
    console.log(`  Max: ${maxTime.toFixed(2)}ms`);

    // Target: < 5ms
    expect(avgTime).toBeLessThan(5);
  });

  it('should benchmark replay verification performance', async () => {
    const matchRecord = createTestMatchRecord(50); // Reduced for faster testing
    
    const iterations = 10; // Reduced iterations for replay (slower operation)
    const times: number[] = [];

    const verifier = new GameReplayVerifier();

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await verifier.replayMatch(matchRecord);
      const end = performance.now();
      times.push(end - start);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);

    console.log(`Replay verification (50 moves):`);
    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log(`  Min: ${minTime.toFixed(2)}ms`);
    console.log(`  Max: ${maxTime.toFixed(2)}ms`);

    // Target: < 1000ms for 50 moves
    expect(avgTime).toBeLessThan(1000);
  }, 30000);

  it('should benchmark verification scalability with move count', async () => {
    const moveCounts = [10, 50, 100, 200];
    const results: { moves: number; time: number }[] = [];

    for (const moveCount of moveCounts) {
      const matchRecord = createTestMatchRecord(moveCount);
      const canonicalBytes = CanonicalSerializer.canonicalizeMatchRecord(matchRecord);
      
      const start = performance.now();
      await HashService.hashMatchRecord(canonicalBytes);
      const end = performance.now();
      
      results.push({ moves: moveCount, time: end - start });
    }

    console.log('Verification scalability:');
    results.forEach(({ moves, time }) => {
      console.log(`  ${moves} moves: ${time.toFixed(2)}ms`);
    });

    // Verify that time increases sub-linearly (or at least reasonably)
    const timeRatio = results[results.length - 1].time / results[0].time;
    const moveRatio = moveCounts[moveCounts.length - 1] / moveCounts[0];
    
    // Time should not increase faster than move count
    expect(timeRatio).toBeLessThan(moveRatio * 2);
  });
});

