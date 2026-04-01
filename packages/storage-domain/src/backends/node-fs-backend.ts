/// <reference types="node" />
import { readFile, writeFile, readdir, mkdir, access, unlink } from 'node:fs/promises';
import { join, dirname, resolve, relative } from 'node:path';
import { homedir } from 'node:os';
import type { FileSystemBackend } from '@/model-cache/FileSystemBackend';

export interface PathResolver {
  getModelsBasePath(): string;
}

let pathResolverOverride: PathResolver | null = null;

export function setPathResolver(resolver: PathResolver): void {
  pathResolverOverride = resolver;
}

export function getPathResolver(): PathResolver {
  if (pathResolverOverride) return pathResolverOverride;
  return {
    getModelsBasePath: () => getDefaultModelsPath(),
  };
}

export function getDefaultModelsPath(): string {
  const plat = typeof process !== 'undefined' ? process.platform : 'linux';
  const home = homedir();
  if (plat === 'win32') {
    const appData = process.env.APPDATA ?? join(home, 'AppData', 'Roaming');
    return join(appData, 'ocentra-games', 'models');
  }
  if (plat === 'darwin') {
    return join(home, 'Library', 'Application Support', 'ocentra-games', 'models');
  }
  const xdg = process.env.XDG_DATA_HOME ?? join(home, '.local', 'share');
  return join(xdg, 'ocentra-games', 'models');
}

function isPathUnderBase(resolved: string, base: string): boolean {
  const rel = relative(base, resolved);
  return !rel.startsWith('..') && rel !== '..';
}

function isUncPath(path: string): boolean {
  return path.startsWith('\\\\') || path.startsWith('//');
}

function safeResolve(basePath: string, p: string): string {
  if (isUncPath(p) || isUncPath(basePath)) {
    throw new Error('UNC paths not allowed');
  }
  const full = resolve(basePath, p);
  if (isPathUnderBase(full, basePath)) return full;
  throw new Error('Path traversal rejected');
}

export function createNodeFileSystemBackend(basePath: string): FileSystemBackend {
  const resolvePath = (p: string) => safeResolve(basePath, p);

  return {
    async readFile(path: string): Promise<Uint8Array> {
      return readFile(resolvePath(path));
    },

    async writeFile(path: string, data: Uint8Array | string): Promise<void> {
      const full = resolvePath(path);
      await mkdir(dirname(full), { recursive: true });
      const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
      await writeFile(full, buf);
    },

    async readdir(path: string): Promise<string[]> {
      return readdir(resolvePath(path));
    },

    async mkdir(path: string, options?: { recursive: boolean }): Promise<void> {
      await mkdir(resolvePath(path), { recursive: options?.recursive ?? true });
    },

    async exists(path: string): Promise<boolean> {
      try {
        await access(resolvePath(path));
        return true;
      } catch {
        return false;
      }
    },

    async unlink(path: string): Promise<void> {
      await unlink(resolvePath(path));
    },
  };
}
