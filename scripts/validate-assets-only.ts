import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const packageDir = path.join(repoRoot, 'packages', 'game-asset-domain');
const tsxCliPath = path.join(repoRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const result = spawnSync(process.execPath, [tsxCliPath, 'scripts/validate-assets.ts'], {
  cwd: packageDir,
  stdio: 'inherit',
  shell: false,
});

if (result.error) {
  console.error('Asset validation failed:', result.error);
  process.exit(1);
}

process.exit(result.status ?? 1);
