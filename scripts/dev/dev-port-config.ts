import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
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
  version: 2;
  root: string;
  worktreeIndex: number;
  mainWebPort: number;
  workerPort: number;
  editorWebPort: number;
  generatedAt: string;
};

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WORKTREE_PORT_CONFIG_PATH = path.join(ROOT, '.temp', 'dev-ports.json');
const WORKTREE_PORT_CONFIG_VERSION = 2;

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

function isLinkedGitWorktreeRoot(candidate: string): boolean {
  return isFile(path.join(candidate, '.git'));
}

function normalizeFsPath(candidate: string): string {
  let resolved = path.resolve(candidate);
  try {
    resolved = realpathSync.native(resolved);
  } catch {
    resolved = path.normalize(resolved);
  }
  const normalized = path.normalize(resolved);
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function parseGitWorktreeRoots(output: string): string[] {
  return output
    .split(/\r?\n/)
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length).trim())
    .filter(Boolean);
}

function readGitWorktreeRoots(): string[] {
  try {
    const output = execFileSync('git', ['worktree', 'list', '--porcelain'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return parseGitWorktreeRoots(output);
  } catch {
    return [];
  }
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
      value.version === WORKTREE_PORT_CONFIG_VERSION &&
      value.root === ROOT &&
      typeof value.worktreeIndex === 'number' &&
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

function readConfiguredWorktreeIndex(env: EnvMap): number | undefined {
  const raw = env[LocalWorktreeConfig.WorktreeIndexEnv];
  if (!raw?.trim()) {
    return undefined;
  }
  const parsed = parsePortNumber(raw, LocalWorktreeConfig.WorktreeIndexEnv);
  if (parsed < 1 || parsed > LocalWorktreeConfig.PortRangeSize) {
    throw new Error(`Invalid ${LocalWorktreeConfig.WorktreeIndexEnv} value: ${raw}`);
  }
  return parsed;
}

function resolveWorktreeIndex(env: EnvMap): number {
  const configured = readConfiguredWorktreeIndex(env);
  if (configured !== undefined) {
    return configured;
  }

  const currentRoot = normalizeFsPath(ROOT);
  const seen = new Set<string>();
  const linkedRoots = readGitWorktreeRoots()
    .filter(isLinkedGitWorktreeRoot)
    .map((root) => normalizeFsPath(root))
    .filter((root) => {
      if (seen.has(root)) return false;
      seen.add(root);
      return true;
    });
  const index = linkedRoots.indexOf(currentRoot);
  return index >= 0 ? index + 1 : 1;
}

function portForWorktree(base: number, worktreeIndex: number): number {
  const port = base + worktreeIndex - 1;
  if (port > 65535) {
    throw new Error(`Resolved worktree port is out of range: ${port}`);
  }
  return port;
}

function createWorktreePortConfig(env: EnvMap): WorktreeDevPortConfig {
  const worktreeIndex = resolveWorktreeIndex(env);
  return {
    version: WORKTREE_PORT_CONFIG_VERSION,
    root: ROOT,
    worktreeIndex,
    mainWebPort: portForWorktree(LocalWorktreeConfig.MainWebPortBase, worktreeIndex),
    workerPort: portForWorktree(LocalWorktreeConfig.WorkerPortBase, worktreeIndex),
    editorWebPort: portForWorktree(LocalWorktreeConfig.EditorWebPortBase, worktreeIndex),
    generatedAt: new Date().toISOString(),
  };
}

function getWorktreePortConfig(env: EnvMap): WorktreeDevPortConfig {
  if (readConfiguredWorktreeIndex(env) === undefined) {
    const cached = readWorktreePortConfig();
    if (cached) {
      return cached;
    }
  }
  const generated = createWorktreePortConfig(env);
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
  const config = getWorktreePortConfig(env);
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
