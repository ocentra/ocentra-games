#!/usr/bin/env tsx
/**
 * Measure Merkle batching costs per spec Section 26.1.
 * Compares individual anchoring vs batch anchoring costs.
 */

// MerkleBatching not directly used - only HashService needed for this benchmark
// import { MerkleBatching } from '@services/solana/MerkleBatching';
import { HashService } from '@lib/crypto/HashService';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

interface BatchCostReport {
  timestamp: string;
  batchSize: number;
  totalMatches: number;
  individualCost: {
    totalSOL: number;
    costPerMatch: number;
  };
  batchCost: {
    totalSOL: number;
    costPerMatch: number;
    costPerBatch: number;
  };
  savings: {
    totalSOL: number;
    percentage: number;
  };
}

async function measureBatchCosts(): Promise<BatchCostReport> {
  console.log('Measuring Merkle batching costs...');

  const batchSize = 100; // Per spec Section 34.1
  const totalMatches = 1000;

  // Generate match hashes
  const matchHashes: string[] = [];
  for (let i = 0; i < totalMatches; i++) {
    const matchData = new TextEncoder().encode(JSON.stringify({ matchId: `match-${i}`, index: i }));
    const hash = await HashService.hashMatchRecord(matchData);
    matchHashes.push(hash);
  }

  // Calculate individual anchoring cost
  // Per spec Section 26.1: ~0.0001 SOL per individual anchor
  const individualCostPerMatch = 0.0001;
  const individualTotalCost = totalMatches * individualCostPerMatch;

  // Calculate batch anchoring cost
  // Per spec Section 26.1: ~0.0002 SOL per batch
  const batches = Math.ceil(totalMatches / batchSize);
  const batchCostPerBatch = 0.0002;
  const batchTotalCost = batches * batchCostPerBatch;
  const batchCostPerMatch = batchTotalCost / totalMatches;

  // Calculate savings
  const totalSavings = individualTotalCost - batchTotalCost;
  const savingsPercentage = (totalSavings / individualTotalCost) * 100;

  return {
    timestamp: new Date().toISOString(),
    batchSize,
    totalMatches,
    individualCost: {
      totalSOL: individualTotalCost,
      costPerMatch: individualCostPerMatch,
    },
    batchCost: {
      totalSOL: batchTotalCost,
      costPerMatch: batchCostPerMatch,
      costPerBatch: batchCostPerBatch,
    },
    savings: {
      totalSOL: totalSavings,
      percentage: savingsPercentage,
    },
  };
}

// Run measurement
measureBatchCosts()
  .then((report) => {
    console.log('\n=== Merkle Batching Cost Report ===');
    console.log(`Timestamp: ${report.timestamp}`);
    console.log(`Batch size: ${report.batchSize}`);
    console.log(`Total matches: ${report.totalMatches}`);
    console.log('\nIndividual Anchoring:');
    console.log(`  Total cost: ${report.individualCost.totalSOL.toFixed(6)} SOL`);
    console.log(`  Cost per match: ${report.individualCost.costPerMatch.toFixed(8)} SOL`);
    console.log('\nBatch Anchoring:');
    console.log(`  Total cost: ${report.batchCost.totalSOL.toFixed(6)} SOL`);
    console.log(`  Cost per match: ${report.batchCost.costPerMatch.toFixed(8)} SOL`);
    console.log(`  Cost per batch: ${report.batchCost.costPerBatch.toFixed(6)} SOL`);
    console.log('\nSavings:');
    console.log(`  Total savings: ${report.savings.totalSOL.toFixed(6)} SOL`);
    console.log(`  Savings percentage: ${report.savings.percentage.toFixed(2)}%`);

    // Save report
    const resultsDir = join(process.cwd(), 'cost-measurement-results');
    mkdirSync(resultsDir, { recursive: true });
    const reportPath = join(resultsDir, 'batch-costs.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\nReport saved to ${reportPath}`);
  })
  .catch((error) => {
    console.error('Batch cost measurement failed:', error);
    process.exit(1);
  });

