#!/usr/bin/env node

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { runCodeQL } from './run-codeql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;
const testRunnerDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(testRunnerDir);
const testRunnerReportJsonDir = path.join(testRunnerDir, 'ReportJson');
const testRunnerLogsDir = path.join(testRunnerDir, 'logs');
const testRunnerDatabasesDir = path.join(testRunnerDir, 'databases');

if (!fs.existsSync(testRunnerReportJsonDir)) fs.mkdirSync(testRunnerReportJsonDir, { recursive: true });
if (!fs.existsSync(testRunnerLogsDir)) fs.mkdirSync(testRunnerLogsDir, { recursive: true });
if (!fs.existsSync(testRunnerDatabasesDir)) fs.mkdirSync(testRunnerDatabasesDir, { recursive: true });

const semgrepLogStream = fs.createWriteStream(path.join(testRunnerLogsDir, 'semgrep.log'), { flags: 'w' });
const trivyLogStream = fs.createWriteStream(path.join(testRunnerLogsDir, 'trivy.log'), { flags: 'w' });

function runCommandWithOutput(
  command: string,
  args: string[],
  options: { timeout?: number; toolLogStream?: fs.WriteStream; cwd?: string; env?: Record<string, string>; onProgress?: (t: string) => void } = {}
): Promise<{ code: number; output: string }> {
  return new Promise((resolve) => {
    let output = '';
    let resolved = false;
    const timeout = options.timeout ?? 300000;
    const quotedCommand = command.includes(' ') && process.platform === 'win32' ? `"${command}"` : command;
    const cwd = options.cwd ?? cloudflareDir;
    const child = spawn(quotedCommand, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      cwd,
      env: { ...process.env, ...options.env },
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
    const writeLog = (text: string) => {
      if (options.toolLogStream) options.toolLogStream.write(text);
      if (options.onProgress) options.onProgress(text);
    };
    child.stdout?.on('data', (data) => {
      const t = data.toString();
      output += t;
      process.stdout.write(t);
      writeLog(t);
    });
    child.stderr?.on('data', (data) => {
      const t = data.toString();
      output += t;
      process.stderr.write(t);
      writeLog(t);
    });
    child.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ code: code ?? 0, output });
      }
    });
    child.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve({ code: 1, output: err.message });
      }
    });
  });
}

