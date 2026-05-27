import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import {
  CloudflareLocalConfig,
  LocalEditorConfig,
  LocalWebConfig,
  LocalWorktreeConfig,
  createLocalHttpBaseUrl,
} from '@ocentra/endpoint-domain/constants/local';

export type LocalWorkerEnvDetails = {
  workerPort: number;
  workerBase: string;
  assetsPublicUrl: string;
};

type EnvMap = Record<string, string | undefined>;
type DevPortMode = 'primary' | 'worktree';

export type DevPortDefaults = {
  mode: DevPortMode;
  root: string;
  configPath?: string;
  mainWebPort: number;
  workerPort: number;
  editorWebPort: number;
};

type WorktreeDevPortConfig = {
  version: 1;
  root: string;
  mainWebPort: number;
  workerPort: number;
  editorWebPort: number;
  generatedAt: string;
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORKTREE_PORT_CONFIG_PATH = path.join(ROOT, '.temp', 'dev-ports.json');

export function parsePortNumber(raw: string | undefined, label: string, fallback?: number): number {
  const value = raw?.trim();
  if (!value) {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing ${label} value.`);
  }
  if (!/^\d+$/.test(value)) {
    throw new Error(`Invalid ${label} value: ${raw}`);
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid ${label} value: ${raw}`);
  }
  return parsed;
}

export function readPortArg(argv: string[], names: readonly string[]): number | undefined {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    for (const name of names) {
      if (arg === name) {
        return parsePortNumber(argv[index + 1], name);
      }
      if (arg.startsWith(`${name}=`)) {
        return parsePortNumber(arg.slice(name.length + 1), name);
      }
    }
  }
  return undefined;
}

function isFile(candidate: string): boolean {
  try {
    return existsSync(candidate) && statSync(candidate).isFile();
  } catch {
    return false;
  }
}

function isLinkedGitWorktree(): boolean {
  return isFile(path.join(ROOT, '.git'));
}

function resolveDevPortMode(env: EnvMap = process.env): DevPortMode {
  const mode = env[LocalWorktreeConfig.PortModeEnv]?.trim().toLowerCase();
  if (mode === 'primary' || mode === 'main') {
    return 'primary';
  }
  if (mode === 'worktree' || mode === 'isolated') {
    return 'worktree';
  }
  return isLinkedGitWorktree() ? 'worktree' : 'primary';
}

function readWorktreePortConfig(): WorktreeDevPortConfig | undefined {
  if (!existsSync(WORKTREE_PORT_CONFIG_PATH)) {
    return undefined;
  }
  try {
    const value = JSON.parse(readFileSync(WORKTREE_PORT_CONFIG_PATH, 'utf8')) as Partial<WorktreeDevPortConfig>;
    if (
      value.version === 1 &&
      value.root === ROOT &&
      typeof value.mainWebPort === 'number' &&
      typeof value.workerPort === 'number' &&
      typeof value.editorWebPort === 'number' &&
      typeof value.generatedAt === 'string'
    ) {
      return value as WorktreeDevPortConfig;
    }
  } catch {
    return undefined;
  }
  return undefined;
}

function stablePort(base: number, salt: string): number {
  const digest = createHash('sha256').update(ROOT).update('\0').update(salt).digest();
  return base + (digest.readUInt32BE(0) % LocalWorktreeConfig.PortRangeSize);
}

function createWorktreePortConfig(): WorktreeDevPortConfig {
  return {
    version: 1,
    root: ROOT,
    mainWebPort: stablePort(LocalWorktreeConfig.MainWebPortBase, 'main-web'),
    workerPort: stablePort(LocalWorktreeConfig.WorkerPortBase, 'worker'),
    editorWebPort: stablePort(LocalWorktreeConfig.EditorWebPortBase, 'editor-web'),
    generatedAt: new Date().toISOString(),
  };
}

function getWorktreePortConfig(): WorktreeDevPortConfig {
  const cached = readWorktreePortConfig();
  if (cached) {
    return cached;
  }
  const generated = createWorktreePortConfig();
  mkdirSync(path.dirname(WORKTREE_PORT_CONFIG_PATH), { recursive: true });
  writeFileSync(WORKTREE_PORT_CONFIG_PATH, `${JSON.stringify(generated, null, 2)}\n`);
  return generated;
}

export function resolveDevPortDefaults(env: EnvMap = process.env): DevPortDefaults {
  const mode = resolveDevPortMode(env);
  if (mode === 'primary') {
    return {
      mode,
      root: ROOT,
      mainWebPort: LocalWebConfig.Port,
      workerPort: CloudflareLocalConfig.Port,
      editorWebPort: LocalEditorConfig.Port,
    };
  }
  const config = getWorktreePortConfig();
  return {
    mode,
    root: ROOT,
    configPath: WORKTREE_PORT_CONFIG_PATH,
    mainWebPort: config.mainWebPort,
    workerPort: config.workerPort,
    editorWebPort: config.editorWebPort,
  };
}

