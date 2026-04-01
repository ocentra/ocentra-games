#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const editorDir = path.join(root, 'packages/asset-editor');

const child = spawn(
  'npx',
  ['vite', '--port', '5175'],
  {
    cwd: editorDir,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, VITE_E2E_BYPASS_AUTH: 'true' },
  }
);

child.on('exit', (code) => process.exit(code ?? 0));
