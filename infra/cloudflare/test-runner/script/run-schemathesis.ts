#!/usr/bin/env node

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import { fileURLToPath } from 'url';
import { TestTokenPrefix } from '@ocentra/endpoint-domain/constants/auth';
import { HttpAuthScheme, HttpHeader } from '@ocentra/endpoint-domain/constants/http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;
const testRunnerDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(testRunnerDir);
const testRunnerReportJsonDir = path.join(testRunnerDir, 'ReportJson');
const testRunnerLogsDir = path.join(testRunnerDir, 'logs');

if (!fs.existsSync(testRunnerReportJsonDir)) {
  fs.mkdirSync(testRunnerReportJsonDir, { recursive: true });
}
if (!fs.existsSync(testRunnerLogsDir)) {
  fs.mkdirSync(testRunnerLogsDir, { recursive: true });
}

const schemathesisLogPath = path.join(testRunnerLogsDir, 'schemathesis.log');
const schemathesisLogStream = fs.createWriteStream(schemathesisLogPath, { flags: 'w' });

function runCommandWithOutput(
  command: string,
  args: string[],
  options: { timeout?: number; toolLogStream?: fs.WriteStream; cwd?: string } = {}
): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    let output = '';
    let resolved = false;
    const timeout = options.timeout ?? 600000;
    const quotedCommand = command.includes(' ') && process.platform === 'win32' ? `"${command}"` : command;
    const cwd = options.cwd ?? cloudflareDir;
    const toolLogStream = options.toolLogStream;

    const child = spawn(quotedCommand, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      cwd,
      env: {
        ...process.env,
        PYTHONIOENCODING: 'utf-8',
        PYTHONLEGACYWINDOWSSTDIO: '0',
      },
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

function parseSchemathesisOutput(output: string): Record<string, unknown> {
  try {
    const testCasesMatch = output.match(/(\d+)\s+generated/i) || output.match(/(\d+)\s+test cases?/i);
    const failuresMatch = output.match(/(\d+)\s+failures?/i);
    const errorsMatch = output.match(/(\d+)\s+error/i);
    const errorCategories: Record<string, number> = {};
    const categoryPatterns = [
      { pattern: /❌\s+API accepts requests without authentication:\s+(\d+)/i, key: 'missing_auth' },
      { pattern: /❌\s+Server error:\s+(\d+)/i, key: 'server_error' },
      { pattern: /❌\s+Response violates schema:\s+(\d+)/i, key: 'schema_violation' },
    ];
    categoryPatterns.forEach(({ pattern, key }) => {
      const match = output.match(pattern);
      if (match?.[1]) errorCategories[key] = parseInt(match[1], 10);
    });
    return {
      testCases: testCasesMatch ? parseInt(testCasesMatch[1], 10) : undefined,
      failures: failuresMatch ? parseInt(failuresMatch[1], 10) : undefined,
      errors: errorsMatch ? parseInt(errorsMatch[1], 10) : undefined,
      errorCategories: Object.keys(errorCategories).length > 0 ? errorCategories : undefined,
    };
  } catch {
    return {};
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
  console.log('[run-schemathesis] Schemathesis API fuzzing\n');

  const workerUrl = process.env.WORKER_URL;
  if (workerUrl) {
    console.log(`  Using WORKER_URL: ${workerUrl}`);
    const healthy = await checkWorkerHealth(workerUrl);
    if (!healthy) {
      console.error('  [FAIL] Worker not reachable at', workerUrl);
      const result = {
        name: 'Schemathesis API Fuzzing',
        status: 'failed',
        errorType: 'worker_unavailable',
        summary: `Worker not reachable at ${workerUrl}`,
      };
      fs.writeFileSync(path.join(testRunnerReportJsonDir, 'schemathesis-results.json'), JSON.stringify(result, null, 2), 'utf-8');
      process.exit(1);
    }
  } else {
    const workerRunning = await ensureWorker();
    if (!workerRunning) {
      console.error('  [FAIL] Worker not available. Start with: npm run dev');
      const result = {
        name: 'Schemathesis API Fuzzing',
        status: 'failed',
        errorType: 'worker_unavailable',
        summary: 'Worker not available - start with npm run dev or worker:start',
      };
      fs.writeFileSync(path.join(testRunnerReportJsonDir, 'schemathesis-results.json'), JSON.stringify(result, null, 2), 'utf-8');
      process.exit(1);
    }
  }

  const baseUrl = workerUrl ?? 'http://localhost:8787';
  const openapiUrl = `${baseUrl}/openapi.json`;
  const schemathesisAuthToken = process.env.SCHEMATHESIS_AUTH_TOKEN?.trim() || `${TestTokenPrefix.Test}schemathesis:admin`;
  const schemathesisArgs = [
    'run',
    openapiUrl,
    '--url',
    baseUrl,
    '--checks',
    'all',
    '--max-examples',
    '50',
    '--header',
    `${HttpHeader.Authorization}: ${HttpAuthScheme.Bearer} ${schemathesisAuthToken}`,
  ];

  const startTime = Date.now();
  try {
    const { code, output } = await runCommandWithOutput('schemathesis', schemathesisArgs, {
      toolLogStream: schemathesisLogStream,
      timeout: 600000,
    });

    schemathesisLogStream.end();

    const isNotInstalled = output.includes('is not recognized') || output.includes('command not found') || (output.length < 50 && !output.includes('Schemathesis'));
    const isEncodingError = output.includes('UnicodeEncodeError') || output.includes('charmap codec');
    const isInstalled = output.includes('Schemathesis v') || output.includes('Loaded specification');

    const duration = (Date.now() - startTime) / 1000;
    const schemathesisJsonPath = path.join(testRunnerReportJsonDir, 'schemathesis-results.json');

    if (isNotInstalled && !isInstalled) {
      const result = {
        name: 'Schemathesis API Fuzzing',
        status: 'failed',
        exitCode: code,
        errorType: 'not_installed',
        duration: 0,
        summary: 'Schemathesis not installed - install with: pip install schemathesis',
        installCommand: 'pip install schemathesis',
      };
      fs.writeFileSync(schemathesisJsonPath, JSON.stringify(result, null, 2), 'utf-8');
      console.error('  [FAIL] Schemathesis not installed. Install with: pip install schemathesis');
      process.exit(1);
    }

    if (isEncodingError) {
      const result = {
        name: 'Schemathesis API Fuzzing',
        status: 'warning',
        exitCode: code,
        errorType: 'encoding_error',
        duration,
        summary: 'Schemathesis encoding error (Windows console)',
        workaround: 'Set PYTHONIOENCODING=utf-8',
      };
      fs.writeFileSync(schemathesisJsonPath, JSON.stringify(result, null, 2), 'utf-8');
      console.warn('  [WARN] Schemathesis encoding error - see log');
      process.exit(0);
    }

    const status = code === 0 ? 'passed' : 'failed';
    const parsed = parseSchemathesisOutput(output);
    const result = {
      name: 'Schemathesis API Fuzzing',
      status,
      exitCode: code,
      duration,
      summary: code === 0 ? 'Schemathesis API fuzzing completed' : `Schemathesis exited with code ${code}`,
      ...parsed,
    };
    fs.writeFileSync(schemathesisJsonPath, JSON.stringify(result, null, 2), 'utf-8');

    if (code === 0) {
      console.log(`  [PASS] Schemathesis completed in ${duration.toFixed(1)}s`);
    } else {
      console.warn(`  [WARN] Schemathesis exited with code ${code}`);
    }
    process.exit(code === 0 ? 0 : 1);
  } catch (error: unknown) {
    schemathesisLogStream.end();
    const errMsg = error instanceof Error ? error.message : String(error);
    const result = {
      name: 'Schemathesis API Fuzzing',
      status: 'failed',
      exitCode: 1,
      errorType: 'execution_error',
      duration: (Date.now() - startTime) / 1000,
      errorMessage: errMsg,
      summary: `Schemathesis failed: ${errMsg}`,
    };
    fs.writeFileSync(path.join(testRunnerReportJsonDir, 'schemathesis-results.json'), JSON.stringify(result, null, 2), 'utf-8');
    console.error('  [FAIL]', errMsg);
    process.exit(1);
  }
}

main();
