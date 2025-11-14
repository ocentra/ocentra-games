#!/usr/bin/env tsx
/**
 * Verification script per spec Section 30.
 * Verifies all match records in R2 storage or from example files.
 */

import { readFileSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Connection, Keypair } from '@solana/web3.js';
import { AnchorClient } from '@services/solana/AnchorClient';
import { GameClient } from '@services/solana/GameClient';
import { MatchVerifier } from '@services/verification/MatchVerifier';
import { R2Service } from '@services/storage/R2Service';
// BatchManager not used in this script - only MatchVerifier needed
// import { BatchManager } from '@services/solana/BatchManager';
import type { MatchRecord } from '@lib/match-recording/types';

interface VerificationResult {
  matchId: string;
  status: 'verified' | 'failed' | 'skipped';
  error?: string;
  hashVerified?: boolean;
  signaturesVerified?: boolean;
  merkleVerified?: boolean | undefined;
  replayVerified?: boolean;
}

/**
 * Gets match IDs from example files for testing.
 */
function getExampleMatchIds(): string[] {
  const examplesDir = join(process.cwd(), 'examples');
  const matchIds: string[] = [];
  
  try {
    const humanVsHuman = JSON.parse(
      readFileSync(join(examplesDir, 'human_vs_human_match.json'), 'utf-8')
    ) as MatchRecord;
    if (humanVsHuman.match_id) {
      matchIds.push(humanVsHuman.match_id);
    }
  } catch (error) {
    console.warn('Could not read human_vs_human_match.json:', error);
  }

  try {
    const aiVsAi = JSON.parse(
      readFileSync(join(examplesDir, 'ai_vs_ai_match.json'), 'utf-8')
    ) as MatchRecord;
    if (aiVsAi.match_id) {
      matchIds.push(aiVsAi.match_id);
    }
  } catch (error) {
    console.warn('Could not read ai_vs_ai_match.json:', error);
  }

  return matchIds;
}

/**
 * Gets match IDs from R2 storage.
 * Note: Currently returns empty array - R2 listing not implemented yet
 */
async function getMatchIdsFromR2(_r2Service: R2Service): Promise<string[]> {
  // R2Service would be used to list match records in production
  void _r2Service;
  // In a real implementation, this would list all match records in R2
  // For now, we'll use example files if R2 is not configured
  const matchIds: string[] = [];
  
  try {
    // Try to list matches from R2
    // This is a placeholder - actual implementation would use R2 list API
    console.log('R2 service configured, but match listing not implemented yet');
    return matchIds;
  } catch (error) {
    console.warn('Failed to list matches from R2:', error);
    return matchIds;
  }
}

/**
 * Verifies a single match record.
 */
async function verifyMatch(
  matchId: string,
  verifier: MatchVerifier,
  r2Service?: R2Service
): Promise<VerificationResult> {
  try {
    let matchRecord: MatchRecord | null = null;

    // Try to load from example files first
    const examplesDir = join(process.cwd(), 'examples');
    try {
      const humanVsHuman = JSON.parse(
        readFileSync(join(examplesDir, 'human_vs_human_match.json'), 'utf-8')
      ) as MatchRecord;
      if (humanVsHuman.match_id === matchId) {
        matchRecord = humanVsHuman;
      }
    } catch {
      // Not in human_vs_human
    }

    if (!matchRecord) {
      try {
        const aiVsAi = JSON.parse(
          readFileSync(join(examplesDir, 'ai_vs_ai_match.json'), 'utf-8')
        ) as MatchRecord;
        if (aiVsAi.match_id === matchId) {
          matchRecord = aiVsAi;
        }
      } catch {
        // Not in ai_vs_ai
      }
    }

    // Try to load from R2 if not found in examples
    if (!matchRecord && r2Service) {
      try {
        const matchJson = await r2Service.getMatchRecord(`matches/${matchId}.json`);
        if (matchJson) {
          matchRecord = JSON.parse(matchJson) as MatchRecord;
        }
      } catch (error) {
        console.warn(`Failed to load match ${matchId} from R2:`, error);
      }
    }

    if (!matchRecord) {
      return {
        matchId,
        status: 'skipped',
        error: 'Match record not found',
      };
    }

    // Verify the match
    const result = await verifier.verifyMatch(matchId, matchRecord);

    const allVerified = result.isValid && 
      (result.merkleVerified === undefined || result.merkleVerified === true) &&
      (result.signaturesVerified === undefined || result.signaturesVerified === true) &&
      (result.replayVerified === undefined || result.replayVerified === true);

    return {
      matchId,
      status: allVerified ? 'verified' : 'failed',
      hashVerified: result.computedHash === result.onChainHash,
      signaturesVerified: result.signaturesVerified,
      merkleVerified: result.merkleVerified,
      replayVerified: result.replayVerified,
      error: allVerified ? undefined : (result.errors.join('; ') || 'One or more verification checks failed'),
    };
  } catch (error) {
    return {
      matchId,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Main verification function.
 */
async function verifyAllMatches(): Promise<void> {
  console.log('Starting match verification...');

  // Initialize services
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
  
  let r2Service: R2Service | undefined;
  if (process.env.R2_WORKER_URL) {
    r2Service = new R2Service({
      workerUrl: process.env.R2_WORKER_URL,
      bucketName: process.env.R2_BUCKET_NAME || 'matches',
    });
  }

  const verifier = new MatchVerifier(gameClient, r2Service);

  // Get match IDs
  let matchIds: string[] = [];
  
  if (r2Service) {
    matchIds = await getMatchIdsFromR2(r2Service);
  }
  
  // Always include example matches for testing
  const exampleMatchIds = getExampleMatchIds();
  matchIds = [...new Set([...matchIds, ...exampleMatchIds])];

  if (matchIds.length === 0) {
    console.log('No matches found to verify. Using example matches only.');
    matchIds = exampleMatchIds;
  }

  console.log(`Found ${matchIds.length} matches to verify`);

  // Verify each match
  const results: VerificationResult[] = [];
  for (const matchId of matchIds) {
    console.log(`Verifying match ${matchId}...`);
    const result = await verifyMatch(matchId, verifier, r2Service);
    results.push(result);
    
    if (result.status === 'verified') {
      console.log(`✓ Match ${matchId} verified successfully`);
    } else if (result.status === 'failed') {
      console.error(`✗ Match ${matchId} verification failed: ${result.error}`);
    } else {
      console.warn(`⊘ Match ${matchId} skipped: ${result.error}`);
    }
  }

  // Create results directory
  const resultsDir = join(process.cwd(), 'verification-results');
  try {
    mkdirSync(resultsDir, { recursive: true });
  } catch {
    // Directory might already exist
  }

  // Save results
  const resultsPath = join(resultsDir, 'results.json');
  writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\nResults saved to ${resultsPath}`);

  // Print summary
  const verified = results.filter(r => r.status === 'verified').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const skipped = results.filter(r => r.status === 'skipped').length;

  console.log('\n=== Verification Summary ===');
  console.log(`Total matches: ${results.length}`);
  console.log(`Verified: ${verified}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);

  // Fail if any verifications failed
  if (failed > 0) {
    console.error(`\n${failed} matches failed verification`);
    process.exit(1);
  }

  console.log('\nAll matches verified successfully!');
}

// Run verification
verifyAllMatches().catch((error) => {
  console.error('Verification script failed:', error);
  process.exit(1);
});

