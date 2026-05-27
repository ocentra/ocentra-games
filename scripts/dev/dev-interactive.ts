#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { createWriteStream, mkdirSync, existsSync, readFileSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { OpenApiServer } from '@ocentra/endpoint-domain/constants/openapi';
import { applyLocalWorkerEnv, parsePortNumber, readPortArg, resolveWorkerPort } from './dev-port-config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const TEMP_DIR = path.join(ROOT, '.temp');
const LOG_FILE = path.join(TEMP_DIR, 'dev-output.log');

type Target = 'web' | 'tauri' | 'android' | 'ios';
type Backend = 'local' | 'development' | 'production' | 'none';
type AndroidMode = 'studio' | 'emulator';
type WebFrontendMode = 'dev' | 'preview' | 'pages';

function question(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve((answer ?? '').trim()));
  });
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function applyDotenvFile(filePath: string): void {
  if (!existsSync(filePath)) return;
  const parsed = dotenv.parse(readFileSync(filePath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    const existing = process.env[key];
    if (existing === undefined || String(existing).trim().length === 0) {
      process.env[key] = value;
    }
  }
}

function normalizeUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, '');
}

function stripKnownAssetPath(value: string): string {
  const normalized = normalizeUrl(value);
  if (!normalized) return value;
  const suffixes = [
    ApiEndpoint.Assets.List,
    ApiEndpoint.Assets.Base,
  ].sort((a, b) => b.length - a.length);
  for (const suffix of suffixes) {
    if (normalized.endsWith(suffix)) {
      return normalized.slice(0, -suffix.length);
    }
  }
  return normalized;
}

function isLocalWorkerUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.hostname === '127.0.0.1'
      || parsed.hostname === 'localhost'
      || parsed.hostname === '0.0.0.0'
      || parsed.hostname === '::1';
  } catch {
    return false;
  }
}

function firstEnvValue(keys: string[]): string | undefined {
  for (const key of keys) {
    const value = normalizeUrl(process.env[key]);
    if (value) return value;
  }
  return undefined;
}

function resolveRemoteWorkerUrl(backend: Exclude<Backend, 'local' | 'none'>): string {
  const configured = backend === 'development'
    ? firstEnvValue([
      'CLAIM_STORAGE_WORKER_URL_DEV',
      'CLAIM_STORAGE_ASSETS_URL_DEV',
      'ASSETS_WORKER_URL_DEV',
      'VITE_CLAIM_STORAGE_URL_DEV',
      'VITE_ASSETS_WORKER_URL_DEV',
      'VITE_MAIN_DEV_CLAIM_STORAGE_URL',
      'VITE_MAIN_DEV_ASSETS_WORKER_URL',
    ])
    : firstEnvValue([
      'CLAIM_STORAGE_WORKER_URL_PROD',
      'CLAIM_STORAGE_ASSETS_URL_PROD',
      'ASSETS_WORKER_URL_PROD',
      'VITE_CLAIM_STORAGE_URL_PROD',
      'VITE_ASSETS_WORKER_URL_PROD',
      'VITE_MAIN_PROD_CLAIM_STORAGE_URL',
      'VITE_MAIN_PROD_ASSETS_WORKER_URL',
    ]);
  const url = stripKnownAssetPath(
    configured ?? (backend === 'development' ? OpenApiServer.Development : OpenApiServer.Production)
  );

  if (!url) {
    throw new Error(`Missing explicit ${backend} Cloudflare worker URL.`);
  }
  if (isLocalWorkerUrl(url)) {
    throw new Error(`Refusing to use local URL for ${backend} Cloudflare backend: ${url}`);
  }
  return url;
}

type OutputChoice = { teeToFile: boolean; profile: boolean };

type LaunchPreset = {
  target: Target;
  webMode?: WebFrontendMode;
  backend?: Backend;
  output?: OutputChoice;
};

