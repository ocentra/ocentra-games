#!/usr/bin/env node

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;
const testRunnerDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(testRunnerDir);
const testsDir = path.join(cloudflareDir, 'tests');
const testRunnerReportJsonDir = path.join(testRunnerDir, 'ReportJson');
const testRunnerLogsDir = path.join(testRunnerDir, 'logs');

if (!fs.existsSync(testRunnerReportJsonDir)) {
  fs.mkdirSync(testRunnerReportJsonDir, { recursive: true });
}
if (!fs.existsSync(testRunnerLogsDir)) {
  fs.mkdirSync(testRunnerLogsDir, { recursive: true });
}

const k6LogPath = path.join(testRunnerLogsDir, 'k6.log');
const k6LogStream = fs.createWriteStream(k6LogPath, { flags: 'w' });

interface K6Metrics {
  requests?: number;
  errors?: number;
  errorRate?: number;
  avgResponseTime?: number;
  p95ResponseTime?: number;
  p90ResponseTime?: number;
  maxResponseTime?: number;
  throughput?: number;
  vus?: { max?: number; avg?: number };
  thresholds?: Array<{ name: string; passed: boolean; value?: string; actualValue?: string; thresholdValue?: string }>;
  checkFailures?: Array<{ name: string; passes: number; fails: number; failureRate: number }>;
}

function runCommandWithOutput(
  command: string,
  args: string[],
  options: { timeout?: number; toolLogStream?: fs.WriteStream; cwd?: string } = {}
): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    let output = '';
    let resolved = false;
    const timeout = options.timeout ?? 120000;
    const quotedCommand = command.includes(' ') && process.platform === 'win32' ? `"${command}"` : command;
    const cwd = options.cwd ?? cloudflareDir;
    const toolLogStream = options.toolLogStream;

    const child = spawn(quotedCommand, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      cwd,
      env: process.env,
    });

    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          child.kill('SIGTERM');
        } catch {
          void 0;
        }
        resolve({ code: 124, output: output + '\n[ERROR] Command timed out' });
      }
    }, timeout);

    const writeToLog = (text: string) => {
      if (toolLogStream) toolLogStream.write(text);
    };

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
      writeToLog(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
      writeToLog(text);
    });

    child.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ code: code ?? 0, output });
      }
    });

    child.on('error', (error) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ code: 1, output: error.message });
      }
    });
  });
}

async function checkWorkerHealth(url: string, timeout = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout }, (res) => {
      resolve(res.statusCode === 200);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForWorker(port: number, maxWait = 30): Promise<boolean> {
  const url = `http://localhost:${port}/health`;
  const checkInterval = 1000;
  let elapsed = 0;
  while (elapsed < maxWait * 1000) {
    const healthy = await checkWorkerHealth(url);
    if (healthy) return true;
    await new Promise((r) => setTimeout(r, checkInterval));
    elapsed += checkInterval;
    process.stdout.write(`\r  Waiting for worker... (${Math.floor(elapsed / 1000)}s)`);
  }
  process.stdout.write('\r');
  return false;
}

async function checkPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close(() => resolve(false));
    });
    server.on('error', () => resolve(true));
  });
}

