import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';

const hookDir = join(process.cwd(), '.git', 'hooks');
const hookPath = join(hookDir, 'pre-commit');

const hookScript = `#!/bin/sh
# GitHub Desktop / Windows space-in-path fix
# Direct script execution to avoid npm shell wrapper issues on some Windows setups
node scripts/security/scan-staged-secrets.mjs
status=$?
if [ $status -ne 0 ]; then
  echo ""
  echo "[security] Pre-commit hook rejected this commit."
fi
exit $status
`;

mkdirSync(hookDir, { recursive: true });
writeFileSync(hookPath, hookScript, 'utf8');
chmodSync(hookPath, 0o755);

console.log('[security] Installed .git/hooks/pre-commit');