async function promptLaunchPreset(
  rl: ReturnType<typeof createInterface>,
  preset?: LaunchPreset
): Promise<LaunchPreset | undefined> {
  if (preset) return preset;
  console.log('\n  Quick launch:');
  console.log('    1) web preview + local worker/seed + log + profile');
  console.log('    2) web dev (HMR) + local worker/seed + log + profile');
  console.log('    3) tauri + local worker/seed + log + profile');
  console.log('    4) Cloudflare Pages parity + local worker/seed + log + profile');
  console.log('    5) Cloudflare Pages parity + Cloudflare dev sync/backend + log + profile');
  console.log('    6) Cloudflare Pages parity + Cloudflare production sync/backend + log + profile');
  console.log('    7) normal (custom choices)');
  const raw = await question(rl, '  Choose (1-7): ');
  if (raw === '1') {
    return {
      target: 'web',
      webMode: 'preview',
      backend: 'local',
      output: { teeToFile: true, profile: true },
    };
  }
  if (raw === '2') {
    return {
      target: 'web',
      webMode: 'dev',
      backend: 'local',
      output: { teeToFile: true, profile: true },
    };
  }
  if (raw === '3') {
    return {
      target: 'tauri',
      backend: 'local',
      output: { teeToFile: true, profile: true },
    };
  }
  if (raw === '4') {
    return {
      target: 'web',
      webMode: 'pages',
      backend: 'local',
      output: { teeToFile: true, profile: true },
    };
  }
  if (raw === '5') {
    return {
      target: 'web',
      webMode: 'pages',
      backend: 'development',
      output: { teeToFile: true, profile: true },
    };
  }
  if (raw === '6') {
    return {
      target: 'web',
      webMode: 'pages',
      backend: 'production',
      output: { teeToFile: true, profile: true },
    };
  }
  return undefined;
}

async function promptOutput(
  rl: ReturnType<typeof createInterface>,
  preset?: OutputChoice
): Promise<OutputChoice> {
  if (preset !== undefined) return preset;
  console.log('\n  Output:');
  console.log('    1) console only');
  console.log('    2) console + log file (.temp/dev-output.log)');
  console.log('    3) console + log file + profile (.temp/dev-output.log | .temp/performance-profile.json)');
  const raw = await question(rl, '  Choose (1-3): ');
  if (raw === '3') return { teeToFile: true, profile: true };
  if (raw === '2') return { teeToFile: true, profile: false };
  return { teeToFile: false, profile: false };
}

async function promptTarget(rl: ReturnType<typeof createInterface>, preset?: Target): Promise<Target> {
  if (preset) return preset;
  console.log('\n  Target:');
  console.log('    1) web     - Browser (Vite)');
  console.log('    2) tauri   - Desktop (Windows)');
  console.log('    3) android - Mobile (Capacitor → Android Studio)');
  console.log('    4) ios     - Mobile (Capacitor → Xcode)');
  const raw = await question(rl, '  Choose (1-4): ');
  const n = parseInt(raw, 10);
  if (n === 1) return 'web';
  if (n === 2) return 'tauri';
  if (n === 3) return 'android';
  if (n === 4) return 'ios';
  return 'web';
}

async function promptBackend(
  rl: ReturnType<typeof createInterface>,
  target: Target,
  preset?: Backend,
  workerPort = resolveWorkerPort()
): Promise<Backend> {
  if (preset) return preset;
  const isMobile = target === 'android' || target === 'ios';
  const localWorkerLabel = `localhost:${workerPort}`;
  const androidWorkerLabel = `10.0.2.2:${workerPort}`;
  if (isMobile) {
    console.log('\n  Backend:');
    console.log(`    1) local      - Start worker + seed, use ${localWorkerLabel} (emulator: ${androidWorkerLabel})`);
    console.log('    2) production - Use VITE_CLAIM_STORAGE_URL from .env');
    const raw = await question(rl, '  Choose (1-2): ');
    return raw === '2' ? 'production' : 'local';
  }
  console.log('\n  Backend:');
  console.log(`    1) local      - Start worker + seed, use ${localWorkerLabel}`);
  console.log('    2) development - Use Cloudflare dev Worker/R2');
  console.log('    3) production  - Use Cloudflare production Worker/R2');
  console.log('    4) none        - Vite only, no backend (API calls will fail)');
  const raw = await question(rl, '  Choose (1-4): ');
  if (raw === '2') return 'development';
  if (raw === '3') return 'production';
  if (raw === '4') return 'none';
  return 'local';
}

