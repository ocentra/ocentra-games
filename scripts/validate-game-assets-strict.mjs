#!/usr/bin/env node

import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const gameAssetDomain = path.join(root, 'packages', 'game-asset-domain');
const requiredDomainDist = path.join(root, 'node_modules', '@ocentra', 'game-domain', 'dist', 'deck', 'commercialDeckTypes.js');
const tsxCli = path.join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function fail(label, status) {
  console.error('\n============================================================');
  console.error('GAME ASSET GATE FAILED');
  console.error('============================================================');
  console.error(`Blocked step: ${label}`);
  console.error('Dev/build/test/lint startup is refused until every editor game asset is valid.');
  console.error('Run the command above directly after fixing the reported asset paths.');
  process.exit(status || 1);
}

function runStep(label, args) {
  console.log(`\n[game-assets] ${label}`);
  const result = spawnSync(process.execPath, [tsxCli, ...args], {
    cwd: gameAssetDomain,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    console.error(result.error);
    fail(label, 1);
  }
  if (result.status !== 0) {
    fail(label, result.status ?? 1);
  }
}

function ensureDomainBuild() {
  if (existsSync(requiredDomainDist)) return;
  console.log('\n[game-assets] Required domain dist is missing. Building domain packages first.');
  const result = spawnSync(npmCommand, ['run', 'build:domains:exec'], {
    cwd: root,
    stdio: 'inherit',
    shell: false,
  });
  if (result.error) {
    console.error(result.error);
    fail('Building domain packages for game asset validation', 1);
  }
  if (result.status !== 0) {
    fail('Building domain packages for game asset validation', result.status ?? 1);
  }
}

ensureDomainBuild();

runStep('Validating every .asset file under packages/asset-editor/Resources', [
  'scripts/validate-assets.ts',
]);
runStep('Validating selected-game readiness for every CardGameMode asset', [
  'scripts/validate-selected-game-readiness.ts',
  '--strict',
]);

console.log('\n[game-assets] Gate passed. All editor game assets are schema-valid and selected-game ready.');