function readEnvPort(env: EnvMap, names: readonly string[], label: string, fallback: number): number {
  for (const name of names) {
    const value = env[name];
    if (value?.trim()) {
      return parsePortNumber(value, label);
    }
  }
  return fallback;
}

export function resolveWorkerPort(
  raw = process.env.WORKER_PORT || process.env.VITE_LOCAL_WORKER_PORT,
  argv = process.argv.slice(2),
  env: EnvMap = process.env
): number {
  return (
    readPortArg(argv, ['--worker-port', '--api-port']) ??
    parsePortNumber(raw, 'worker port', resolveDevPortDefaults(env).workerPort)
  );
}

export function resolveMainWebPort(argv = process.argv.slice(2), env: EnvMap = process.env): number {
  return (
    readPortArg(argv, ['--port', '--use']) ??
    readEnvPort(env, ['OCENTRA_WEB_PORT', 'VITE_PORT', 'PORT'], 'main web port', resolveDevPortDefaults(env).mainWebPort)
  );
}

export function resolveEditorWebPort(argv = process.argv.slice(2), env: EnvMap = process.env): number {
  return (
    readPortArg(argv, ['--editor-port', '--port', '--use']) ??
    readEnvPort(
      env,
      ['OCENTRA_EDITOR_PORT', 'EDITOR_PORT', 'VITE_EDITOR_PORT', 'VITE_PORT', 'PORT'],
      'asset-editor web port',
      resolveDevPortDefaults(env).editorWebPort
    )
  );
}

export function resolveWorkerBaseUrl(port = resolveWorkerPort()): string {
  return createLocalHttpBaseUrl(CloudflareLocalConfig.Host, port);
}

export function resolveMainWebBaseUrl(port = resolveMainWebPort()): string {
  return createLocalHttpBaseUrl(LocalWebConfig.Host, port);
}

export function resolveEditorWebBaseUrl(port = resolveEditorWebPort()): string {
  return createLocalHttpBaseUrl(LocalEditorConfig.Host, port);
}

export function applyLocalWorkerEnv(
  env: Record<string, string | undefined>,
  workerPort = resolveWorkerPort()
): LocalWorkerEnvDetails {
  const workerBase = resolveWorkerBaseUrl(workerPort);
  const assetsPublicUrl = `${workerBase}${ApiEndpoint.Assets.Base}`;
  const workerPortValue = String(workerPort);

  env.WORKER_PORT = workerPortValue;
  env.VITE_LOCAL_WORKER_PORT = workerPortValue;
  env.VITE_CLAIM_STORAGE_URL = workerBase;
  env.VITE_R2_WORKER_URL = workerBase;
  env.VITE_ASSETS_WORKER_URL = workerBase;
  env.VITE_ASSETS_PUBLIC_URL = assetsPublicUrl;
  env.VITE_MAIN_LOCAL_CLAIM_STORAGE_URL = workerBase;
  env.VITE_MAIN_LOCAL_WORKER_URL = workerBase;
  env.VITE_MAIN_LOCAL_ASSETS_PUBLIC_URL = assetsPublicUrl;
  env.VITE_MAIN_ASSET_TARGET_FORCE = 'local-dev';
  env.VITE_EDITOR_SYNC_TARGET_DEFAULT = 'local-dev';
  env.VITE_EDITOR_SYNC_LOCAL_CLAIM_STORAGE_URL = workerBase;
  env.VITE_EDITOR_SYNC_LOCAL_ASSETS_PUBLIC_URL = assetsPublicUrl;

  return {
    workerPort,
    workerBase,
    assetsPublicUrl,
  };
}

export function applyMainWebEnv(env: Record<string, string | undefined>, port = resolveMainWebPort()): number {
  const value = String(port);
  env.OCENTRA_WEB_PORT = value;
  env.PORT = value;
  env.VITE_PORT = value;
  return port;
}

export function applyEditorWebEnv(env: Record<string, string | undefined>, port = resolveEditorWebPort()): number {
  const value = String(port);
  env.OCENTRA_EDITOR_PORT = value;
  env.EDITOR_PORT = value;
  env.PORT = value;
  env.VITE_EDITOR_PORT = value;
  env.VITE_PORT = value;
  return port;
}

if (path.resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  const defaults = resolveDevPortDefaults();
  process.stdout.write(`${JSON.stringify(defaults, null, 2)}\n`);
}
