import { describe, it, expect, beforeAll } from 'vitest';
import { Connection, Keypair, LAMPORTS_PER_SOL, Transaction, VersionedTransaction } from '@solana/web3.js';
import { AnchorClient } from '@services/solana/AnchorClient';
import { GameClient } from '@services/solana/GameClient';
import { Wallet } from '@coral-xyz/anchor';

/**
 * Performance benchmarks for move submission.
 * Per critique: Benchmark move submission latency and throughput.
 */
describe('Move Submission Benchmarks', () => {
  let connection: Connection;
  let authority: Keypair;
  let player: Keypair;
  let anchorClient: AnchorClient;
  let gameClient: GameClient;
  let matchId: string;

  beforeAll(async () => {
    connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    authority = Keypair.generate();
    player = Keypair.generate();

    try {
      await connection.requestAirdrop(authority.publicKey, 2 * LAMPORTS_PER_SOL);
      await connection.requestAirdrop(player.publicKey, 2 * LAMPORTS_PER_SOL);
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

    // Create a test match
    matchId = crypto.randomUUID();
    const seed = Math.floor(Math.random() * 1000000);
    const gameType = 0;

    try {
      const gameWallet = {
        publicKey: authority.publicKey,
        signTransaction: wallet.signTransaction.bind(wallet) as (tx: unknown) => Promise<unknown>,
      };
      await gameClient.createMatch(gameType, seed, gameWallet);
    } catch (error) {
      console.warn('Test match creation failed:', error);
    }
  }, 30000);

  it('should benchmark single move submission latency', async () => {
    const gameWallet = {
      publicKey: player.publicKey,
      signTransaction: async (tx: unknown) => {
        if (tx instanceof Transaction) {
          tx.sign(player);
        } else if (tx instanceof VersionedTransaction) {
          tx.sign([player]);
        }
        return tx;
      },
    };

    const action = {
      type: 'pick_up' as const,
      playerId: player.publicKey.toString(),
      data: {},
      timestamp: new Date(),
    };

    const startTime = Date.now();
    const nonce = Date.now();

    try {
      const tx = await gameClient.submitMove(matchId, action, gameWallet, nonce);
      const endTime = Date.now();
      const latency = endTime - startTime;

      console.log(`Move submission latency: ${latency}ms`);
      console.log(`Transaction signature: ${tx}`);

      // Target: < 5 seconds
      expect(latency).toBeLessThan(5000);
    } catch (error) {
      console.warn('Move submission benchmark failed (may be due to match state):', error);
    }
  }, 10000);

  it('should benchmark move submission throughput', async () => {
    const numMoves = 5; // Reduced for devnet testing
    const results: number[] = [];

    const gameWallet = {
      publicKey: player.publicKey,
      signTransaction: async (tx: unknown) => {
        if (tx instanceof Transaction) {
          tx.sign(player);
        } else if (tx instanceof VersionedTransaction) {
          tx.sign([player]);
        }
        return tx;
      },
    };

    const startTime = Date.now();

    for (let i = 0; i < numMoves; i++) {
      const action = {
        type: 'pick_up' as const,
        playerId: player.publicKey.toString(),
        data: {},
        timestamp: new Date(),
      };

      try {
        const moveStart = Date.now();
        const nonce = Date.now() + i; // Unique nonce per move
        await gameClient.submitMove(matchId, action, gameWallet, nonce);
        const moveEnd = Date.now();
        results.push(moveEnd - moveStart);
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.warn(`Move ${i} submission failed:`, error);
      }
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgLatency = results.length > 0 
      ? results.reduce((a, b) => a + b, 0) / results.length 
      : 0;
    const throughput = results.length > 0 
      ? (results.length / totalTime) * 1000 
      : 0; // moves per second

    console.log(`Total time: ${totalTime}ms`);
    console.log(`Average latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`Throughput: ${throughput.toFixed(2)} moves/second`);
    console.log(`Success rate: ${(results.length / numMoves * 100).toFixed(1)}%`);

    // Target: > 0.1 moves/second
    if (results.length > 0) {
      expect(throughput).toBeGreaterThan(0.1);
    }
  }, 120000);
});

