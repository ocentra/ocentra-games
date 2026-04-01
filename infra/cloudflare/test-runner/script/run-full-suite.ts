#!/usr/bin/env node

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;
const testRunnerDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(testRunnerDir);
const testRunnerReportsDir = path.join(testRunnerDir, 'reports');

const args = process.argv.slice(2);
const modeArg = args[0];
const mode = modeArg && ['local', 'real', 'cloud'].includes(modeArg) ? modeArg : 'local';
const isRealMode = mode === 'real' || mode === 'cloud';
const skipArg = args.find((a) => a.startsWith('--skip-tests='));
const skipList = skipArg ? skipArg.replace('--skip-tests=', '').split(',').map((s) => s.trim()) : [];
const openReport = args.includes('--open');

process.env.TEST_MODE = isRealMode ? 'real' : 'local';
if (isRealMode) {
  if (!process.env.WORKER_URL?.trim()) {
    console.error('[run-full-suite] WORKER_URL must be set for real/cloud mode');
    process.exit(1);
  }
} else {
  delete process.env.WORKER_URL;
}

function run(name: string, cmd: string, cmdArgs: string[]): number {
  console.log(`\n[run-full-suite] ${name}...`);
  const result = spawnSync(cmd, cmdArgs, { cwd: cloudflareDir, stdio: 'inherit', shell: true });
  return result.status ?? 1;
}

function runTsx(scriptPath: string): number {
  return run(path.basename(scriptPath), 'npx', ['--yes', 'tsx', scriptPath]);
}

function openReportInBrowser(reportPath: string): void {
  if (!fs.existsSync(reportPath)) {
    console.warn('[run-full-suite] Report not found, skipping open: ' + reportPath);
    return;
  }
  const normalized = path.resolve(reportPath).replace(/\\/g, '/');
  const fileUrl = (process.platform === 'win32' ? 'file:///' : 'file://') + normalized;
  try {
    if (process.platform === 'win32') spawnSync('cmd', ['/c', 'start', '', fileUrl], { stdio: 'ignore' });
    else if (process.platform === 'darwin') spawnSync('open', [fileUrl], { stdio: 'ignore' });
    else spawnSync('xdg-open', [fileUrl], { stdio: 'ignore' });
    console.log('[run-full-suite] Opened report in browser');
  } catch {
    console.log('[run-full-suite] Open manually: ' + fileUrl);
  }
}

async function main(): Promise<void> {
  console.log(`[run-full-suite] Mode: ${mode}\n`);
  const startTime = Date.now();

  try {
    let firstFailure = 0;
    if (!skipList.includes('vitest')) {
      const vitestExit = run('Vitest (run-suite-helper)', 'npm', ['run', 'test:helper']);
      if (vitestExit !== 0) {
        firstFailure = vitestExit;
        console.warn('\n[run-full-suite] Vitest exited with ' + vitestExit + ' (e.g. failed/unstable tests). Continuing to report.');
      }
    } else {
      console.log('\n[run-full-suite] Skipping Vitest');
    }

    const optionalSteps: { key: string; script: string }[] = [
      { key: 'coverage', script: 'test-runner/script/run-coverage.ts' },
      { key: 'analytics', script: 'tests/analytics/test-analytics-comprehensive.ts' },
      { key: 'schemathesis', script: 'test-runner/script/run-schemathesis.ts' },
      { key: 'k6', script: 'test-runner/script/run-k6.ts' },
      { key: 'mutation', script: 'test-runner/script/run-mutation-only.ts' },
      { key: 'static-analysis', script: 'test-runner/script/run-static-analysis.ts' },
      { key: 'observability', script: 'test-runner/script/run-observability.ts' },
    ];

    for (const step of optionalSteps) {
      if (skipList.includes(step.key)) {
        console.log(`\n[run-full-suite] Skipping ${step.key}`);
        continue;
      }
      const scriptFullPath = path.join(cloudflareDir, step.script);
      if (!fs.existsSync(scriptFullPath)) {
        console.log(`[run-full-suite] Skip ${step.key} (script not found)`);
        continue;
      }
      const exitCode = runTsx(scriptFullPath);
      if (exitCode !== 0 && firstFailure === 0) firstFailure = exitCode;
    }

    console.log('\n[run-full-suite] Generating report...');
    const reportPath = path.join(testRunnerReportsDir, 'test-report.html');
    const reportExit = runTsx(path.join(cloudflareDir, 'test-runner/script/report/generate-test-report.ts'));
    if (reportExit !== 0 && firstFailure === 0) firstFailure = reportExit;

    if (openReport) openReportInBrowser(reportPath);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n[run-full-suite] Done in ${duration}s. Report: ${reportPath}`);
    process.exit(firstFailure);
  } catch (err) {
    console.error('[run-full-suite] Error:', err);
    process.exit(1);
  }
}

main();
