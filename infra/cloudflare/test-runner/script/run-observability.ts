#!/usr/bin/env node

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;
const testRunnerDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(testRunnerDir);
const testRunnerReportJsonDir = path.join(testRunnerDir, 'ReportJson');

if (!fs.existsSync(testRunnerReportJsonDir)) {
  fs.mkdirSync(testRunnerReportJsonDir, { recursive: true });
}

const observabilityJsonPath = path.join(testRunnerReportJsonDir, 'observability-results.json');

function runCommand(command: string, args: string[], options: { cwd?: string } = {}): Promise<{ code: number }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      cwd: options.cwd ?? cloudflareDir,
      env: process.env,
    });
    child.on('close', (code) => resolve({ code: code ?? 0 }));
    child.on('error', () => resolve({ code: 1 }));
  });
}

async function main(): Promise<void> {
  console.log('[run-observability] Verifying observability hooks\n');
  const start = Date.now();
  try {
    const { code } = await runCommand('npx', [
      '--yes',
      'vitest',
      'run',
      'tests/integration/observability.test.ts',
      '--reporter=verbose',
    ]);
    const duration = (Date.now() - start) / 1000;
    const result = {
      name: 'Observability Verification',
      status: code === 0 ? ('passed' as const) : ('failed' as const),
      exitCode: code,
      duration,
      summary: code === 0 ? 'Observability verification completed' : `Observability verification exited with code ${code}`,
    };
    fs.writeFileSync(observabilityJsonPath, JSON.stringify(result, null, 2), 'utf-8');
    if (code === 0) {
      console.log(`\n  [PASS] Observability verification completed in ${duration.toFixed(1)}s`);
    } else {
      console.warn(`\n  [WARN] Observability verification exited with code ${code}`);
    }
    process.exit(code);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const duration = (Date.now() - start) / 1000;
    const result = {
      name: 'Observability Verification',
      status: 'failed' as const,
      exitCode: 1,
      duration,
      errorMessage: msg,
      summary: `Observability verification failed: ${msg}`,
    };
    fs.writeFileSync(observabilityJsonPath, JSON.stringify(result, null, 2), 'utf-8');
    console.error('  [FAIL]', msg);
    process.exit(1);
  }
}

main();
