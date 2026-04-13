#!/usr/bin/env node

import { execFileSync, spawn } from 'child_process';
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
const workerPort = 8787;
const workerBaseUrl = `http://localhost:${workerPort}`;
const workerHealthUrl = `${workerBaseUrl}/health`;
const workerReadySettleMs = Number(process.env.K6_WORKER_READY_SETTLE_MS || '5000');

if (!fs.existsSync(testRunnerReportJsonDir)) {
  fs.mkdirSync(testRunnerReportJsonDir, { recursive: true });
}
if (!fs.existsSync(testRunnerLogsDir)) {
  fs.mkdirSync(testRunnerLogsDir, { recursive: true });
}

const k6LogPath = path.join(testRunnerLogsDir, 'k6.log');
const k6LogStream = fs.createWriteStream(k6LogPath, { flags: 'w' });
const workerStartLogPath = path.join(testRunnerLogsDir, 'worker-start-k6.log');
const workerStartLogStream = fs.createWriteStream(workerStartLogPath, { flags: 'w' });

type PortOwner = {
  pid: number;
  name?: string;
  command?: string;
};

type WorkerStartHandle = {
  child: ReturnType<typeof spawn>;
  getOutput: () => string;
  getStatus: () => {
    exited: boolean;
    exitCode: number | null;
    signal: NodeJS.Signals | null;
    error?: string;
  };
};

type WorkerEnsureResult = {
  ok: boolean;
  started: boolean;
  reason?: string;
  details?: string;
  cleanup?: () => void;
};

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

async function checkPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.listen(port, () => {
      server.close(() => resolve(false));
    });
    server.on('error', () => resolve(true));
  });
}

function createRollingBuffer(maxChars = 20000): { append: (text: string) => void; getText: () => string } {
  const chunks: string[] = [];
  let size = 0;

  return {
    append(text: string) {
      chunks.push(text);
      size += text.length;
      while (size > maxChars && chunks.length > 1) {
        size -= chunks.shift()!.length;
      }
    },
    getText() {
      return chunks.join('');
    },
  };
}

function startWorkerProcess(port: number): WorkerStartHandle {
  const isWindows = process.platform === 'win32';
  const npmCommand = isWindows ? 'npm.cmd' : 'npm';
  const stdoutBuffer = createRollingBuffer();
  const stderrBuffer = createRollingBuffer();
  const status = {
    exited: false,
    exitCode: null as number | null,
    signal: null as NodeJS.Signals | null,
    error: undefined as string | undefined,
  };
  const child = spawn(npmCommand, ['run', 'worker:start'], {
    cwd: cloudflareDir,
    env: { ...process.env, WORKER_HTTP_PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
    shell: isWindows,
    windowsHide: true,
  });

  child.stdout?.on('data', (data) => {
    const text = data.toString();
    stdoutBuffer.append(text);
    process.stdout.write(text);
    workerStartLogStream.write(text);
  });

  child.stderr?.on('data', (data) => {
    const text = data.toString();
    stderrBuffer.append(text);
    process.stderr.write(text);
    workerStartLogStream.write(text);
  });

  child.on('error', (error) => {
    status.exited = true;
    status.error = error.message;
    workerStartLogStream.write(`\n[worker-start] process error: ${error.message}\n`);
  });

  child.on('close', (exitCode, signal) => {
    status.exited = true;
    status.exitCode = exitCode;
    status.signal = signal;
    workerStartLogStream.write(`\n[worker-start] exited with code ${exitCode ?? 0}${signal ? ` signal ${signal}` : ''}\n`);
  });

  return {
    child,
    getOutput: () => {
      const stdout = stdoutBuffer.getText().trim();
      const stderr = stderrBuffer.getText().trim();
      return [stdout, stderr].filter((value) => value.length > 0).join('\n');
    },
    getStatus: () => ({ ...status }),
  };
}

function isWorkerReadyOutput(output: string): boolean {
  return new RegExp(`Ready on http://(?:127\\.0\\.0\\.1|localhost|0\\.0\\.0\\.0):${workerPort}\\b`, 'i').test(output);
}

function getPortOwners(port: number): PortOwner[] {
  try {
    if (process.platform === 'win32') {
      const script = `
$matches = netstat -ano -p tcp | Select-String ':${port}\\s+.*LISTENING\\s+(\\d+)\\s*$'
$pids = @($matches | ForEach-Object { if ($_.Matches.Count -gt 0) { $_.Matches[0].Groups[1].Value } } | Select-Object -Unique)
foreach ($pid in $pids) {
  $proc = Get-CimInstance Win32_Process -Filter "ProcessId = $pid"
  if ($proc) {
    [pscustomobject]@{
      pid = [int]$pid
      name = [string]$proc.Name
      command = [string]$proc.CommandLine
    } | ConvertTo-Json -Compress
  }
}
`;
      const output = execFileSync('powershell.exe', ['-NoProfile', '-Command', script], {
        encoding: 'utf-8',
        windowsHide: true,
      }).trim();
      if (!output) {
        return [];
      }
      return output
        .split(/\r?\n/)
        .map((line) => JSON.parse(line) as PortOwner)
        .filter((owner) => Number.isFinite(owner.pid));
    }

    const output = execFileSync(
      'sh',
      ['-lc', `for pid in $(lsof -ti tcp:${port} -sTCP:LISTEN 2>/dev/null | sort -u); do ps -p "$pid" -o pid=,comm=,args=; done`],
      {
        encoding: 'utf-8',
      }
    ).trim();
    if (!output) {
      return [];
    }
    const owners: PortOwner[] = [];
    for (const rawLine of output.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line) {
        continue;
      }
      const match = line.match(/^(\d+)\s+(\S+)\s+(.+)$/);
      if (!match) {
        continue;
      }
      const pid = Number.parseInt(match[1], 10);
      if (!Number.isFinite(pid)) {
        continue;
      }
      owners.push({
        pid,
        name: match[2],
        command: match[3],
      });
    }
    return owners;
  } catch {
    return [];
  }
}

