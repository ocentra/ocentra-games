#!/usr/bin/env node

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runManagedVite, runCheckedCommand } from './vite-dev-manager';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SCRATCHPAD_DIR = path.join(ROOT, 'scratchpad');
const VITE_CLI_PATH = path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
const force = process.argv.includes('--force') || process.env.FORCE === 'true' || process.env.VITE_FORCE === 'true';

function log(message: string): void {
  console.log(`[dev:scratchpad:vite] ${message}`);
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
  if (force) {
    log('Starting Vite with --force.');
  }

  await runManagedVite({
    preferredPort: 5176,
    rangeStart: 5176,
    rangeEnd: 5176,
    lockFile: path.join(ROOT, '.vite-scratchpad.lock'),
    cwd: SCRATCHPAD_DIR,
    spawnCommand: process.execPath,
    spawnArgs: [VITE_CLI_PATH, '--host', '127.0.0.1', '--port', '5176', '--strict-port', ...(force ? ['--force'] : [])],
    spawnShell: false,
    logPrefix: 'dev:scratchpad:vite',
    beforeStart: () => {
      const lintStartedAt = Date.now();
      runCheckedCommand('npm run lint:exec', SCRATCHPAD_DIR);
      log(`Scratchpad lint preflight completed in ${formatDurationMs(Date.now() - lintStartedAt)}.`);
    },
    shouldKillOccupant: (occupant) => {
      const lowerName = occupant.name.toLowerCase();
      const lowerCommand = occupant.commandLine.toLowerCase();
      return (
        lowerName.includes('node') ||
        lowerName.includes('vite') ||
        lowerCommand.includes('scratchpad') ||
        lowerCommand.includes('vite')
      );
    },
  });

  log(`Managed Vite session completed after ${formatDurationMs(Date.now() - startedAt)}.`);
}

main().catch((error) => {
  console.error(`[dev:scratchpad:vite] Fatal: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
