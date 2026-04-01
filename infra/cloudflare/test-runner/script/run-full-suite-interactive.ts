#!/usr/bin/env node

import { spawnSync } from 'child_process';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { checkbox, confirm, select } from '@inquirer/prompts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;
const testRunnerDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(testRunnerDir);

const MODES = [
  { name: 'Local (Miniflare / unstable_dev)', value: 'local' },
  { name: 'Real (deployed worker — requires WORKER_URL)', value: 'real' },
  { name: 'Cloud', value: 'cloud' },
] as const;

const STEPS = [
  { name: 'Vitest (unit + integration + e2e + contract)', value: 'vitest' },
  { name: 'Coverage', value: 'coverage' },
  { name: 'Analytics', value: 'analytics' },
  { name: 'Schemathesis', value: 'schemathesis' },
  { name: 'k6', value: 'k6' },
  { name: 'Mutation', value: 'mutation' },
  { name: 'Static Analysis', value: 'static-analysis' },
  { name: 'Observability', value: 'observability' },
] as const;

async function main(): Promise<void> {
  console.log('\n  Full Test Suite\n');

  const mode = await select({
    message: 'Mode:',
    choices: MODES.map((m) => ({ name: m.name, value: m.value })),
    default: 'local',
  });

  console.log('\n  Space=toggle steps, Enter=confirm\n');

  const selected = await checkbox({
    message: 'Steps to run:',
    choices: STEPS.map((s) => ({ name: s.name, value: s.value, checked: true })),
    required: true,
    loop: false,
  });

  const skipValues = STEPS.map((s) => s.value).filter((v) => !selected.includes(v));
  const openReport = await confirm({
    message: 'Open report in browser when done?',
    default: true,
  });

  const args: string[] = [mode];
  if (skipValues.length > 0) args.push(`--skip-tests=${skipValues.join(',')}`);
  if (openReport) args.push('--open');
  const runScript = path.join(cloudflareDir, 'test-runner/script/run-full-suite.ts');

  console.log(`\n  Running: npx tsx run-full-suite.ts ${args.join(' ')}\n`);

  const result = spawnSync('npx', ['--yes', 'tsx', runScript, ...args], {
    cwd: cloudflareDir,
    stdio: 'inherit',
    shell: true,
  });

  process.exit(result.status ?? 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
