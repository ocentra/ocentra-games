#!/usr/bin/env node
/**
 * CLI tool to verify a match record.
 * Per critique Phase 10.4: Create CLI tools per spec Section 8.2, lines 934-938.
 */

import { readFileSync } from 'fs';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { AnchorClient } from '@services/solana/AnchorClient';
import { GameClient } from '@services/solana/GameClient';
import { MatchVerifier } from '@services/verification/MatchVerifier';
import { R2Service } from '@services/storage/R2Service';
import type { MatchRecord } from '@lib/match-recording/types';

const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const R2_WORKER_URL = process.env.R2_WORKER_URL || 'http://localhost:8787';

async function verifyMatch(matchId: string, matchRecordPath?: string): Promise<void> {
  console.log(`Verifying match: ${matchId}`);

  // Load match record
  let matchRecord: MatchRecord;
  if (matchRecordPath) {
    const fileContent = readFileSync(matchRecordPath, 'utf-8');
    matchRecord = JSON.parse(fileContent) as MatchRecord;
  } else {
    // Fetch from R2
    const r2Service = new R2Service({
      workerUrl: R2_WORKER_URL,
      bucketName: 'matches',
    });
    const recordJson = await r2Service.getMatchRecord(matchId);
    if (!recordJson) {
      console.error(`Match ${matchId} not found`);
      process.exit(1);
    }
    matchRecord = JSON.parse(recordJson) as MatchRecord;
  }

  // Initialize services
  const connection = new Connection(RPC_URL, 'confirmed');
  // Create a minimal wallet stub for verification (only public key needed, signing not used)
  const stubPublicKey = new PublicKey('11111111111111111111111111111111'); // System program ID as stub
  const stubKeypair = Keypair.generate(); // Generate a dummy keypair for payer
  const stubWallet = {
    publicKey: stubPublicKey,
    payer: stubKeypair, // Required for NodeWallet
    signTransaction: async () => {
      throw new Error('Signing not needed for verification');
    },
    signAllTransactions: async () => {
      throw new Error('Signing not needed for verification');
    },
  } as Wallet;
  const anchorClient = new AnchorClient(connection, stubWallet);
  const gameClient = new GameClient(anchorClient);
  const r2Service = new R2Service({
    workerUrl: R2_WORKER_URL,
    bucketName: 'matches',
  });
  const verifier = new MatchVerifier(gameClient, r2Service);

  // Verify match
  const result = await verifier.verifyMatch(matchId, matchRecord);

  // Print results
  console.log('\n=== Verification Results ===');
  console.log(`Valid: ${result.isValid ? '✅ YES' : '❌ NO'}`);
  console.log(`Match Hash: ${result.matchHash}`);
  console.log(`On-Chain Hash: ${result.onChainHash || 'NOT FOUND'}`);
  console.log(`Merkle Verified: ${result.merkleVerified !== undefined ? (result.merkleVerified ? '✅ YES' : '❌ NO') : '⚠️  N/A'}`);
  console.log(`Signatures Verified: ${result.signaturesVerified !== undefined ? (result.signaturesVerified ? '✅ YES' : '❌ NO') : '⚠️  N/A'}`);
  console.log(`Replay Verified: ${result.replayVerified !== undefined ? (result.replayVerified ? '✅ YES' : '❌ NO') : '⚠️  N/A'}`);

  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }

  process.exit(result.isValid ? 0 : 1);
}

// CLI entry point
const matchId = process.argv[2];
const matchRecordPath = process.argv[3];

if (!matchId) {
  console.error('Usage: verify-match <matchId> [matchRecordPath]');
  console.error('  matchId: UUID of the match to verify');
  console.error('  matchRecordPath: Optional path to match record JSON file (if not provided, fetches from R2)');
  process.exit(1);
}

verifyMatch(matchId, matchRecordPath).catch(error => {
  console.error('Verification failed:', error);
  process.exit(1);
});

