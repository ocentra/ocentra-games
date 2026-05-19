#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const PACKAGES_DIR = path.join(ROOT, 'packages');
const TURBO_LAST_RUN_SENTINEL = path.join(ROOT, '.temp', 'turbo-last-run');
const TURBO_SKIP_IF_RECENT_MS = 5 * 60 * 1000;
const SOURCE_FIRST_DEV_PACKAGES = ['@ocentra/core-ui', '@ocentra/card-game-ui'] as const;
type PackageJson = {
  name?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
};

type WorkspacePackage = {
  name: string;
  dir: string;
};

export type DevPrepTarget = 'main' | 'editor' | 'worker';

type TargetConfig = {
  description: string;
  packageJsonPath: string;
  exclude?: readonly string[];
  singleFilterPackage?: string;
};

const TARGET_CONFIG: Record<DevPrepTarget, TargetConfig> = {
  main: {
    description: 'main-app shared workspace dependencies',
    packageJsonPath: path.join(ROOT, 'package.json'),
    exclude: ['@ocentra/asset-editor', ...SOURCE_FIRST_DEV_PACKAGES],
  },
  editor: {
    description: 'asset-editor shared workspace dependencies',
    packageJsonPath: path.join(ROOT, 'packages/asset-editor/package.json'),
    exclude: [...SOURCE_FIRST_DEV_PACKAGES],
  },
  worker: {
    description: 'Cloudflare worker shared workspace dependencies',
    packageJsonPath: path.join(ROOT, 'infra/cloudflare/package.json'),
  },
};

function readPackageJson(packageJsonPath: string): PackageJson {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson;
}

function getWorkspacePackageNames(): Set<string> {
  const names = new Set<string>();

  for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const packageJsonPath = path.join(PACKAGES_DIR, entry.name, 'package.json');
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const manifest = readPackageJson(packageJsonPath);
    if (manifest.name) {
      names.add(manifest.name);
    }
  }

  return names;
}

function getWorkspacePackages(): WorkspacePackage[] {
  const packages: WorkspacePackage[] = [];

  for (const entry of readdirSync(PACKAGES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const dir = path.join(PACKAGES_DIR, entry.name);
    const packageJsonPath = path.join(dir, 'package.json');
    if (!existsSync(packageJsonPath)) {
      continue;
    }

    const manifest = readPackageJson(packageJsonPath);
    if (manifest.name) {
      packages.push({ name: manifest.name, dir });
    }
  }

  return packages;
}

function collectWorkspaceDependencies(packageJsonPath: string, exclude: readonly string[] = []): string[] {
  const workspacePackageNames = getWorkspacePackageNames();
  const manifest = readPackageJson(packageJsonPath);
  const dependencyEntries = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
  };

  return Object.keys(dependencyEntries)
    .filter((name) => workspacePackageNames.has(name))
    .filter((name) => !exclude.includes(name))
    .sort((left, right) => left.localeCompare(right));
}

function buildTurboCommand(packageNames: readonly string[], force = false): string {
  return [
    'npx',
    'turbo',
    'run',
    'build',
    ...(force ? ['--force'] : []),
    ...packageNames.map((packageName) => `--filter=${packageName}...`),
  ].join(' ');
}

function buildSubpathExportCheckCommand(specifier: string): string {
  return `node --input-type=module -e "await import('${specifier}')"`;
}

function runCriticalSubpathExportChecks(log: (message: string) => void): void {
  const criticalSpecifiers = [
    '@ocentra/game-domain/deck/deckTypes',
    '@ocentra/game-domain/deck/deckFamilies',
    '@ocentra/game-domain/deck/drawRules',
  ] as const;

  for (const specifier of criticalSpecifiers) {
    log(`Validating package subpath export: ${specifier}`);
    execSync(buildSubpathExportCheckCommand(specifier), {
      cwd: ROOT,
      stdio: 'inherit',
    });
  }
}

function collectFilesRecursively(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectFilesRecursively(fullPath));
      continue;
    }
    out.push(fullPath);
  }
  return out;
}

