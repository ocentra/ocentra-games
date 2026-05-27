#!/usr/bin/env node

import { spawn } from 'child_process';
import { createWriteStream, mkdirSync, existsSync, rmSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  applyEditorWebEnv,
  applyLocalWorkerEnv,
  readPortArg,
  resolveEditorWebPort,
  resolveWorkerPort,
} from './dev-port-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const TEMP_DIR = path.join(ROOT, '.temp');
const LOG_FILE = path.join(TEMP_DIR, 'dev-editor-output.log');

type EditorBackend = 'local' | 'production';
type OutputChoice = { teeToFile: boolean; profile: boolean };

function question(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve((answer ?? '').trim()));
  });
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

async function promptLaunchPreset(
  rl: ReturnType<typeof createInterface>
): Promise<{ backend: EditorBackend; output: OutputChoice } | undefined> {
  console.log('\n  Asset Editor dev (Tauri desktop only)');
  console.log('  Quick launch:');
  console.log('    1) local (shared worker) + log + profile');
  console.log('    2) local (shared worker) console only');
  console.log('    3) production (real Cloudflare) + log + profile');
  console.log('    4) production (real Cloudflare) console only');
  console.log('    5) normal (choose backend + output)');
  const raw = await question(rl, '  Choose (1-5): ');
  if (raw === '1') return { backend: 'local', output: { teeToFile: true, profile: true } };
  if (raw === '2') return { backend: 'local', output: { teeToFile: false, profile: false } };
  if (raw === '3') return { backend: 'production', output: { teeToFile: true, profile: true } };
  if (raw === '4') return { backend: 'production', output: { teeToFile: false, profile: false } };
  return undefined;
}

async function promptBackend(
  rl: ReturnType<typeof createInterface>,
  preset?: EditorBackend,
  workerPort = resolveWorkerPort()
): Promise<EditorBackend> {
  if (preset) return preset;
  console.log('\n  Backend:');
  console.log(`    1) local      - Shared Cloudflare worker on localhost:${workerPort}, same as main app`);
  console.log('    2) production - Real Cloudflare (set VITE_EDITOR_SYNC_REAL_* in .env)');
  const raw = await question(rl, '  Choose (1-2): ');
  return raw === '2' ? 'production' : 'local';
}

async function promptOutput(rl: ReturnType<typeof createInterface>, preset?: OutputChoice): Promise<OutputChoice> {
  if (preset !== undefined) return preset;
  console.log('\n  Output:');
  console.log('    1) console only');
  console.log('    2) console + log file (.temp/dev-editor-output.log)');
  console.log('    3) console + log file + profile (.temp/performance-profile-editor.json)');
  const raw = await question(rl, '  Choose (1-3): ');
  if (raw === '3') return { teeToFile: true, profile: true };
  if (raw === '2') return { teeToFile: true, profile: false };
  return { teeToFile: false, profile: false };
}

function run(
  command: string,
  args: string[],
  env: Record<string, string> = {},
  teeToFile = false,
  cwd: string = ROOT
): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!teeToFile) {
      const proc = spawn(command, args, {
        cwd,
        stdio: 'inherit',
        shell: process.platform === 'win32',
        env: { ...process.env, ...env },
      });
      proc.on('exit', (code) => resolve(code ?? 0));
      proc.on('error', reject);
      return;
    }
    if (!existsSync(TEMP_DIR)) mkdirSync(TEMP_DIR, { recursive: true });
    const logStream = createWriteStream(LOG_FILE, { flags: 'w' });
    const proc = spawn(command, args, {
      cwd,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: { ...process.env, ...env },
    });
    function tee(data: Buffer, isStderr: boolean): void {
      const str = data.toString();
      const out = str
        .split('\n')
        .filter((s) => s.length > 0)
        .map((line) => `${timestamp()} ${line}`)
        .join('\n');
      if (out) {
        (isStderr ? process.stderr : process.stdout).write(str);
        logStream.write(out + '\n');
      }
    }
    proc.stdout?.on('data', (d: Buffer) => tee(d, false));
    proc.stderr?.on('data', (d: Buffer) => tee(d, true));
    proc.on('exit', (code) => {
      logStream.end();
      resolve(code ?? 0);
    });
    proc.on('error', (err) => {
      logStream.end();
      reject(err);
    });
  });
}

function isForceRequested(): boolean {
  return process.argv.slice(2).includes('--force');
}

function clearViteCacheForForce(): void {
  for (const cacheDir of [
    path.join(ROOT, 'node_modules', '.vite'),
    path.join(ROOT, 'packages', 'asset-editor', 'node_modules', '.vite'),
  ]) {
    if (!existsSync(cacheDir)) {
      continue;
    }
    console.log(`[force] Clearing Vite optimize cache: ${cacheDir}`);
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

function parsePresetFromArgv(): {
  backend?: EditorBackend;
  output?: OutputChoice;
  workerPort?: number;
  editorPort?: number;
} {
  const argv = process.argv.slice(2);
  let backend: EditorBackend | undefined;
  const workerPort = readPortArg(argv, ['--worker-port', '--api-port']);
  const editorPort = readPortArg(argv, ['--editor-port', '--port', '--use']);
  let tee = false;
  let profile = false;
  for (const arg of argv) {
    if (arg === '--backend=local') backend = 'local';
    else if (arg === '--backend=production') backend = 'production';
    else if (arg === '--output' || arg === '--tee') tee = true;
    else if (arg === '--profile') profile = true;
  }
  const output = tee || profile ? { teeToFile: tee, profile } : undefined;
  return { backend, output, workerPort, editorPort };
}

async function main(): Promise<void> {
  const force = isForceRequested();
  if (force) {
    clearViteCacheForForce();
  }

  const preset = parsePresetFromArgv();
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  const launch = await promptLaunchPreset(rl);
  const backend = launch ? launch.backend : await promptBackend(rl, preset.backend, preset.workerPort ?? resolveWorkerPort());
  const output = launch ? launch.output : await promptOutput(rl, preset.output);

  rl.close();

  const editorPort = preset.editorPort ?? resolveEditorWebPort();
  const workerPort = preset.workerPort ?? resolveWorkerPort();
  const outLabel = output.teeToFile ? (output.profile ? 'log + profile' : 'log') : 'console';
  const backendLabel = backend === 'local' ? `local | worker: ${workerPort}` : 'production';
  console.log(`\n  editor: ${editorPort}`);
  console.log(`\n  → tauri | ${backendLabel} | ${outLabel}${output.teeToFile ? ` → ${LOG_FILE}` : ''}\n`);

  const env: Record<string, string> = {};
  applyEditorWebEnv(env, editorPort);
  if (backend === 'local') {
    applyLocalWorkerEnv(env, workerPort);
  }
  if (output.profile) env.VITE_PROFILE = '1';
  if (force) {
    env.FORCE = 'true';
    env.VITE_FORCE = 'true';
  }

  const script = backend === 'local' ? 'scripts/dev/dev-editor-tauri.ts' : 'scripts/dev/dev-editor-tauri-production.ts';
  const scriptArgs = ['tsx', script, '--editor-port', String(editorPort), ...(force ? ['--force'] : [])];
  if (backend === 'local') {
    scriptArgs.push('--worker-port', String(workerPort));
  }
  const code = await run('npx', scriptArgs, env, output.teeToFile);
  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
