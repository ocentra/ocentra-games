#!/usr/bin/env node

import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyEditorWebEnv, resolveEditorWebPort } from './dev-port-config';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const editorDir = path.join(root, 'packages/asset-editor');
const editorPort = resolveEditorWebPort();
const env = { ...process.env, VITE_E2E_BYPASS_AUTH: 'true' };

applyEditorWebEnv(env, editorPort);

const child = spawn('npx', ['vite', '--port', String(editorPort)], {
  cwd: editorDir,
  stdio: 'inherit',
  shell: true,
  env,
});

child.on('exit', (code) => process.exit(code ?? 0));
