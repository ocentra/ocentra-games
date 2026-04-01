/**
 * Test Report Generator for Vitest
 * Automatically generates formatted markdown reports after test runs
 * Similar to Rust/ocentra-games/tests/report-generator.ts
 */

import * as fs from 'fs';
import * as path from 'path';

export interface TestReportData {
  suite: string;
  test: string;
  file: string;
  status: 'passed' | 'failed' | 'skipped';
  duration?: number;
  logs?: string[];
  error?: {
    message: string;
    stack?: string;
    context?: Record<string, string>;
  };
}

class ReportGenerator {
  private static instance: ReportGenerator;
  private results: TestReportData[] = [];
  private startTime: number = Date.now();

  static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator();
    }
    return ReportGenerator.instance;
  }

  addResult(result: TestReportData): void {
    this.results.push(result);
  }

  getAllResults(): TestReportData[] {
    return this.results;
  }

  exportToJson(outputPath: string): void {
    const data = {
      results: this.results,
      startTime: this.startTime,
      endTime: Date.now(),
      duration: Date.now() - this.startTime,
    };
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');
  }

  reset(): void {
    this.results = [];
    this.startTime = Date.now();
  }
}

// Export singleton instance
export const reportGenerator = ReportGenerator.getInstance();

// Auto-export on process exit (similar to Rust version)
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    try {
      const outputPath = path.join(process.cwd(), 'test-results', 'test-collected-results.json');
      reportGenerator.exportToJson(outputPath);
    } catch {
      // Silently fail - don't break tests if export fails
    }
  });

  process.on('SIGINT', () => {
    try {
      const outputPath = path.join(process.cwd(), 'test-results', 'test-collected-results.json');
      reportGenerator.exportToJson(outputPath);
    } catch {
      // Silently fail
    }
    process.exit(0);
  });
}