function parseK6Metrics(output: string): K6Metrics | undefined {
  try {
    const jsonMatch = output.match(/\{[\s\S]*"metrics"[\s\S]*\}/);
    if (!jsonMatch) return undefined;

    let k6Json: Record<string, unknown>;
    try {
      k6Json = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    } catch {
      const lastBrace = jsonMatch[0].lastIndexOf('}');
      if (lastBrace > 0) {
        try {
          k6Json = JSON.parse(jsonMatch[0].substring(0, lastBrace + 1)) as Record<string, unknown>;
        } catch {
          return undefined;
        }
      } else {
        return undefined;
      }
    }

    const metrics = (k6Json.metrics as Record<string, unknown>) || {};
    const rootGroup = (k6Json.root_group as Record<string, unknown>) || {};
    const httpReqs = ((metrics.http_reqs as Record<string, unknown>)?.values as Record<string, unknown>) || {};
    const httpReqDuration = ((metrics.http_req_duration as Record<string, unknown>)?.values as Record<string, unknown>) || {};
    const httpReqFailed = ((metrics.http_req_failed as Record<string, unknown>)?.values as Record<string, unknown>) || {};
    const errors = ((metrics.errors as Record<string, unknown>)?.values as Record<string, unknown>) || {};
    const iterations = ((metrics.iterations as Record<string, unknown>)?.values as Record<string, unknown>) || {};
    const vus = ((metrics.vus as Record<string, unknown>)?.values as Record<string, unknown>) || {};

    const thresholds: Array<{ name: string; passed: boolean; value?: string; actualValue?: string; thresholdValue?: string }> = [];
    const durationThresholds = (metrics.http_req_duration as Record<string, unknown>)?.thresholds as Record<string, { ok?: boolean }> | undefined;
    if (durationThresholds) {
      Object.entries(durationThresholds).forEach(([name, result]) => {
        thresholds.push({
          name: `http_req_duration: ${name}`,
          passed: result?.ok === true,
          value: result?.ok !== undefined ? (result.ok ? 'PASS' : 'FAIL') : undefined,
          actualValue: httpReqDuration['p(95)'] !== undefined ? `${Number(httpReqDuration['p(95)']).toFixed(2)}ms` : undefined,
        });
      });
    }

    const checkFailures: Array<{ name: string; passes: number; fails: number; failureRate: number }> = [];
    interface K6Check {
      name?: string;
      path?: string;
      passes?: number;
      fails?: number;
    }
    interface K6Group {
      checks?: K6Check[];
      groups?: K6Group[];
    }
    const extractChecks = (group: K6Group): void => {
      if (group.checks) {
        group.checks.forEach((check: K6Check) => {
          if (check.fails && check.fails > 0) {
            const total = (check.passes || 0) + check.fails;
            checkFailures.push({
              name: check.name || check.path || 'Unknown',
              passes: check.passes || 0,
              fails: check.fails || 0,
              failureRate: total > 0 ? (check.fails / total) * 100 : 0,
            });
          }
        });
      }
      if (group.groups) {
        group.groups.forEach((sub: K6Group) => extractChecks(sub));
      }
    };
    extractChecks(rootGroup as K6Group);

    const reqCount = (httpReqs.count as number) || (iterations.count as number) || 0;
    const errCount = (errors.count as number) || 0;
    const errRate =
      (httpReqFailed.rate as number) ??
      (errors.rate as number) ??
      (reqCount > 0 && errCount > 0 ? errCount / reqCount : 0);

    return {
      requests: reqCount,
      errors: errCount,
      errorRate: errRate,
      avgResponseTime: (httpReqDuration.avg as number) || 0,
      p95ResponseTime: (httpReqDuration['p(95)'] as number) || 0,
      p90ResponseTime: (httpReqDuration['p(90)'] as number) || 0,
      maxResponseTime: (httpReqDuration.max as number) || 0,
      throughput: (httpReqs.rate as number) || 0,
      vus: {
        max: (vus.max as number) || 0,
        avg: (vus.avg as number) || 0,
      },
      thresholds: thresholds.length > 0 ? thresholds : undefined,
      checkFailures: checkFailures.length > 0 ? checkFailures : undefined,
    };
  } catch {
    return undefined;
  }
}

async function ensureWorker(): Promise<boolean> {
  const portInUse = await checkPortInUse(8787);
  let workerRunning = false;
  const waitSeconds = 60;
  if (portInUse) {
    workerRunning = await waitForWorker(8787, waitSeconds);
  }
  if (!workerRunning && !portInUse) {
    console.log('  Starting worker (npm run worker:start)...');
    const isWindows = process.platform === 'win32';
    const npmCommand = isWindows ? 'npm.cmd' : 'npm';
    const workerJob = spawn(npmCommand, ['run', 'worker:start'], {
      cwd: cloudflareDir,
      env: { ...process.env, WORKER_HTTP_PORT: '8787' },
      stdio: 'pipe',
      detached: false,
      shell: isWindows,
    });
    workerRunning = await waitForWorker(8787, waitSeconds);
    if (!workerRunning && workerJob) {
      workerJob.kill();
    }
  }
  return workerRunning;
}