async function promptAndroidMode(
  rl: ReturnType<typeof createInterface>,
  preset?: AndroidMode
): Promise<AndroidMode> {
  if (preset) return preset;
  console.log('\n  Android launch:');
  console.log('    1) studio   - Open project in Android Studio');
  console.log('    2) emulator - Build and run on emulator/device (ADB)');
  const raw = await question(rl, '  Choose (1-2): ');
  return raw === '2' ? 'emulator' : 'studio';
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

const MAIN_TAURI_BIN_WIN = 'ocentraplatform.exe';
const MAIN_TAURI_BIN_UNIX = 'ocentraplatform';

async function killTauriAppIfRunning(): Promise<void> {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /IM ${MAIN_TAURI_BIN_WIN} /F 2>nul`, { stdio: 'pipe' });
    } else {
      execSync(`pkill -x ${MAIN_TAURI_BIN_UNIX} || true`, { stdio: 'pipe' });
    }
    await new Promise((r) => setTimeout(r, 500));
  } catch {
    /* ignore - process may not exist */
  }
}

async function execute(
  target: Target,
  webMode: WebFrontendMode,
  backend: Backend,
  output: OutputChoice,
  androidMode?: AndroidMode,
  frontendPort?: string,
  workerPort?: number
): Promise<number> {
  const { teeToFile, profile } = output;
  const env: Record<string, string> = {};

  if (backend === 'development' || backend === 'production') {
    const url = resolveRemoteWorkerUrl(backend);
    env.VITE_CLAIM_STORAGE_URL = url;
    env.VITE_R2_WORKER_URL = url;
    env.VITE_ASSETS_WORKER_URL = url;
    env.VITE_ASSETS_PUBLIC_URL = `${url}${ApiEndpoint.Assets.Base}`;
    env.VITE_MAIN_REAL_CLAIM_STORAGE_URL = url;
    env.VITE_MAIN_REAL_ASSETS_PUBLIC_URL = `${url}${ApiEndpoint.Assets.Base}`;
    env.VITE_MAIN_ASSET_TARGET_FORCE = 'real-cloud';
  } else if (backend === 'local') {
    applyLocalWorkerEnv(env, workerPort);
  } else {
    env.VITE_MAIN_ASSET_TARGET_FORCE = 'real-cloud';
  }

  if (profile) env.VITE_PROFILE = '1';
  if (frontendPort) {
    env.VITE_PORT = frontendPort;
    env.VITE_PREVIEW_PORT = frontendPort;
    env.PAGES_PREVIEW_PORT = frontendPort;
    env.PREVIEW_PORT = frontendPort;
  }

  if (target === 'web') {
    if (webMode === 'preview') {
      const args = ['tsx', 'scripts/dev/preview-stack.ts'];
      if (backend === 'local') args.push('--with-worker');
      return run('npx', args, env, teeToFile);
    }
    if (webMode === 'pages') {
      const args = ['tsx', 'scripts/dev/preview-stack.ts', '--pages'];
      if (backend === 'local') args.push('--with-worker');
      if (backend === 'development') args.push('--sync-assets=development');
      if (backend === 'production') args.push('--sync-assets=production');
      return run('npx', args, env, teeToFile);
    }
    if (backend === 'local') {
      return run('npx', ['tsx', 'scripts/dev/dev-full.ts'], env, teeToFile);
    }
    return run('npx', ['tsx', 'scripts/dev/dev.ts'], env, teeToFile);
  }

  if (target === 'tauri') {
    await killTauriAppIfRunning();
    env.BROWSER = 'none';
    env.CARGO_TARGET_DIR = path.join(ROOT, 'platforms', 'desktop', 'tauri', 'target-platform');
    const tauriCwd = path.join(ROOT, 'platforms', 'desktop');
    if (backend === 'local') {
      return run('npx', ['tauri', 'dev', '-c', 'tauri/tauri.conf.json'], env, teeToFile, tauriCwd);
    }
    return run('npx', ['tauri', 'dev', '-c', 'tauri/tauri.dev-production.conf.json'], env, teeToFile, tauriCwd);
  }

  if (target === 'android') {
    const capScript = androidMode === 'emulator' ? 'run:android' : 'cap:android';
    if (backend === 'local') {
      return run(
        'npx',
        ['tsx', 'scripts/dev/dev-mobile-full.ts', '--target=android', `--android-mode=${androidMode ?? 'studio'}`],
        env,
        teeToFile
      );
    }
    return run('npm', ['run', capScript], env, teeToFile);
  }

  if (target === 'ios') {
    if (backend === 'local') {
      return run('npx', ['tsx', 'scripts/dev/dev-mobile-full.ts', '--target=ios'], env, teeToFile);
    }
    return run('npm', ['run', 'cap:ios'], env, teeToFile);
  }

  return 1;
}

function parsePresetFromArgv(): {
  target?: Target;
  webMode?: WebFrontendMode;
  backend?: Backend;
  androidMode?: AndroidMode;
  output?: OutputChoice;
  preset?: LaunchPreset;
  frontendPort?: string;
  workerPort?: number;
} {
  const argv = process.argv.slice(2);
  let target: Target | undefined;
  let webMode: WebFrontendMode | undefined;
  let backend: Backend | undefined;
  let androidMode: AndroidMode | undefined;
  let output: OutputChoice | undefined;
  let preset: LaunchPreset | undefined;
  let frontendPort: string | undefined;
  const workerPort = readPortArg(argv, ['--worker-port', '--api-port']);
  let tee = false;
  let profile = false;

  const parsePortValue = (raw: string | undefined, flag: string): string => {
    return String(parsePortNumber(raw, flag));
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--target=web' || arg === '--web') target = 'web';
    else if (arg === '--target=tauri' || arg === '--tauri') target = 'tauri';
    else if (arg === '--target=android' || arg === '--android') target = 'android';
    else if (arg === '--target=ios' || arg === '--ios') target = 'ios';
    else if (arg === '--backend=local') backend = 'local';
    else if (arg === '--backend=development' || arg === '--backend=dev') backend = 'development';
    else if (arg === '--backend=production') backend = 'production';
    else if (arg === '--backend=none') backend = 'none';
    else if (arg === '--web-mode=dev' || arg === '--mode=dev') webMode = 'dev';
    else if (arg === '--web-mode=preview' || arg === '--mode=preview') webMode = 'preview';
    else if (arg === '--web-mode=pages' || arg === '--mode=pages') webMode = 'pages';
    else if (arg === '--android-mode=studio') androidMode = 'studio';
    else if (arg === '--android-mode=emulator') androidMode = 'emulator';
    else if (arg === '--output' || arg === '--tee') tee = true;
    else if (arg === '--profile') profile = true;
    else if (arg === '--port' || arg === '--use' || arg === '--preview-port') {
      frontendPort = parsePortValue(argv[i + 1], arg);
      i += 1;
    }
    else if (arg.startsWith('--port=')) frontendPort = parsePortValue(arg.slice('--port='.length), '--port');
    else if (arg.startsWith('--use=')) frontendPort = parsePortValue(arg.slice('--use='.length), '--use');
    else if (arg.startsWith('--preview-port=')) {
      frontendPort = parsePortValue(arg.slice('--preview-port='.length), '--preview-port');
    }
    else if (arg === '--quick=web-preview-local') {
      preset = {
        target: 'web',
        webMode: 'preview',
        backend: 'local',
        output: { teeToFile: true, profile: true },
      };
    }
    else if (arg === '--quick=pages-local') {
      preset = {
        target: 'web',
        webMode: 'pages',
        backend: 'local',
        output: { teeToFile: true, profile: true },
      };
    }
    else if (arg === '--quick=pages-dev') {
      preset = {
        target: 'web',
        webMode: 'pages',
        backend: 'development',
        output: { teeToFile: true, profile: true },
      };
    }
    else if (arg === '--quick=pages-prod') {
      preset = {
        target: 'web',
        webMode: 'pages',
        backend: 'production',
        output: { teeToFile: true, profile: true },
      };
    }
  }
  if (tee || profile) output = { teeToFile: tee, profile };
  return { target, webMode, backend, androidMode, output, preset, frontendPort, workerPort };
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const isForce = argv.includes('--force');

  if (isForce) {
    const viteCache = path.join(ROOT, 'node_modules', '.vite');
    if (existsSync(viteCache)) {
      console.log('🧹 [force] Clearing Vite optimize cache...');
      try {
        const { rmSync } = await import('fs');
        rmSync(viteCache, { recursive: true, force: true });
      } catch (err) {
        console.warn('⚠️  Failed to clear Vite cache:', (err as Error).message);
      }
    }
  }

  applyDotenvFile(path.join(ROOT, '.env'));
  applyDotenvFile(path.join(ROOT, '.env.local'));
  applyDotenvFile(path.join(ROOT, 'infra', 'cloudflare', '.env'));
  applyDotenvFile(path.join(ROOT, 'infra', 'cloudflare', '.dev.vars'));

  try {
    const { execSync } = await import('child_process');
    execSync('npx tsx scripts/generate-exports-flattened.ts', { stdio: 'pipe' });
  } catch {
    /* non-fatal - file may already exist */
  }
  const {
    target: presetTarget,
    webMode: presetWebMode,
    backend: presetBackend,
    output: presetOutput,
    androidMode: presetAndroidMode,
    preset,
    frontendPort,
    workerPort,
  } = parsePresetFromArgv();

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n  Ocentra dev');
  const quick = await promptLaunchPreset(rl, preset);
  const target = quick?.target ?? (await promptTarget(rl, presetTarget));
  const webMode: WebFrontendMode = quick?.webMode ?? presetWebMode ?? (target === 'web' ? 'dev' : 'dev');
  const backend = await promptBackend(rl, target, quick?.backend ?? presetBackend, workerPort ?? resolveWorkerPort());
  const androidMode = target === 'android' ? await promptAndroidMode(rl, presetAndroidMode) : undefined;
  const output = await promptOutput(rl, quick?.output ?? presetOutput);
  rl.close();

  const { teeToFile } = output;
  const androidLabel = target === 'android' ? ` | android: ${androidMode}` : '';
  const webModeLabel = target === 'web' ? ` | web: ${webMode}` : '';
  const portLabel = `${frontendPort ? ` | port: ${frontendPort}` : ''}${backend === 'local' ? ` | worker: ${workerPort ?? resolveWorkerPort()}` : ''}`;
  const outLabel = teeToFile
    ? output.profile
      ? ' | log + profile → .temp/dev-output.log | .temp/performance-profile.json'
      : ' | log → .temp/dev-output.log'
    : '';
  console.log(`\n  → ${target}${webModeLabel} | ${backend}${androidLabel}${portLabel}${outLabel}${isForce ? ' [force]' : ''}\n`);
  
  // Propagate force flag if present
  if (isForce && !process.env.VITE_FORCE) {
    process.env.VITE_FORCE = 'true';
    process.env.FORCE = 'true';
  }

  const code = await execute(target, webMode, backend, output, androidMode, frontendPort, workerPort);
  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
