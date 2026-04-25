import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

type PackageJson = {
  name?: string;
  exports?: Record<string, unknown>;
};

type WorkspacePackage = {
  name: string;
  rootDir: string;
};

type WorkspaceSourceResolverOptions = {
  enabled?: boolean;
  packages: WorkspacePackage[];
};

const JS_SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.js', '.jsx'] as const;

function readPackageJson(packageJsonPath: string): PackageJson {
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')) as PackageJson;
}

function resolveRuntimeExportTarget(exportValue: unknown): string | null {
  if (typeof exportValue === 'string') {
    return exportValue;
  }

  if (!exportValue || typeof exportValue !== 'object') {
    return null;
  }

  const candidate = exportValue as { import?: unknown; default?: unknown };
  if (typeof candidate.import === 'string') {
    return candidate.import;
  }

  if (typeof candidate.default === 'string') {
    return candidate.default;
  }

  return null;
}

function resolveSourceFileFromExport(rootDir: string, exportTarget: string): string | null {
  if (!exportTarget.startsWith('./dist/')) {
    return null;
  }

  const relativeDistPath = exportTarget.slice('./dist/'.length);
  const sourcePath = path.join(rootDir, 'src', relativeDistPath);

  if (!path.extname(sourcePath)) {
    return null;
  }

  const extension = path.extname(sourcePath);
  if (extension === '.css' || extension === '.json') {
    return existsSync(sourcePath) ? sourcePath : null;
  }

  if (extension !== '.js') {
    return existsSync(sourcePath) ? sourcePath : null;
  }

  const sourceBase = sourcePath.slice(0, -extension.length);
  for (const candidateExtension of JS_SOURCE_EXTENSIONS) {
    const candidatePath = `${sourceBase}${candidateExtension}`;
    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  for (const candidateExtension of JS_SOURCE_EXTENSIONS) {
    const indexCandidatePath = path.join(sourceBase, `index${candidateExtension}`);
    if (existsSync(indexCandidatePath)) {
      return indexCandidatePath;
    }
  }

  return null;
}

function buildSourceSpecifierMap(packages: WorkspacePackage[]): Map<string, string> {
  const specifierMap = new Map<string, string>();

  for (const workspacePackage of packages) {
    const packageJsonPath = path.join(workspacePackage.rootDir, 'package.json');
    const manifest = readPackageJson(packageJsonPath);
    const exportsField = manifest.exports;

    if (!exportsField || typeof exportsField !== 'object') {
      continue;
    }

    for (const [exportKey, exportValue] of Object.entries(exportsField)) {
      if (exportKey === '.') {
        continue;
      }

      const runtimeTarget = resolveRuntimeExportTarget(exportValue);
      if (!runtimeTarget) {
        continue;
      }

      const sourceFile = resolveSourceFileFromExport(workspacePackage.rootDir, runtimeTarget);
      if (!sourceFile) {
        continue;
      }

      const normalizedSubpath = exportKey.startsWith('./') ? exportKey.slice(1) : exportKey;
      specifierMap.set(`${workspacePackage.name}${normalizedSubpath}`, sourceFile);
    }
  }

  return specifierMap;
}

export function workspaceSourceResolver(options: WorkspaceSourceResolverOptions): Plugin {
  const enabled = options.enabled ?? true;
  const sourceSpecifierMap = buildSourceSpecifierMap(options.packages);

  return {
    name: 'workspace-source-resolver',
    enforce: 'pre',
    resolveId(source) {
      if (!enabled) {
        return null;
      }

      return sourceSpecifierMap.get(source) ?? null;
    },
  };
}
