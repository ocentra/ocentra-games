#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runManagedVite, runCheckedCommand } from './vite-dev-manager';
import { applyEditorWebEnv, resolveEditorWebPort } from './dev-port-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const EDITOR_DIR = path.join(ROOT, 'packages/asset-editor');
const force = process.argv.includes('--force') || process.env.FORCE === 'true' || process.env.VITE_FORCE === 'true';

function log(message: string): void {
  console.log(`[dev:editor:vite] ${message}`);
}

function formatDurationMs(ms: number): string {
  if (ms >= 60_000) {
    return `${(ms / 60_000).toFixed(2)}m`;
  }
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${ms}ms`;
}

async function main(): Promise<void> {
  const startedAt = Date.now();
  const editorPort = resolveEditorWebPort();
  const spawnEnv: Record<string, string> = {};
  applyEditorWebEnv(spawnEnv, editorPort);
  if (force) {
    log('Starting Vite with --force.');
  }
  await runManagedVite({
    preferredPort: editorPort,
    rangeStart: editorPort,
    rangeEnd: editorPort,
    lockFile: path.join(ROOT, '.vite-asset-editor.lock'),
    cwd: EDITOR_DIR,
    spawnCommand: 'npm',
    spawnArgs: ['run', 'dev:raw', ...(force ? ['--', '--force'] : [])],
    spawnEnv: {
      ...spawnEnv,
      ...(process.env.VITE_EDITOR_DEV_AUTH !== undefined
        ? {
            VITE_EDITOR_DEV_AUTH: process.env.VITE_EDITOR_DEV_AUTH,
          }
        : {}),
    },
    logPrefix: 'dev:editor:vite',
    beforeStart: () => {
      const inspectorStartedAt = Date.now();
      log('Generating inspector map...');
      runCheckedCommand('npm run generate:inspector-map', EDITOR_DIR);
      log(`Inspector map generated in ${formatDurationMs(Date.now() - inspectorStartedAt)}.`);
    },
    shouldKillOccupant: (occupant) => {
      const lowerName = occupant.name.toLowerCase();
      const lowerCommand = occupant.commandLine.toLowerCase();
      return (
        lowerName.includes('node') ||
        lowerName.includes('vite') ||
        lowerCommand.includes('asset-editor') ||
        lowerCommand.includes('vite')
      );
    },
  });
  log(`Managed Vite session completed after ${formatDurationMs(Date.now() - startedAt)}.`);
}

main().catch((error) => {
  console.error(`[dev:editor:vite] Fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