async function main(): Promise<void> {
  console.log('[run-k6] k6 concurrency/load tests\n');

  const workerUrl = process.env.WORKER_URL;
  if (workerUrl) {
    const healthy = await checkWorkerHealth(workerUrl);
    if (!healthy) {
      console.error('  [FAIL] Worker not reachable at', workerUrl);
      const result = {
        name: 'k6 Concurrency/Load Tests',
        status: 'failed',
        errorType: 'worker_unavailable',
        summary: `Worker not reachable at ${workerUrl}`,
      };
      fs.writeFileSync(path.join(testRunnerReportJsonDir, 'k6-results.json'), JSON.stringify(result, null, 2), 'utf-8');
      process.exit(1);
    }
  } else {
    const workerRunning = await ensureWorker();
    if (!workerRunning) {
      console.error('  [FAIL] Worker not available. Start with: npm run dev');
      const result = {
        name: 'k6 Concurrency/Load Tests',
        status: 'failed',
        errorType: 'worker_unavailable',
        summary: 'Worker not available - start with npm run dev or worker:start',
      };
      fs.writeFileSync(path.join(testRunnerReportJsonDir, 'k6-results.json'), JSON.stringify(result, null, 2), 'utf-8');
      process.exit(1);
    }
  }

  const k6Command =
    process.platform === 'win32' && !process.env.PATH?.includes('k6') ? 'C:\\Program Files\\k6\\k6.exe' : 'k6';
  const k6ScriptPath = path.join(testsDir, 'k6', 'concurrency.test.js');

  if (!fs.existsSync(k6ScriptPath)) {
    console.error('  [FAIL] k6 script not found:', k6ScriptPath);
    const result = {
      name: 'k6 Concurrency/Load Tests',
      status: 'failed',
      errorType: 'script_not_found',
      summary: `k6 script not found: ${k6ScriptPath}`,
    };
    fs.writeFileSync(path.join(testRunnerReportJsonDir, 'k6-results.json'), JSON.stringify(result, null, 2), 'utf-8');
    process.exit(1);
  }

  const startTime = Date.now();
  try {
    const { code, output } = await runCommandWithOutput(k6Command, ['run', k6ScriptPath], {
      timeout: 120000,
      toolLogStream: k6LogStream,
    });

    k6LogStream.end();

    const duration = (Date.now() - startTime) / 1000;
    const k6JsonPath = path.join(testRunnerReportJsonDir, 'k6-results.json');
    const isNotInstalled =
      output.includes('is not recognized') || output.includes('command not found') || (code === 1 && output.includes('k6'));

    if (isNotInstalled) {
      const result = {
        name: 'k6 Concurrency/Load Tests',
        status: 'failed',
        duration: 0,
        summary: 'k6 not installed - install with: choco install k6 (Windows) or brew install k6 (macOS)',
        installCommand:
          process.platform === 'win32' ? 'choco install k6' : process.platform === 'darwin' ? 'brew install k6' : 'See https://k6.io/docs/getting-started/installation/',
      };
      fs.writeFileSync(k6JsonPath, JSON.stringify(result, null, 2), 'utf-8');
      console.error('  [FAIL] k6 not installed');
      process.exit(1);
    }

    const k6Status = code === 0 ? 'passed' : code === 99 ? 'threshold_failed' : 'failed';
    const k6Metrics = parseK6Metrics(output);
    const thresholdFailures = k6Metrics?.thresholds?.filter((t) => !t.passed).map((t) => t.name) || [];

    const result = {
      name: 'k6 Concurrency/Load Tests',
      status: k6Status,
      exitCode: code,
      errorType: code === 99 ? 'threshold_violation' : code !== 0 ? 'execution_error' : undefined,
      duration,
      errorMessage:
        code === 99
          ? `Threshold violations: ${thresholdFailures.join(', ')}`
          : code !== 0
            ? `k6 exited with code ${code}`
            : undefined,
      summary:
        code === 0
          ? k6Metrics
            ? `${(k6Metrics.requests ?? 0).toLocaleString()} requests, ${((k6Metrics.errorRate ?? 0) * 100).toFixed(2)}% errors, ${(k6Metrics.avgResponseTime ?? 0).toFixed(2)}ms avg`
            : 'k6 concurrency/load test completed'
          : code === 99
            ? `k6 completed but ${thresholdFailures.length} threshold(s) violated: ${thresholdFailures.join(', ')}`
            : `k6 exited with code ${code}`,
      metrics: k6Metrics,
      thresholdFailures: thresholdFailures.length > 0 ? thresholdFailures : undefined,
    };
    fs.writeFileSync(k6JsonPath, JSON.stringify(result, null, 2), 'utf-8');

    if (code === 0) {
      console.log(`  [PASS] k6 completed in ${duration.toFixed(1)}s`);
    } else if (code === 99) {
      console.warn(`  [WARN] k6 thresholds crossed (exit 99)`);
    } else {
      console.warn(`  [WARN] k6 exited with code ${code}`);
    }
    process.exit(code === 0 ? 0 : 1);
  } catch (error: unknown) {
    k6LogStream.end();
    const errMsg = error instanceof Error ? error.message : String(error);
    const result = {
      name: 'k6 Concurrency/Load Tests',
      status: 'failed',
      exitCode: 1,
      errorType: errMsg.includes('is not recognized') || errMsg.includes('command not found') ? 'not_installed' : 'execution_error',
      duration: 0,
      errorMessage: errMsg,
      summary: `k6 failed: ${errMsg}`,
      installCommand:
        process.platform === 'win32' ? 'choco install k6' : process.platform === 'darwin' ? 'brew install k6' : undefined,
    };
    fs.writeFileSync(path.join(testRunnerReportJsonDir, 'k6-results.json'), JSON.stringify(result, null, 2), 'utf-8');
    console.error('  [FAIL]', errMsg);
    process.exit(1);
  }
}

main();
