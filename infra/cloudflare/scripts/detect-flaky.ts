#!/usr/bin/env node

import { spawnSync } from 'child_process';

type RunOutcome = {
  command: string;
  ok: boolean;
  exitCode: number;
  durationMs: number;
};

type CommandResult = {
  command: string;
  first: RunOutcome;
  second: RunOutcome;
};

const DEFAULT_COMMANDS = [
  'npm run test:unit:helper -- tests/unit/utils/auth-dependency-resilience.test.ts',
  'npm run test:integration:helper -- tests/integration/api-backward-compatibility.test.ts',
];

function parseCommands(argv: string[]): string[] {
  const commands: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--command') {
      const value = argv[i + 1];
      if (value && value.trim().length > 0) {
        commands.push(value.trim());
      }
      i++;
    }
  }
  return commands.length > 0 ? commands : DEFAULT_COMMANDS;
}

function runCommand(command: string): RunOutcome {
  const startedAt = Date.now();
  const result = spawnSync(command, {
    shell: true,
    stdio: 'inherit',
    cwd: process.cwd(),
    env: process.env,
  });
  const durationMs = Date.now() - startedAt;
  const exitCode = result.status ?? 1;
  return {
    command,
    ok: exitCode === 0,
    exitCode,
    durationMs,
  };
}

function formatDuration(ms: number): string {
  const seconds = (ms / 1000).toFixed(1);
  return `${seconds}s`;
}

function main(): void {
  const commands = parseCommands(process.argv.slice(2));
  const results: CommandResult[] = [];

  console.log('[flaky-check] Starting repeat-run consistency checks');
  console.log(`[flaky-check] Commands to evaluate: ${commands.length}`);

  for (const command of commands) {
    console.log(`\n[flaky-check] First run: ${command}`);
    const first = runCommand(command);
    console.log(
      `[flaky-check] First run result: ${first.ok ? 'pass' : 'fail'} (exit ${first.exitCode}, ${formatDuration(first.durationMs)})`
    );

    console.log(`\n[flaky-check] Second run: ${command}`);
    const second = runCommand(command);
    console.log(
      `[flaky-check] Second run result: ${second.ok ? 'pass' : 'fail'} (exit ${second.exitCode}, ${formatDuration(second.durationMs)})`
    );

    results.push({ command, first, second });
  }

  const flaky = results.filter((entry) => entry.first.ok !== entry.second.ok);
  const deterministicFailures = results.filter((entry) => !entry.first.ok && !entry.second.ok);

  console.log('\n[flaky-check] Summary');
  for (const entry of results) {
    const status =
      entry.first.ok !== entry.second.ok ? 'flaky-detected' : entry.first.ok ? 'stable-pass' : 'stable-fail';
    console.log(
      `- ${status}: ${entry.command} (run1=${entry.first.exitCode}, run2=${entry.second.exitCode})`
    );
  }

  if (flaky.length > 0) {
    console.error('\n[flaky-check] Flaky behavior detected (pass/fail mismatch between repeated runs).');
    process.exit(1);
  }

  if (deterministicFailures.length > 0) {
    console.error('\n[flaky-check] One or more commands failed consistently across both runs.');
    process.exit(1);
  }

  console.log('\n[flaky-check] No flaky behavior detected in repeated runs.');
}

main();
