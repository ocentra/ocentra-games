#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;
const testRunnerDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(testRunnerDir);
const coverageDir = path.join(testRunnerDir, 'coverage');
const coverageHtml = path.join(coverageDir, 'index.html');
const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');
const darkThemeScript = path.join(scriptDir, 'report', 'apply-dark-theme-coverage.ts');

const openBrowser = process.env.OPEN === '1' || process.argv.includes('--open');

function runVitestWithCoverage(): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('npx', [
      'vitest', 'run',
      '--config', 'vitest.coverage.config.ts',
      '--coverage',
      '--reporter=default',
    ], {
      cwd: cloudflareDir,
      stdio: 'inherit',
      shell: true,
    });
    child.on('close', (code) => resolve(code ?? 1));
    child.on('error', () => resolve(1));
  });
}

function applyDarkTheme(): void {
  if (!fs.existsSync(coverageHtml)) return;
  try {
    execSync(`npx --yes tsx "${darkThemeScript}"`, {
      cwd: cloudflareDir,
      stdio: 'pipe',
    });
  } catch {
    console.warn('[run-coverage] Could not apply dark theme to coverage HTML');
  }
}

function printSummary(): void {
  if (!fs.existsSync(coverageSummaryPath)) return;
  try {
    const data = JSON.parse(fs.readFileSync(coverageSummaryPath, 'utf-8'));
    const { lines, branches, functions, statements } = data.total ?? {};
    if (!lines || !branches || !functions || !statements) return;
    console.log('\nCoverage summary:');
    console.log(`  Lines:      ${lines.pct?.toFixed(1) ?? '-'}%`);
    console.log(`  Branches:   ${branches.pct?.toFixed(1) ?? '-'}%`);
    console.log(`  Functions:  ${functions.pct?.toFixed(1) ?? '-'}%`);
    console.log(`  Statements: ${statements.pct?.toFixed(1) ?? '-'}%`);
  } catch {
    console.warn('[run-coverage] Could not read coverage summary');
  }
}

function openReport(): void {
  if (!fs.existsSync(coverageHtml)) return;
  const platform = process.platform;
  let cmd: string;
  if (platform === 'win32') {
    cmd = `start "" "${coverageHtml}"`;
  } else if (platform === 'darwin') {
    cmd = `open "${coverageHtml}"`;
  } else {
    cmd = `xdg-open "${coverageHtml}"`;
  }
  try {
    const shell = process.platform === 'win32' ? 'cmd.exe' : '/bin/sh';
    execSync(cmd, { stdio: 'inherit', shell });
  } catch {
    console.log(`Coverage report: ${coverageHtml}`);
  }
}

async function main(): Promise<void> {
  console.log('[run-coverage] Running logic tests in Node for coverage...\n');
  const code = await runVitestWithCoverage();
  applyDarkTheme();
  printSummary();
  if (openBrowser) {
    openReport();
  } else {
    console.log(`\nCoverage report: ${coverageHtml}`);
    console.log('Run with OPEN=1 or --open to open in browser.');
  }
  process.exit(code);
}

main();