function findBuiltArtifactImportViolations(): string[] {
  const badFiles: string[] = [];
  const packages = getWorkspacePackages();
  const badPattern = /\.css\.js['"]/;

  for (const workspacePackage of packages) {
    const distDir = path.join(workspacePackage.dir, 'dist');
    if (!existsSync(distDir)) {
      continue;
    }

    const files = collectFilesRecursively(distDir).filter((file) => file.endsWith('.js') || file.endsWith('.d.ts'));
    for (const filePath of files) {
      const content = readFileSync(filePath, 'utf8');
      if (badPattern.test(content)) {
        badFiles.push(path.relative(ROOT, filePath));
      }
    }
  }

  return badFiles;
}

function runBuiltArtifactImportChecks(log: (message: string) => void): void {
  const badFiles = findBuiltArtifactImportViolations();

  if (badFiles.length > 0) {
    log(`Stale generated CSS-module import detected in built output: ${badFiles[0]}`);
    throw new Error(`Stale generated CSS-module import detected: ${badFiles[0]}`);
  }
}

function runBuiltArtifactAssetChecks(log: (message: string) => void): void {
  for (const workspacePackage of getWorkspacePackages()) {
    const distDir = path.join(workspacePackage.dir, 'dist');
    if (!existsSync(distDir)) {
      continue;
    }

    log(`Verifying emitted relative assets for ${workspacePackage.name}`);
    execSync(`node ${path.join(ROOT, 'scripts', 'verify-dist-relative-assets.mjs')} ${workspacePackage.dir}`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
  }
}

function runTurboBuild(packageNames: readonly string[], force = false): void {
  execSync(buildTurboCommand(packageNames, force), {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

function isTurboRecentlyRun(): boolean {
  const skipEnv = process.env.SKIP_TURBO_IF_RECENT === '1' || process.env.SKIP_TURBO_IF_RECENT === 'true';
  if (!skipEnv || !existsSync(TURBO_LAST_RUN_SENTINEL)) {
    return false;
  }
  try {
    const st = statSync(TURBO_LAST_RUN_SENTINEL);
    return Date.now() - st.mtimeMs < TURBO_SKIP_IF_RECENT_MS;
  } catch {
    return false;
  }
}

function writeTurboLastRunSentinel(): void {
  try {
    mkdirSync(path.dirname(TURBO_LAST_RUN_SENTINEL), { recursive: true });
    writeFileSync(TURBO_LAST_RUN_SENTINEL, String(Date.now()), 'utf8');
  } catch {
    // non-fatal
  }
}

export function ensureTurboDevPrep(target: DevPrepTarget, log: (message: string) => void = console.log): void {
  log('Ensuring pre-commit hook is installed.');
  execSync(`node ${path.join(ROOT, 'scripts', 'git-hooks', 'install-pre-commit.mjs')}`, {
    cwd: ROOT,
    stdio: 'inherit',
  });

  const config = TARGET_CONFIG[target];
  const useSingleFilter = 'singleFilterPackage' in config && config.singleFilterPackage;
  const packageNames = useSingleFilter
    ? [config.singleFilterPackage as string]
    : collectWorkspaceDependencies(config.packageJsonPath, config.exclude);

  if (packageNames.length === 0) {
    log(`No workspace dependencies found for ${config.description}.`);
    return;
  }

  if (isTurboRecentlyRun()) {
    log(`Preparing ${config.description}: Turbo skipped (recent run; backend already built). Set SKIP_TURBO_IF_RECENT=0 to force.`);
    return;
  }

  log(`Preparing ${config.description} with Turbo (${useSingleFilter ? 'single filter' : `${packageNames.length} packages`}).`);
  runTurboBuild(packageNames);
  runCriticalSubpathExportChecks(log);
  try {
    runBuiltArtifactImportChecks(log);
    runBuiltArtifactAssetChecks(log);
  } catch {
    log('Re-running Turbo with --force to repair stale generated output.');
    runTurboBuild(packageNames, true);
    runCriticalSubpathExportChecks(log);
    runBuiltArtifactImportChecks(log);
    runBuiltArtifactAssetChecks(log);
  }
  writeTurboLastRunSentinel();
}

function parseTarget(argv: string[]): DevPrepTarget | null {
  const candidate = argv[2];
  if (candidate === 'main' || candidate === 'editor' || candidate === 'worker') {
    return candidate;
  }
  return null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = parseTarget(process.argv);
  if (!target) {
    console.error('[turbo-dev-prep] Usage: npx tsx scripts/dev/turbo-dev-prep.ts <main|editor|worker>');
    process.exit(1);
  }

  ensureTurboDevPrep(target, (message) => {
    console.log(`[turbo-dev-prep] ${message}`);
  });
}
