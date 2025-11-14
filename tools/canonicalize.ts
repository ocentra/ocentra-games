#!/usr/bin/env node
/**
 * CLI tool to canonicalize a match record.
 * Per critique Phase 10.4: Create CLI tools per spec Section 8.2, lines 934-938.
 */

import { readFileSync, writeFileSync } from 'fs';
import { CanonicalSerializer } from '@lib/match-recording/canonical/CanonicalSerializer';
import { HashService } from '@lib/crypto/HashService';
import type { MatchRecord } from '@lib/match-recording/types';

async function canonicalize(inputPath: string, outputPath?: string): Promise<void> {
  console.log(`Canonicalizing match record: ${inputPath}`);

  // Load match record
  const fileContent = readFileSync(inputPath, 'utf-8');
  const matchRecord = JSON.parse(fileContent) as MatchRecord;

  // Canonicalize
  const canonicalBytes = CanonicalSerializer.canonicalizeMatchRecord(matchRecord);
  const canonicalJSON = new TextDecoder().decode(canonicalBytes);
  const matchHash = await HashService.hashMatchRecord(canonicalBytes);

  // Output
  if (outputPath) {
    writeFileSync(outputPath, canonicalJSON, 'utf-8');
    console.log(`✅ Canonicalized match record written to: ${outputPath}`);
  } else {
    console.log('\n=== Canonical JSON ===');
    console.log(canonicalJSON);
  }

  console.log(`\n✅ Match Hash (SHA-256): ${matchHash}`);
}

// CLI entry point
const inputPath = process.argv[2];
const outputPath = process.argv[3];

if (!inputPath) {
  console.error('Usage: canonicalize <inputPath> [outputPath]');
  console.error('  inputPath: Path to match record JSON file');
  console.error('  outputPath: Optional path to write canonicalized JSON (if not provided, prints to stdout)');
  process.exit(1);
}

canonicalize(inputPath, outputPath).catch(error => {
  console.error('Canonicalization failed:', error);
  process.exit(1);
});

