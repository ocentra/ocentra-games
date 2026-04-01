#!/usr/bin/env node
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');

const bothModes = process.argv.includes('--both-modes');

let exitCode = 0;

function out(msg: string): void {
  process.stdout.write(msg.endsWith('\n') ? msg : msg + '\n');
}
function err(msg: string): void {
  process.stderr.write(msg.endsWith('\n') ? msg : msg + '\n');
}

function runCommand(command: string, description: string): void {
  out(`\n${'='.repeat(60)}`);
  out(`Running: ${description}`);
  out(`Command: ${command}`);
  out('='.repeat(60) + '\n');

  try {
    execSync(command, {
      stdio: 'inherit',
      cwd: projectRoot
    });
  } catch (error: unknown) {
    const e = error as { status?: number };
    if (e.status) {
      exitCode = e.status;
    }
    err(`\n[WARN] ${description} completed with errors (exit code: ${e.status || 1})`);
    err('Continuing with remaining tests...\n');
  }
}

if (bothModes) {
  out('Running all Cloudflare tests in both modes (pool then unstable per type)\n');
  runCommand('npm run test:unit:both', 'Unit Tests (pool then unstable)');
  runCommand('npm run test:integration:both', 'Integration Tests (pool then unstable)');
  runCommand('npm run test:e2e:both', 'E2E Tests (pool then unstable)');
} else {
  out('Running all Cloudflare tests (Unit + Integration + E2E) [pool only]\n');
  runCommand('npm run test:unit', 'Unit Tests');
  runCommand('npm run test:integration', 'Integration Tests');
  runCommand('npm run test:e2e', 'E2E Tests');
}

out('\n' + '='.repeat(60));
out('All test suites completed');
out('='.repeat(60) + '\n');

process.exit(exitCode);