function isKnownWorkerOwner(owner: PortOwner): boolean {
  const haystack = `${owner.name ?? ''} ${owner.command ?? ''}`;
  return /workerd(\.exe)?\b|wrangler(\.cmd)?\s+dev|npm(\.cmd)?\s+run\s+worker:start|start-worker-server\.ts/i.test(haystack);
}

function formatPortOwners(owners: PortOwner[]): string {
  return owners
    .map((owner) => `pid=${owner.pid} name=${owner.name ?? 'unknown'} command=${owner.command ?? 'unknown'}`)
    .join('\n');
}

function terminateProcessTree(pid: number): void {
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', String(pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      return;
    }
    process.kill(pid, 'SIGTERM');
  } catch {
    void 0;
  }
}

async function waitForPortRelease(port: number, maxWaitSeconds = 10): Promise<boolean> {
  const deadline = Date.now() + maxWaitSeconds * 1000;
  while (Date.now() < deadline) {
    const portInUse = await checkPortInUse(port);
    if (!portInUse) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return !(await checkPortInUse(port));
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

async function ensureWorker(): Promise<WorkerEnsureResult> {
  if (await checkWorkerHealth(workerHealthUrl)) {
    console.log(`  Worker already healthy on port ${workerPort}; continuing.`);
    return { ok: true, started: false };
  }

  const portInUse = await checkPortInUse(workerPort);
  if (portInUse) {
    console.warn(`  Port ${workerPort} is in use but /health is not healthy.`);

    const owners = getPortOwners(workerPort);
    if (owners.length === 0) {
      return {
        ok: false,
        started: false,
        reason: 'port_in_use_unknown_owner',
        details: `Port ${workerPort} is occupied, but the owning process could not be identified.`,
      };
    }

    const knownOwners = owners.filter(isKnownWorkerOwner);
    if (knownOwners.length !== owners.length) {
      return {
        ok: false,
        started: false,
        reason: 'port_in_use_non_worker',
        details: `Port ${workerPort} is occupied by a non-worker process:\n${formatPortOwners(owners)}`,
      };
    }

    console.log(`  Recycling stale worker on port ${workerPort}...`);
    for (const owner of knownOwners) {
      terminateProcessTree(owner.pid);
    }

    const released = await waitForPortRelease(workerPort, 10);
    if (!released && !(await checkWorkerHealth(workerHealthUrl))) {
      return {
        ok: false,
        started: false,
        reason: 'port_release_timeout',
        details: `Timed out waiting for port ${workerPort} to be released.\n${formatPortOwners(owners)}`,
      };
    }

    if (await checkWorkerHealth(workerHealthUrl)) {
      console.log(`  Worker on port ${workerPort} became healthy after recycle; continuing.`);
      return { ok: true, started: false };
    }
  }

  let lastFailureDetails: string | undefined;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    console.log(attempt === 1 ? '  Starting worker (npm run worker:start)...' : '  Retrying worker (npm run worker:start)...');
    const workerHandle = startWorkerProcess(workerPort);
    const deadline = Date.now() + 30_000;
    let workerReadyBannerSeenAt: number | undefined;

    while (Date.now() < deadline) {
      const workerOutput = workerHandle.getOutput();
      if (workerReadyBannerSeenAt === undefined && isWorkerReadyOutput(workerOutput)) {
        workerReadyBannerSeenAt = Date.now();
      }
      const shouldProbeHealth =
        workerReadyBannerSeenAt === undefined || Date.now() - workerReadyBannerSeenAt >= workerReadySettleMs;
      if (shouldProbeHealth && (await checkWorkerHealth(workerHealthUrl, 1000))) {
        const cleanup = () => {
          if (!workerHandle.child.killed && workerHandle.child.exitCode === null && workerHandle.child.pid) {
            terminateProcessTree(workerHandle.child.pid);
          }
        };
        process.once('exit', cleanup);
        process.once('SIGINT', () => {
          cleanup();
          process.exit(130);
        });
        process.once('SIGTERM', () => {
          cleanup();
          process.exit(143);
        });
        return { ok: true, started: true, cleanup };
      }
      const status = workerHandle.getStatus();
      if (status.exited) {
        const exitDetails = status.error
          ? `Worker start failed: ${status.error}`
          : `Worker exited with code ${status.exitCode ?? 'unknown'}${status.signal ? ` signal ${status.signal}` : ''}`;
        const output = workerOutput.length > 0 ? `${exitDetails}\n${workerOutput}` : exitDetails;
        lastFailureDetails = output;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const workerOutput = workerHandle.getOutput();
    const portOwners = getPortOwners(workerPort).filter(isKnownWorkerOwner);
    if (!workerHandle.child.killed && workerHandle.child.exitCode === null && workerHandle.child.pid) {
      try {
        terminateProcessTree(workerHandle.child.pid);
      } catch {
        void 0;
      }
    }
    for (const owner of portOwners) {
      terminateProcessTree(owner.pid);
    }

    const released = await waitForPortRelease(workerPort, 10);
    if (attempt === 2) {
      return {
        ok: false,
        started: true,
        reason: 'worker_start_timeout',
        details: lastFailureDetails ?? (workerOutput.length > 0 ? workerOutput : `Worker did not become healthy on port ${workerPort}.`),
      };
    }

    if (!released) {
      lastFailureDetails = `Worker did not become healthy on port ${workerPort} and the port did not release cleanly.`;
    }
  }

  return {
    ok: false,
    started: true,
    reason: 'worker_start_timeout',
    details: lastFailureDetails ?? `Worker did not become healthy on port ${workerPort}.`,
  };
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
    const workerResult = await ensureWorker();
    if (!workerResult.ok) {
      console.error('  [FAIL] Worker not available. Start with: npm run dev');
      if (workerResult.details) {
        console.error(workerResult.details);
      }
      const result = {
        name: 'k6 Concurrency/Load Tests',
        status: 'failed',
        errorType: 'worker_unavailable',
        summary: workerResult.details ?? 'Worker not available - start with npm run dev or worker:start',
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
    if (!workerStartLogStream.closed) {
      workerStartLogStream.end();
    }

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
    if (!workerStartLogStream.closed) {
      workerStartLogStream.end();
    }
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
