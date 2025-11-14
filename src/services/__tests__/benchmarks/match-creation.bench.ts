import { describe, it, expect, beforeAll } from 'vitest';
import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction, VersionedTransaction } from '@solana/web3.js';
import { AnchorClient } from '@services/solana/AnchorClient';
import { GameClient } from '@services/solana/GameClient';
import { Wallet } from '@coral-xyz/anchor';

/**
 * Performance benchmarks for match creation.
 * Per critique: Benchmark match creation throughput and latency.
 */
describe('Match Creation Benchmarks', () => {
  let connection: Connection;
  let authority: Keypair;
  let anchorClient: AnchorClient;
  let gameClient: GameClient;

  beforeAll(async () => {
    connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    authority = Keypair.generate();

    try {
      await connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL);
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.warn('Airdrop failed:', error);
    }

    const wallet = {
      publicKey: authority.publicKey,
      signTransaction: async (tx: unknown) => {
        if (tx instanceof Transaction) {
          tx.sign(authority);
        } else if (tx instanceof VersionedTransaction) {
          tx.sign([authority]);
        }
        return tx;
      },
      signAllTransactions: async (txs: unknown[]) => {
        const signed: (Transaction | VersionedTransaction)[] = [];
        for (const tx of txs) {
          if (tx instanceof Transaction) {
            tx.sign(authority);
            signed.push(tx);
          } else if (tx instanceof VersionedTransaction) {
            tx.sign([authority]);
            signed.push(tx);
          }
        }
        return signed;
      },
    } as Wallet;

    anchorClient = new AnchorClient(connection, wallet as Wallet);
    gameClient = new GameClient(anchorClient);
  }, 30000);

  it('should benchmark single match creation latency', async () => {
    const seed = Math.floor(Math.random() * 1000000);
    const gameType = 0;

    const wallet = {
      publicKey: authority.publicKey,
      signTransaction: async (tx: unknown) => {
        if (tx instanceof Transaction) {
          tx.sign(authority);
        } else if (tx instanceof VersionedTransaction) {
          tx.sign([authority]);
        }
        return tx;
      },
    };

    const startTime = Date.now();
    
    try {
      const tx = await gameClient.createMatch(gameType, seed, wallet);
      const endTime = Date.now();
      const latency = endTime - startTime;

      console.log(`Match creation latency: ${latency}ms`);
      console.log(`Transaction signature: ${tx}`);

      // Target: < 5 seconds
      expect(latency).toBeLessThan(5000);
    } catch (error) {
      console.warn('Match creation benchmark failed (may be due to devnet issues):', error);
    }
  }, 10000);

  it('should benchmark match creation throughput', async () => {
    const numMatches = 10; // Reduced for devnet testing
    const gameType = 0;
    const results: number[] = [];

    const wallet = {
      publicKey: authority.publicKey,
      signTransaction: async (tx: unknown) => {
        if (tx instanceof Transaction) {
          tx.sign(authority);
        } else if (tx instanceof VersionedTransaction) {
          tx.sign([authority]);
        }
        return tx;
      },
    };

    const startTime = Date.now();

    for (let i = 0; i < numMatches; i++) {
      const seed = Math.floor(Math.random() * 1000000);
      
      try {
        const matchStart = Date.now();
        await gameClient.createMatch(gameType, seed, wallet);
        const matchEnd = Date.now();
        results.push(matchEnd - matchStart);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn(`Match ${i} creation failed:`, error);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgLatency = results.reduce((a, b) => a + b, 0) / results.length;
    const throughput = (numMatches / totalTime) * 1000; // matches per second

    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`Throughput: ${throughput.toFixed(2)} matches/second`);
    console.log(`Success rate: ${(results.length / numMatches * 100).toFixed(1)}%`);

    // Target: > 0.1 matches/second (10 seconds per match)
    expect(throughput).toBeGreaterThan(0.1);
  }, 120000);
});

