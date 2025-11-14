#!/usr/bin/env tsx
/**
 * Run all load tests and generate combined report per spec Section 23.3.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const execAsync = promisify(exec);

interface CombinedReport {
  timestamp: string;
  create1000Matches?: Record<string, unknown>;
  merkleBatching?: Record<string, unknown>;
  concurrentMoves?: Record<string, unknown>;
  summary: {
    allTestsPassed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
  };
}

async function runAllTests(): Promise<void> {
  console.log('Running all load tests...\n');

  const report: CombinedReport = {
    timestamp: new Date().toISOString(),
    summary: {
      allTestsPassed: true,
      totalTests: 3,
      passedTests: 0,
      failedTests: 0,
    },
  };

  const tests = [
    { name: 'create-1000-matches', script: 'scripts/load-test/create-1000-matches.ts' },
    { name: 'merkle-batching-benchmark', script: 'scripts/load-test/merkle-batching-benchmark.ts' },
    { name: 'concurrent-moves', script: 'scripts/load-test/concurrent-moves.ts' },
  ];

  for (const test of tests) {
    console.log(`\n=== Running ${test.name} ===`);
    try {
      const { stdout, stderr } = await execAsync(`tsx ${test.script}`);
      console.log(stdout);
      if (stderr) {
        console.error(stderr);
      }

      // Try to load results
      try {
        const resultsPath = join(process.cwd(), 'load-test-results', `${test.name}.json`);
        const results = JSON.parse(readFileSync(resultsPath, 'utf-8'));
        // Map test names to report properties
        const propertyMap: Record<string, keyof CombinedReport> = {
          'create-1000-matches': 'create1000Matches',
          'merkle-batching-benchmark': 'merkleBatching',
          'concurrent-moves': 'concurrentMoves',
        };
        const property = propertyMap[test.name];
        if (property && (property === 'create1000Matches' || property === 'merkleBatching' || property === 'concurrentMoves')) {
          report[property] = results as Record<string, unknown>;
        }
        report.summary.passedTests++;
      } catch {
        // Results file might not exist or be invalid
        report.summary.failedTests++;
        report.summary.allTestsPassed = false;
      }
    } catch (error) {
      console.error(`Test ${test.name} failed:`, error);
      report.summary.failedTests++;
      report.summary.allTestsPassed = false;
    }
  }

  // Generate report
  const resultsDir = join(process.cwd(), 'load-test-results');
  mkdirSync(resultsDir, { recursive: true });
  const reportPath = join(resultsDir, 'combined-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('\n=== Combined Load Test Report ===');
  console.log(`Timestamp: ${report.timestamp}`);
  console.log(`Total tests: ${report.summary.totalTests}`);
  console.log(`Passed: ${report.summary.passedTests}`);
  console.log(`Failed: ${report.summary.failedTests}`);
  console.log(`All tests passed: ${report.summary.allTestsPassed ? '✓' : '✗'}`);
  console.log(`\nReport saved to ${reportPath}`);

  if (!report.summary.allTestsPassed) {
    process.exit(1);
  }
}

runAllTests().catch((error) => {
  console.error('Failed to run all tests:', error);
  process.exit(1);
});

