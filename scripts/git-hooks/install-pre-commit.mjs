import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

const hookPath = execFileSync('git', ['rev-parse', '--git-path', 'hooks/pre-commit'], {
  cwd: process.cwd(),
  encoding: 'utf8',
}).trim();
const hookDir = dirname(hookPath);

const hookScript = [
  '#!/bin/sh',
  '',
  'node scripts/security/scan-staged-secrets.mjs',
  'if [ $? -ne 0 ]; then',
  '  echo "[security] Pre-commit hook rejected this commit due to secret detection."',
  '  exit 1',
  'fi',
  '',
  'echo "[validation] Running full build and type check..."',
  'node scripts/git-hooks/run-precommit-validation.mjs',
  'if [ $? -ne 0 ]; then',
  '  echo ""',
  '  echo "[validation] Pre-commit hook rejected this commit due to errors."',
  '  exit 1',
  'fi',
  '',
  '',
  'exit 0',
  '',
].join('\n');

mkdirSync(hookDir, { recursive: true });
writeFileSync(hookPath, hookScript, 'utf8');
chmodSync(hookPath, 0o755);

console.log('[security] Installed .git/hooks/pre-commit');
