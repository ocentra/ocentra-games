#!/usr/bin/env tsx
/**
 * Generate combined cost report per spec Section 26.
 * Combines transaction costs and batch costs into a markdown report.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

interface CostReport {
  timestamp: string;
  transactionCosts?: Record<string, unknown>;
  batchCosts?: Record<string, unknown>;
}

async function generateCostReport(): Promise<void> {
  console.log('Generating cost report...');

  const resultsDir = join(process.cwd(), 'cost-measurement-results');
  const report: CostReport = {
    timestamp: new Date().toISOString(),
  };

  // Load transaction costs
  const txCostsPath = join(resultsDir, 'transaction-costs.json');
  if (existsSync(txCostsPath)) {
    report.transactionCosts = JSON.parse(readFileSync(txCostsPath, 'utf-8'));
  }

  // Load batch costs
  const batchCostsPath = join(resultsDir, 'batch-costs.json');
  if (existsSync(batchCostsPath)) {
    report.batchCosts = JSON.parse(readFileSync(batchCostsPath, 'utf-8'));
  }

  // Generate markdown report
  let markdown = `# Cost Measurement Report\n\n`;
  markdown += `**Generated:** ${report.timestamp}\n\n`;
  markdown += `## Overview\n\n`;
  markdown += `This report contains cost measurements for Solana transactions and Merkle batching per spec Section 26.\n\n`;

  if (report.transactionCosts) {
    markdown += `## Transaction Costs\n\n`;
    markdown += `### Summary\n\n`;
    markdown += `| Operation | Compute Units | Fee (SOL) |\n`;
    markdown += `|-----------|---------------|-----------|\n`;
    
    const tx = report.transactionCosts?.summary as {
      createMatch?: { avgCU: number; avgFee: number };
      joinMatch?: { avgCU: number; avgFee: number };
      submitMove?: { avgCU: number; avgFee: number };
      endMatch?: { avgCU: number; avgFee: number };
      anchorHash?: { avgCU: number; avgFee: number };
    } | undefined;
    
    if (tx) {
      markdown += `| Create Match | ${tx.createMatch?.avgCU.toFixed(0) || 'N/A'} | ${tx.createMatch?.avgFee.toFixed(6) || 'N/A'} |\n`;
      markdown += `| Join Match | ${tx.joinMatch?.avgCU.toFixed(0) || 'N/A'} | ${tx.joinMatch?.avgFee.toFixed(6) || 'N/A'} |\n`;
      markdown += `| Submit Move | ${tx.submitMove?.avgCU.toFixed(0) || 'N/A'} | ${tx.submitMove?.avgFee.toFixed(6) || 'N/A'} |\n`;
      markdown += `| End Match | ${tx.endMatch?.avgCU.toFixed(0) || 'N/A'} | ${tx.endMatch?.avgFee.toFixed(6) || 'N/A'} |\n`;
      markdown += `| Anchor Hash | ${tx.anchorHash?.avgCU.toFixed(0) || 'N/A'} | ${tx.anchorHash?.avgFee.toFixed(6) || 'N/A'} |\n\n`;

      markdown += `### Target Comparison (per spec Section 26.1)\n\n`;
      markdown += `| Operation | Measured | Target | Status |\n`;
      markdown += `|-----------|----------|--------|--------|\n`;
      const createFee = tx.createMatch?.avgFee || 0;
      const joinFee = tx.joinMatch?.avgFee || 0;
      const submitFee = tx.submitMove?.avgFee || 0;
      const endFee = tx.endMatch?.avgFee || 0;
      const anchorFee = tx.anchorHash?.avgFee || 0;
      markdown += `| Create Match | ${createFee.toFixed(6)} SOL | <0.0005 SOL | ${createFee < 0.0005 ? '✓' : '✗'} |\n`;
      markdown += `| Join Match | ${joinFee.toFixed(6)} SOL | <0.0002 SOL | ${joinFee < 0.0002 ? '✓' : '✗'} |\n`;
      markdown += `| Submit Move | ${submitFee.toFixed(6)} SOL | <0.0005 SOL | ${submitFee < 0.0005 ? '✓' : '✗'} |\n`;
      markdown += `| End Match | ${endFee.toFixed(6)} SOL | <0.0003 SOL | ${endFee < 0.0003 ? '✓' : '✗'} |\n`;
      markdown += `| Anchor Hash | ${anchorFee.toFixed(6)} SOL | <0.0001 SOL | ${anchorFee < 0.0001 ? '✓' : '✗'} |\n\n`;
    }
  }

  if (report.batchCosts) {
    markdown += `## Merkle Batching Costs\n\n`;
    markdown += `### Summary\n\n`;
    const batchCosts = report.batchCosts as {
      batchSize?: number;
      totalMatches?: number;
      individualCost?: { totalSOL?: number; costPerMatch?: number };
      batchCost?: { totalSOL?: number; costPerMatch?: number; costPerBatch?: number };
      savings?: { totalSOL?: number; percentage?: number };
    } | undefined;
    
    if (batchCosts) {
      markdown += `- **Batch Size:** ${batchCosts.batchSize || 'N/A'} matches\n`;
      markdown += `- **Total Matches:** ${batchCosts.totalMatches || 'N/A'}\n\n`;
      markdown += `### Individual Anchoring\n\n`;
      markdown += `- Total cost: **${batchCosts.individualCost?.totalSOL?.toFixed(6) || 'N/A'} SOL**\n`;
      markdown += `- Cost per match: **${batchCosts.individualCost?.costPerMatch?.toFixed(8) || 'N/A'} SOL**\n\n`;
      markdown += `### Batch Anchoring\n\n`;
      markdown += `- Total cost: **${batchCosts.batchCost?.totalSOL?.toFixed(6) || 'N/A'} SOL**\n`;
      markdown += `- Cost per match: **${batchCosts.batchCost?.costPerMatch?.toFixed(8) || 'N/A'} SOL**\n`;
      markdown += `- Cost per batch: **${batchCosts.batchCost?.costPerBatch?.toFixed(6) || 'N/A'} SOL**\n\n`;
      markdown += `### Savings\n\n`;
      markdown += `- Total savings: **${batchCosts.savings?.totalSOL?.toFixed(6) || 'N/A'} SOL**\n`;
      markdown += `- Savings percentage: **${batchCosts.savings?.percentage?.toFixed(2) || 'N/A'}%**\n\n`;
      markdown += `### Target Comparison (per spec Section 26.2)\n\n`;
      markdown += `| Metric | Measured | Target | Status |\n`;
      markdown += `|--------|----------|--------|--------|\n`;
      const costPerMatch = batchCosts.batchCost?.costPerMatch || 0;
      const savingsPct = batchCosts.savings?.percentage || 0;
      markdown += `| Cost per match | ${costPerMatch.toFixed(8)} SOL | <0.000002 SOL | ${costPerMatch < 0.000002 ? '✓' : '✗'} |\n`;
      markdown += `| Savings | ${savingsPct.toFixed(2)}% | >98% | ${savingsPct > 98 ? '✓' : '✗'} |\n\n`;
    }
  }

  markdown += `## Cost Model Formula\n\n`;
  markdown += `\`\`\`\n`;
  markdown += `Total Cost = (Base Fee × Transactions) + (Account Rent × Accounts) + (Storage × Size)\n\n`;
  markdown += `For 1,000 matches:\n`;
  markdown += `- Individual anchors: 1,000 × 0.0001 SOL = 0.1 SOL\n`;
  markdown += `- Merkle batching (100/match): 10 × 0.0002 SOL = 0.002 SOL\n`;
  markdown += `- Cost reduction: 98% savings\n`;
  markdown += `\`\`\`\n\n`;

  markdown += `## Notes\n\n`;
  markdown += `- All costs measured on Solana devnet\n`;
  markdown += `- Costs may vary on mainnet\n`;
  markdown += `- Account rent costs not included in measurements\n`;
  markdown += `- Storage costs (R2) are free tier (10GB, 1M operations/month)\n\n`;

  // Save report
  mkdirSync(resultsDir, { recursive: true });
  const reportPath = join(resultsDir, 'COST_REPORT.md');
  writeFileSync(reportPath, markdown);
  console.log(`\nCost report saved to ${reportPath}`);
}

generateCostReport().catch((error) => {
  console.error('Failed to generate cost report:', error);
  process.exit(1);
});

