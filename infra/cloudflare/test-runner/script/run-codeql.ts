#!/usr/bin/env node

import { spawn } from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptDir = __dirname;
const testRunnerDir = path.dirname(scriptDir);
const cloudflareDir = path.dirname(testRunnerDir);
const testRunnerReportJsonDir = path.join(testRunnerDir, 'ReportJson');
const testRunnerLogsDir = path.join(testRunnerDir, 'logs');
const testRunnerDatabasesDir = path.join(testRunnerDir, 'databases');
const codeqlChecksumPath = path.join(testRunnerDatabasesDir, '.codeql-db-checksum.json');

if (!fs.existsSync(testRunnerReportJsonDir)) fs.mkdirSync(testRunnerReportJsonDir, { recursive: true });
if (!fs.existsSync(testRunnerLogsDir)) fs.mkdirSync(testRunnerLogsDir, { recursive: true });
if (!fs.existsSync(testRunnerDatabasesDir)) fs.mkdirSync(testRunnerDatabasesDir, { recursive: true });

const codeqlLogStream = fs.createWriteStream(path.join(testRunnerLogsDir, 'codeql.log'), { flags: 'w' });

function runCommand(
  command: string,
  args: string[],
  options: { toolLogStream?: fs.WriteStream; cwd?: string; timeout?: number } = {}
): Promise<number> {
  return new Promise((resolve) => {
    let resolved = false;
    const timeout = options.timeout ?? 900000;
    const quotedCommand = command.includes(' ') && process.platform === 'win32' ? `"${command}"` : command;
    const cwd = options.cwd ?? cloudflareDir;
    const child = spawn(quotedCommand, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: true,
      cwd,
    });
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try {
          child.kill('SIGTERM');
        } catch {
          void 0;
        }
        resolve(124);
      }
    }, timeout);
    const writeLog = (text: string) => {
      if (options.toolLogStream) options.toolLogStream.write(text);
    };
    child.stdout?.on('data', (data) => {
      const t = data.toString();
      process.stdout.write(t);
      writeLog(t);
    });
    child.stderr?.on('data', (data) => {
      const t = data.toString();
      process.stderr.write(t);
      writeLog(t);
    });
    child.on('close', (code) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve(code ?? 0);
      }
    });
    child.on('error', () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeoutId);
        resolve(1);
      }
    });
  });
}

async function computeSourceChecksum(): Promise<string> {
  const srcDir = path.join(cloudflareDir, 'src');
  const files: string[] = [];
  function collect(dir: string): void {
    if (!fs.existsSync(dir)) return;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) collect(p);
      else if (e.isFile() && e.name.endsWith('.ts')) files.push(p);
    }
  }
  collect(srcDir);
  files.sort();
  const hashes = files.map((f) => `${path.relative(cloudflareDir, f)}:${crypto.createHash('md5').update(fs.readFileSync(f, 'utf-8')).digest('hex')}`);
  return crypto.createHash('sha256').update(hashes.join('\n')).digest('hex');
}

function loadSavedChecksum(): { checksum: string } | null {
  try {
    if (fs.existsSync(codeqlChecksumPath)) {
      return JSON.parse(fs.readFileSync(codeqlChecksumPath, 'utf-8'));
    }
  } catch {
    void 0;
  }
  return null;
}

function saveChecksum(checksum: string): void {
  fs.writeFileSync(codeqlChecksumPath, JSON.stringify({ checksum, timestamp: new Date().toISOString() }, null, 2), 'utf-8');
}

export async function runCodeQL(): Promise<number> {
  const start = Date.now();
  const codeqlJsonPath = path.join(testRunnerReportJsonDir, 'codeql-results.json');
  const codeqlCommand = process.platform === 'win32' && !process.env.PATH?.includes('codeql') ? 'E:\\tools\\codeql\\codeql.exe' : 'codeql';
  const codeqlDatabasePath = path.join(testRunnerDatabasesDir, 'codeql-database');
  const forceRebuild = process.argv.includes('--force-codeql-rebuild');
  try {
    let cacheUsed = false;
    if (!forceRebuild && fs.existsSync(codeqlDatabasePath)) {
      const saved = loadSavedChecksum();
      if (saved) {
        const current = await computeSourceChecksum();
        if (current === saved.checksum) {
          cacheUsed = true;
        } else {
          fs.rmSync(codeqlDatabasePath, { recursive: true, force: true });
        }
      }
    } else if (fs.existsSync(codeqlDatabasePath)) {
      fs.rmSync(codeqlDatabasePath, { recursive: true, force: true });
    }
    if (!cacheUsed) {
      const codeqlConfigPath = path.join(cloudflareDir, 'codeql-config.yml');
      const createCode = await runCommand(codeqlCommand, [
        'database',
        'create',
        codeqlDatabasePath,
        '--language=javascript',
        '--threads=0',
        `--source-root=${cloudflareDir}`,
        `--codescanning-config=${codeqlConfigPath}`,
      ], { toolLogStream: codeqlLogStream, cwd: cloudflareDir, timeout: 900000 });
      if (createCode !== 0) throw new Error(`CodeQL database creation failed: ${createCode}`);
      saveChecksum(await computeSourceChecksum());
    }
    const sarifPath = path.join(testRunnerReportJsonDir, 'codeql-results.sarif');
    const analyzeCode = await runCommand(codeqlCommand, [
      'database',
      'analyze',
      codeqlDatabasePath,
      '--format=sarif-latest',
      `--output=${sarifPath}`,
      'codeql/javascript-queries',
      '--threads=0',
    ], { toolLogStream: codeqlLogStream, cwd: cloudflareDir });
    let findings = 0;
    if (fs.existsSync(sarifPath)) {
      try {
        const sarif = JSON.parse(fs.readFileSync(sarifPath, 'utf-8')) as { runs?: Array<{ results?: unknown[] }> };
        findings = sarif.runs?.[0]?.results?.length ?? 0;
      } catch {
        void 0;
      }
    }
    const result = {
      name: 'CodeQL Static Analysis',
      status: analyzeCode === 0 ? (findings === 0 ? 'passed' : 'failed') : 'warning',
      exitCode: analyzeCode,
      duration: (Date.now() - start) / 1000,
      findings,
      summary: findings === 0 ? 'No security findings' : `Found ${findings} security findings`,
      sarifPath: fs.existsSync(sarifPath) ? sarifPath : undefined,
    };
    fs.writeFileSync(codeqlJsonPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`  [PASS] CodeQL completed (${findings} findings)`);
    return analyzeCode === 0 ? 0 : 1;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isNotInstalled = err instanceof Error && (err as NodeJS.ErrnoException).code === 'ENOENT';
    fs.writeFileSync(codeqlJsonPath, JSON.stringify({
      name: 'CodeQL Static Analysis',
      status: 'failed',
      errorType: isNotInstalled ? 'not_installed' : 'execution_error',
      duration: (Date.now() - start) / 1000,
      findings: 0,
      summary: isNotInstalled ? 'CodeQL not installed' : `CodeQL failed: ${msg}`,
    }, null, 2), 'utf-8');
    console.error('  [FAIL]', msg);
    return 1;
  } finally {
    codeqlLogStream.end();
  }
}

async function main(): Promise<void> {
  console.log('[run-codeql] CodeQL Static Analysis\n');
  const exitCode = await runCodeQL();
  process.exit(exitCode);
}

main();
