#!/usr/bin/env node

import { spawn, execFileSync } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveWorkerBaseUrl, resolveWorkerPort } from './dev-port-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const TASKKILL_COMMAND = process.platform === 'win32' ? 'taskkill.exe' : 'kill';

type RunningCommand = {
  label: string;
  process: ChildProcessWithoutNullStreams;
  lines: string[];
};

function log(message: string): void {
  process.stdout.write(`[smoke-dev-stacks] ${message}\n`);
}

function appendOutput(target: RunningCommand, chunk: Buffer): void {
  const text = chunk.toString('utf8');
  process.stdout.write(`[${target.label}] ${text}`);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  target.lines.push(...lines);
  if (target.lines.length > 400) {
    target.lines.splice(0, target.lines.length - 400);
  }
}

function startScript(label: string, scriptName: string): RunningCommand {
  const child =
    process.platform === 'win32'
      ? spawn('cmd.exe', ['/d', '/s', '/c', `npm run ${scriptName}`], {
          cwd: ROOT,
          stdio: 'pipe',
          shell: false,
          env: process.env,
        })
      : spawn('npm', ['run', scriptName], {
          cwd: ROOT,
          stdio: 'pipe',
          shell: false,
          env: process.env,
        });

  const running: RunningCommand = {
    label,
    process: child,
    lines: [],
  };

  child.stdout.on('data', (chunk: Buffer) => appendOutput(running, chunk));
  child.stderr.on('data', (chunk: Buffer) => appendOutput(running, chunk));

  return running;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPatterns(
  target: RunningCommand,
  patterns: readonly RegExp[],
  timeoutMs: number,
  description: string
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const joined = target.lines.join('\n');
    if (patterns.every((pattern) => pattern.test(joined))) {
      log(`${target.label}: ${description}`);
      return;
    }

    if (target.process.exitCode !== null) {
      throw new Error(`${target.label} exited early while waiting for ${description}.`);
    }

    await sleep(500);
  }

  throw new Error(`${target.label} did not reach ${description} within ${timeoutMs}ms.`);
}

async function waitForWorkerHealth(baseUrl: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/health`);
      await response.text().catch(() => undefined);
      if (response.ok) {
        log(`Worker health confirmed at ${baseUrl}/health.`);
        return;
      }
    } catch {
      // ignore
    }

    await sleep(1000);
  }

  throw new Error(`Worker health check timed out for ${baseUrl}.`);
}

function killTree(target: RunningCommand): void {
  if (target.process.pid === undefined) {
    return;
  }

  try {
    if (process.platform === 'win32') {
      execFileSync(TASKKILL_COMMAND, ['/pid', String(target.process.pid), '/t', '/f'], { stdio: 'ignore' });
      return;
    }

    execFileSync(TASKKILL_COMMAND, ['-TERM', String(target.process.pid)], { stdio: 'ignore' });
  } catch {
    // ignore
  }
}

function formatTail(target: RunningCommand): string {
  const tail = target.lines.slice(-40);
  return tail.length > 0 ? tail.join('\n') : '(no output captured)';
}

async function main(): Promise<void> {
  const workerPort = resolveWorkerPort();
  const workerBaseUrl = resolveWorkerBaseUrl(workerPort);
  const workerReadyPattern = new RegExp(`Claim-storage worker ready via|Reusing existing claim-storage worker on port ${workerPort}\\.`);
  const workerReusePattern = new RegExp(`Reusing existing claim-storage worker on port ${workerPort}\\.`);
  const editor = startScript('editor', 'dev:editor:stack');

  try {
    await waitForPatterns(
      editor,
      [/Preparing asset-editor shared workspace dependencies with Turbo/],
      180_000,
      'Turbo prep start'
    );
    await waitForPatterns(
      editor,
      [workerReadyPattern],
      240_000,
      'worker ready or reused'
    );
    await waitForPatterns(
      editor,
      [/Starting asset-editor Vite with claim-storage asset URL/],
      240_000,
      'editor Vite start'
    );

    const mainApp = startScript('main', 'dev:main');

    try {
      await waitForPatterns(
        mainApp,
        [/Preparing main-app shared workspace dependencies with Turbo/],
        180_000,
        'Turbo prep start'
      );
      await waitForPatterns(
        mainApp,
        [workerReusePattern],
        240_000,
        'worker reuse'
      );
      await waitForPatterns(
        mainApp,
        [/Starting Vite with claim-storage asset URL/],
        240_000,
        'main Vite start'
      );

      await waitForWorkerHealth(workerBaseUrl, 30_000);
      log('Smoke pass complete: editor and main stacks overlapped and main reused the existing worker.');
    } finally {
      killTree(mainApp);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log(`Smoke pass failed: ${message}`);
    process.stdout.write(`\n[editor tail]\n${formatTail(editor)}\n`);
    process.exitCode = 1;
    throw error;
  } finally {
    killTree(editor);
  }
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  log(`Fatal: ${message}`);
  process.exit(1);
});
