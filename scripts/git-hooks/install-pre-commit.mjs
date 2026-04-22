import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

const hookDir = join(process.cwd(), '.git', 'hooks');
const hookPath = join(hookDir, 'pre-commit');

const hookScript = `#!/bin/sh
# Security scan for secrets
node scripts/security/scan-staged-secrets.mjs
if [ $? -ne 0 ]; then
  echo "[security] Pre-commit hook rejected this commit due to secret detection."
  exit 1
fi

# Deep Lint and Type Check via Turbo
echo "[lint] Running deep check..."
npm run lint
if [ $? -ne 0 ]; then
  echo ""
  echo "[lint] Pre-commit hook rejected this commit due to errors."
  exit 1
fi

exit 0
`;

mkdirSync(hookDir, { recursive: true });
writeFileSync(hookPath, hookScript, 'utf8');
chmodSync(hookPath, 0o755);

console.log('[security] Installed .git/hooks/pre-commit');
