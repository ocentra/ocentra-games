#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { createInterface } from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { CloudflareLocalConfig } from '@ocentra/endpoint-domain/constants/local';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const TEMP_DIR = path.join(ROOT, '.temp');
const LOG_FILE = path.join(TEMP_DIR, 'dev-output.log');

type Target = 'web' | 'tauri' | 'android' | 'ios';
type Backend = 'local' | 'production' | 'none';
type AndroidMode = 'studio' | 'emulator';
type WebFrontendMode = 'dev' | 'preview';

function question(rl: ReturnType<typeof createInterface>, prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, (answer) => resolve((answer ?? '').trim()));
  });
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
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
  console.log('    4) normal (custom choices)');
  const raw = await question(rl, '  Choose (1-4): ');
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
  preset?: Backend
): Promise<Backend> {
  if (preset) return preset;
  const isMobile = target === 'android' || target === 'ios';
  if (isMobile) {
    console.log('\n  Backend:');
    console.log('    1) local      - Start worker + seed, use localhost (emulator: 10.0.2.2:8787)');
    console.log('    2) production - Use VITE_CLAIM_STORAGE_URL from .env');
    const raw = await question(rl, '  Choose (1-2): ');
    return raw === '2' ? 'production' : 'local';
  }
  console.log('\n  Backend:');
  console.log('    1) local      - Start worker + seed, use localhost:8787');
  console.log('    2) production - Use VITE_CLAIM_STORAGE_URL from .env (no worker)');
  console.log('    3) none       - Vite only, no backend (API calls will fail)');
  const raw = await question(rl, '  Choose (1-3): ');
  if (raw === '2') return 'production';
  if (raw === '3') return 'none';
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
  androidMode?: AndroidMode
): Promise<number> {
  const { teeToFile, profile } = output;
  const workerBase = CloudflareLocalConfig.BaseUrl;
  const env: Record<string, string> = {};

  if (backend === 'production') {
    const url = process.env.VITE_CLAIM_STORAGE_URL || process.env.VITE_ASSETS_WORKER_URL;
    if (url) {
      env.VITE_CLAIM_STORAGE_URL = url;
      env.VITE_ASSETS_WORKER_URL = url;
      env.VITE_ASSETS_PUBLIC_URL = `${url.replace(/\/$/, '')}/api/v1/assets`;
    }
    env.VITE_MAIN_ASSET_TARGET_FORCE = 'real-cloud';
  } else if (backend === 'local') {
    env.VITE_CLAIM_STORAGE_URL = workerBase;
    env.VITE_ASSETS_WORKER_URL = workerBase;
    env.VITE_ASSETS_PUBLIC_URL = `${workerBase}/api/v1/assets`;
    env.VITE_MAIN_ASSET_TARGET_FORCE = 'local-dev';
  } else {
    env.VITE_MAIN_ASSET_TARGET_FORCE = 'real-cloud';
  }

  if (profile) env.VITE_PROFILE = '1';

  if (target === 'web') {
    if (webMode === 'preview') {
      const args = ['tsx', 'scripts/dev/preview-stack.ts'];
      if (backend === 'local') args.push('--with-worker');
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
} {
  const argv = process.argv.slice(2);
  let target: Target | undefined;
  let webMode: WebFrontendMode | undefined;
  let backend: Backend | undefined;
  let androidMode: AndroidMode | undefined;
  let output: OutputChoice | undefined;
  let preset: LaunchPreset | undefined;
  let tee = false;
  let profile = false;
  for (const arg of argv) {
    if (arg === '--target=web' || arg === '--web') target = 'web';
    else if (arg === '--target=tauri' || arg === '--tauri') target = 'tauri';
    else if (arg === '--target=android' || arg === '--android') target = 'android';
    else if (arg === '--target=ios' || arg === '--ios') target = 'ios';
    else if (arg === '--backend=local') backend = 'local';
    else if (arg === '--backend=production') backend = 'production';
    else if (arg === '--backend=none') backend = 'none';
    else if (arg === '--web-mode=dev' || arg === '--mode=dev') webMode = 'dev';
    else if (arg === '--web-mode=preview' || arg === '--mode=preview') webMode = 'preview';
    else if (arg === '--android-mode=studio') androidMode = 'studio';
    else if (arg === '--android-mode=emulator') androidMode = 'emulator';
    else if (arg === '--output' || arg === '--tee') tee = true;
    else if (arg === '--profile') profile = true;
    else if (arg === '--quick=web-preview-local') {
      preset = {
        target: 'web',
        webMode: 'preview',
        backend: 'local',
        output: { teeToFile: true, profile: true },
      };
    }
  }
  if (tee || profile) output = { teeToFile: tee, profile };
  return { target, webMode, backend, androidMode, output, preset };
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

  try {
    const { execSync } = await import('child_process');
    execSync('npx tsx scripts/generate-exports-flattened.ts', { stdio: 'pipe' });
  } catch {
    /* non-fatal - file may already exist */
  }
  const { target: presetTarget, webMode: presetWebMode, backend: presetBackend, output: presetOutput, androidMode: presetAndroidMode, preset } =
    parsePresetFromArgv();

  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n  Ocentra dev');
  const quick = await promptLaunchPreset(rl, preset);
  const target = quick?.target ?? (await promptTarget(rl, presetTarget));
  const webMode: WebFrontendMode = quick?.webMode ?? presetWebMode ?? (target === 'web' ? 'dev' : 'dev');
  const backend = await promptBackend(rl, target, quick?.backend ?? presetBackend);
  const androidMode = target === 'android' ? await promptAndroidMode(rl, presetAndroidMode) : undefined;
  const output = await promptOutput(rl, quick?.output ?? presetOutput);
  rl.close();

  const { teeToFile } = output;
  const androidLabel = target === 'android' ? ` | android: ${androidMode}` : '';
  const webModeLabel = target === 'web' ? ` | web: ${webMode}` : '';
  const outLabel = teeToFile
    ? output.profile
      ? ' | log + profile → .temp/dev-output.log | .temp/performance-profile.json'
      : ' | log → .temp/dev-output.log'
    : '';
  console.log(`\n  → ${target}${webModeLabel} | ${backend}${androidLabel}${outLabel}${isForce ? ' [force]' : ''}\n`);
  
  // Propagate force flag if present
  if (isForce && !process.env.VITE_FORCE) {
    process.env.VITE_FORCE = 'true';
    process.env.FORCE = 'true';
  }

  const code = await execute(target, webMode, backend, output, androidMode);
  process.exit(code);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