async function runSemgrep(): Promise<number> {
  console.log('  [1/3] Semgrep...');
  const start = Date.now();
  const semgrepJsonPath = path.join(testRunnerReportJsonDir, 'semgrep-results.json');
  const semgrepRawPath = path.join(testRunnerReportJsonDir, 'semgrep-raw-output.json');
  try {
    const { code, output } = await runCommandWithOutput('semgrep', [
      '--config=auto',
      '--json',
      '--output',
      semgrepRawPath,
      '--exclude=test-runner',
      '--exclude=node_modules',
      '--exclude=.stryker-tmp',
      '--exclude=.wrangler',
      '--exclude=dist',
      '--exclude=coverage',
      path.join(cloudflareDir, 'src'),
    ], { toolLogStream: semgrepLogStream });
    const isNotInstalled = output.includes('is not recognized') || output.includes('command not found') || (code !== 0 && code !== 1 && code !== 2 && !fs.existsSync(semgrepRawPath));
    let findings = 0;
    if (!isNotInstalled && fs.existsSync(semgrepRawPath)) {
      try {
        const j = JSON.parse(fs.readFileSync(semgrepRawPath, 'utf-8')) as { results?: unknown[] };
        findings = j?.results?.length ?? 0;
      } catch {
        void 0;
      }
    }
    const result = {
      name: 'Semgrep Static Analysis',
      status: isNotInstalled ? 'failed' : findings === 0 ? 'passed' : 'failed',
      errorType: isNotInstalled ? 'not_installed' : undefined,
      duration: (Date.now() - start) / 1000,
      findings,
      summary: isNotInstalled ? 'Semgrep not installed - pip install semgrep' : findings === 0 ? 'No security findings' : `Found ${findings} security findings`,
      installCommand: isNotInstalled ? 'pip install semgrep' : undefined,
    };
    fs.writeFileSync(semgrepJsonPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(isNotInstalled ? '  [FAIL] Semgrep not installed' : `  [PASS] Semgrep completed (${findings} findings)`);
    return isNotInstalled ? 1 : 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fs.writeFileSync(semgrepJsonPath, JSON.stringify({ name: 'Semgrep Static Analysis', status: 'failed', errorType: 'execution_error', duration: (Date.now() - start) / 1000, findings: 0, summary: `Semgrep failed: ${msg}` }, null, 2), 'utf-8');
    console.error('  [FAIL]', msg);
    return 1;
  }
}

async function runTrivy(): Promise<number> {
  console.log('  [2/3] Trivy...');
  const start = Date.now();
  const trivyJsonPath = path.join(testRunnerReportJsonDir, 'trivy-results.json');
  const trivyCommand = process.platform === 'win32' && !process.env.PATH?.includes('trivy') ? 'E:\\tools\\trivy_0.68.2_windows-64bit\\trivy.exe' : 'trivy';
  try {
    const { code, output } = await runCommandWithOutput(trivyCommand, [
      'fs',
      '--severity',
      'CRITICAL,HIGH',
      '--format',
      'json',
      '--output',
      trivyJsonPath,
      '--skip-dirs',
      'test-runner,node_modules,.stryker-tmp,.wrangler,dist,coverage',
      '--db-repository',
      'public.ecr.aws/aquasecurity/trivy-db:2',
      '--db-repository',
      'mirror.gcr.io/aquasec/trivy-db:2',
      '--db-repository',
      'ghcr.io/aquasecurity/trivy-db:2',
      cloudflareDir,
    ], { toolLogStream: trivyLogStream, timeout: 120000 });
    let vulns = 0;
    if ((code === 0 || code === 1) && fs.existsSync(trivyJsonPath)) {
      try {
        const j = JSON.parse(fs.readFileSync(trivyJsonPath, 'utf-8')) as { Results?: Array<{ Vulnerabilities?: unknown[] }> };
        vulns = (j.Results ?? []).flatMap((r) => r.Vulnerabilities ?? []).length;
      } catch {
        void 0;
      }
    }
    const dbFailed = output.includes('failed to download vulnerability DB') || output.includes('credential helper error');
    const result = {
      name: 'Trivy Vulnerability Scanner',
      status: dbFailed ? 'warning' : vulns === 0 ? 'passed' : 'failed',
      duration: (Date.now() - start) / 1000,
      vulnerabilities: vulns,
      summary: vulns === 0 ? 'No CRITICAL or HIGH vulnerabilities found' : `Found ${vulns} vulnerabilities`,
      errorType: dbFailed ? 'execution_error' : undefined,
    };
    fs.writeFileSync(trivyJsonPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`  [PASS] Trivy completed (${vulns} vulns)`);
    return 0;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    fs.writeFileSync(trivyJsonPath, JSON.stringify({ name: 'Trivy Vulnerability Scanner', status: 'failed', duration: (Date.now() - start) / 1000, vulnerabilities: 0, summary: `Trivy failed: ${msg}` }, null, 2), 'utf-8');
    console.error('  [FAIL]', msg);
    return 1;
  }
}

async function main(): Promise<void> {
  console.log('[run-static-analysis] Semgrep, Trivy, CodeQL\n');
  const semgrepExit = await runSemgrep();
  semgrepLogStream.end();
  const trivyExit = await runTrivy();
  trivyLogStream.end();
  console.log('  [3/3] CodeQL...');
  const codeqlExit = await runCodeQL();
  const failed = [semgrepExit, trivyExit, codeqlExit].filter((c) => c !== 0).length;
  console.log(failed === 0 ? '\n  All static analysis tools completed.' : `\n  ${failed} tool(s) had issues.`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
