#!/usr/bin/env node

import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;
const testRunnerDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(testRunnerDir);
const reportJsonDir = path.join(testRunnerDir, 'ReportJson');
const mutationPlanPath = path.join(reportJsonDir, 'mutation-plan.json');
const mutationResultsPath = path.join(reportJsonDir, 'mutation-results.json');
const tsconfigPath = path.join(cloudflareDir, 'tsconfig.json');
const mutationCollectorPath = path.join(scriptDir, 'lib', 'mutation-collector.ts');
const runMutationTestsPath = path.join(scriptDir, 'run-mutation-tests.ts');
const npxCommand = 'npx';

if (!fs.existsSync(reportJsonDir)) {
  fs.mkdirSync(reportJsonDir, { recursive: true });
}

console.log('[run-mutation-only] Collecting @mutation targets...\n');
const collectResult = spawnSync(
  npxCommand,
  ['--yes', 'tsx', mutationCollectorPath, tsconfigPath, mutationPlanPath, 'src'],
  { cwd: cloudflareDir, stdio: 'inherit', shell: true }
);
if (collectResult.error) {
  console.error('[run-mutation-only] Mutation target collection failed to start:', collectResult.error.message);
  process.exit(1);
}
if (collectResult.status !== 0) {
  console.error(`[run-mutation-only] Mutation target collection failed with exit code ${collectResult.status}`);
  process.exit(collectResult.status ?? 1);
}

if (!fs.existsSync(mutationPlanPath)) {
  console.log('[run-mutation-only] No mutation plan produced; exiting.');
  const noPlanResult = {
    name: 'Stryker Mutation Testing',
    status: 'skipped' as const,
    duration: 0,
    summary: 'No @mutation targets found',
  };
  fs.writeFileSync(mutationResultsPath, JSON.stringify(noPlanResult, null, 2), 'utf-8');
  process.exit(0);
}

console.log('\n[run-mutation-only] Running Stryker mutation tests...\n');
const mutationStartTime = Date.now();
const runResult = spawnSync(npxCommand, ['--yes', 'tsx', runMutationTestsPath], {
  cwd: cloudflareDir,
  stdio: 'inherit',
  shell: true,
});
if (runResult.error) {
  console.error('[run-mutation-only] Failed to start Stryker runner:', runResult.error.message);
}
const mutationDuration = (Date.now() - mutationStartTime) / 1000;

let mutationTargets: Array<{ symbolName: string; kind: string; file: string; reason?: string }> = [];
if (fs.existsSync(mutationPlanPath)) {
  try {
    const plan = JSON.parse(fs.readFileSync(mutationPlanPath, 'utf-8'));
    mutationTargets = plan.targets ?? [];
  } catch {
    void 0;
  }
}

const mutationResult = {
  name: 'Stryker Mutation Testing',
  status: runResult.status === 0 ? ('passed' as const) : ('failed' as const),
  duration: mutationDuration,
  exitCode: runResult.status ?? 0,
  summary:
    runResult.status === 0
      ? `Mutation tests passed. Tested ${mutationTargets.length} @mutation-decorated target(s). All mutants killed.`
      : `Mutation tests failed (exit code ${runResult.status}). Tested ${mutationTargets.length} target(s). Some mutants survived.`,
  targets: mutationTargets.map((t: { symbolName?: string; kind?: string; file?: string; reason?: string }) => ({
    symbol: t.symbolName ?? '',
    kind: t.kind ?? '',
    file: t.file ?? '',
    reason: t.reason,
  })),
};
fs.writeFileSync(mutationResultsPath, JSON.stringify(mutationResult, null, 2), 'utf-8');

process.exit(runResult.status ?? 0);
