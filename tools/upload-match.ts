#!/usr/bin/env node
/**
 * CLI tool to upload a match record to R2.
 * Per spec Section 12, line 584: "node tools/upload_match.js --file path/to/match.json --upload r2 --anchor solana:memo|program --batch-id <opt>"
 * Per critique Phase 10.4: Create CLI tools per spec Section 8.2, lines 934-938.
 */

import { readFileSync } from 'fs';
import { R2Service } from '@services/storage/R2Service';
import { CanonicalSerializer } from '@lib/match-recording/canonical/CanonicalSerializer';
import type { MatchRecord } from '@lib/match-recording/types';
import { Connection, Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';
import { AnchorClient } from '@services/solana/AnchorClient';
import { GameClient } from '@services/solana/GameClient';
import { Wallet } from '@coral-xyz/anchor';

const R2_WORKER_URL = process.env.R2_WORKER_URL || 'http://localhost:8787';
// COORDINATOR_PRIVATE_KEY not used in this tool - signing handled by wallet
// const COORDINATOR_PRIVATE_KEY = process.env.COORDINATOR_PRIVATE_KEY;
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

interface UploadOptions {
  file: string;
  upload?: 'r2';
  anchor?: 'solana:memo' | 'solana:program';
  batchId?: string;
}

function parseArgs(): UploadOptions {
  const args = process.argv.slice(2);
  const options: UploadOptions = { file: '' };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--file' && args[i + 1]) {
      options.file = args[i + 1];
      i++;
    } else if (args[i] === '--upload' && args[i + 1]) {
      options.upload = args[i + 1] as 'r2';
      i++;
    } else if (args[i] === '--anchor' && args[i + 1]) {
      options.anchor = args[i + 1] as 'solana:memo' | 'solana:program';
      i++;
    } else if (args[i] === '--batch-id' && args[i + 1]) {
      options.batchId = args[i + 1];
      i++;
    }
  }

  return options;
}

async function uploadMatch(options: UploadOptions): Promise<void> {
  console.log(`Uploading match record: ${options.file}`);

  // Load match record
  const fileContent = readFileSync(options.file, 'utf-8');
  const matchRecord = JSON.parse(fileContent) as MatchRecord;

  // Validate match_id
  const matchId = matchRecord.match_id || matchRecord.matchId;
  if (!matchId) {
    throw new Error('Match record missing match_id field');
  }

  // Canonicalize
  const canonicalBytes = CanonicalSerializer.canonicalizeMatchRecord(matchRecord);
  const canonicalJSON = new TextDecoder().decode(canonicalBytes);

  // Compute match hash
  // Cast to BufferSource for compatibility with Web Crypto API
  const hashBuffer = await crypto.subtle.digest('SHA-256', canonicalBytes as BufferSource);
  const matchHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Upload to R2 if requested
  let url: string | undefined;
  if (options.upload === 'r2') {
    const r2Service = new R2Service({
      workerUrl: R2_WORKER_URL,
      bucketName: 'matches',
    });

    console.log('Uploading to R2...');
    url = await r2Service.uploadMatchRecord(matchId, canonicalJSON);
    console.log(`✅ Uploaded to R2: ${url}`);
  }

  // Anchor on Solana if requested
  if (options.anchor) {
    if (!process.env.SOLANA_PRIVATE_KEY) {
      throw new Error('SOLANA_PRIVATE_KEY environment variable required for anchoring');
    }

    const connection = new Connection(SOLANA_RPC_URL);
    const privateKeyBytes = Uint8Array.from(JSON.parse(process.env.SOLANA_PRIVATE_KEY));
    const keypair = Keypair.fromSecretKey(privateKeyBytes);

    // Create wallet compatible with Anchor's Wallet interface
    const wallet = {
      publicKey: keypair.publicKey,
      signTransaction: async (tx: unknown) => {
        if (tx instanceof Transaction) {
          tx.sign(keypair);
        } else if (tx instanceof VersionedTransaction) {
          tx.sign([keypair]);
        }
        return tx;
      },
      signAllTransactions: async (txs: unknown[]) => {
        const signed: (Transaction | VersionedTransaction)[] = [];
        for (const tx of txs) {
          if (tx instanceof Transaction) {
            tx.sign(keypair);
            signed.push(tx);
          } else if (tx instanceof VersionedTransaction) {
            tx.sign([keypair]);
            signed.push(tx);
          }
        }
        return signed;
      },
    } as Wallet;

    const anchorClient = new AnchorClient(connection, wallet as Wallet);
    const gameClient = new GameClient(anchorClient);

    if (options.anchor === 'solana:program') {
      console.log('Anchoring match record on Solana (program)...');
      const matchHashBytes = Uint8Array.from(Buffer.from(matchHash, 'hex'));
      
      // Create game wallet adapter
      const gameWallet = {
        publicKey: keypair.publicKey,
        signTransaction: wallet.signTransaction.bind(wallet) as (tx: unknown) => Promise<unknown>,
      };
      
      const txSignature = await gameClient.anchorMatchRecord(
        matchId,
        matchHashBytes,
        url,
        gameWallet
      );
      console.log(`✅ Anchored on Solana: ${txSignature}`);
    } else if (options.anchor === 'solana:memo') {
      console.log('Anchoring match record on Solana (memo)...');
      // Memo instruction would go here
      console.log('⚠️  Memo anchoring not yet implemented');
    }
  }

  // Handle batch-id if provided
  if (options.batchId) {
    console.log(`📦 Batch ID specified: ${options.batchId}`);
    // Batch association would be handled by BatchManager
  }

  console.log(`\n✅ Match record processed successfully!`);
  console.log(`   Match ID: ${matchId}`);
  console.log(`   Match Hash: ${matchHash}`);
  if (url) {
    console.log(`   URL: ${url}`);
  }
}

// CLI entry point
const options = parseArgs();

if (!options.file) {
  console.error('Usage: upload-match --file <path> [options]');
  console.error('\nOptions:');
  console.error('  --file <path>          Path to match record JSON file (required)');
  console.error('  --upload r2            Upload to R2 storage');
  console.error('  --anchor solana:memo   Anchor on Solana using memo instruction');
  console.error('  --anchor solana:program Anchor on Solana using program instruction');
  console.error('  --batch-id <id>        Associate with batch ID');
  console.error('\nEnvironment variables:');
  console.error('  R2_WORKER_URL: Cloudflare Worker URL (default: http://localhost:8787)');
  console.error('  SOLANA_RPC_URL: Solana RPC URL (default: https://api.devnet.solana.com)');
  console.error('  SOLANA_PRIVATE_KEY: Solana wallet private key (required for --anchor)');
  console.error('  COORDINATOR_PRIVATE_KEY: Optional coordinator private key for signing');
  process.exit(1);
}

uploadMatch(options).catch(error => {
  console.error('Upload failed:', error);
  process.exit(1);
});

