#!/usr/bin/env node

import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..', '..');
const args = new Set(process.argv.slice(2));
const isWindows = process.platform === 'win32';
const npmExecutable = isWindows ? 'cmd.exe' : 'npm';
const turboBin = path.join(root, 'node_modules', '.bin', isWindows ? 'turbo.cmd' : 'turbo');

function quoteWindowsArg(value) {
  if (!/[ \t"]/u.test(value)) return value;
  return `"${value.replace(/"/gu, '\\"')}"`;
}

function run(label, command, commandArgs, options = {}) {
  console.log(`\n[setup:worktree] ${label}`);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: process.env,
    ...options,
  });
  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runNpm(label, npmArgs) {
  if (isWindows) {
    run(label, npmExecutable, ['/d', '/s', '/c', ['npm', ...npmArgs].map(quoteWindowsArg).join(' ')]);
    return;
  }
  run(label, npmExecutable, npmArgs);
}

function printHelp() {
  console.log([
    'Usage: npm run setup:worktree -- [options]',
    '',
    'Options:',
    '  --force-install       Run npm install even when local turbo exists',
    '  --skip-install        Skip npm install',
    '  --skip-domain-build   Skip domain package build',
    '  --skip-assets         Skip game asset validation',
    '  --skip-generated      Skip generated export refresh',
  ].join('\n'));
}

if (args.has('--help') || args.has('-h')) {
  printHelp();
  process.exit(0);
}

if (!args.has('--skip-install') && (args.has('--force-install') || !existsSync(turboBin))) {
  runNpm('Installing workspace dependencies', ['install', '--ignore-scripts']);
} else {
  console.log('\n[setup:worktree] Dependencies already present');
}

if (!args.has('--skip-domain-build')) {
  runNpm('Building domain packages', ['run', 'build:domains:exec']);
}

if (!args.has('--skip-assets')) {
  runNpm('Validating game assets', ['run', 'validate:game-assets']);
}

if (!args.has('--skip-generated')) {
  runNpm('Refreshing generated exports', ['run', 'generate:exports-flattened']);
}

console.log('\n[setup:worktree] Ready. Start the app with: cmd /c npm run dev:web');
