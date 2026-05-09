import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import fs from 'fs';
import { createHash } from 'node:crypto';
import type { Connect } from 'vite';
import { getAssetEditorLogDir, wipeAssetEditorLogs } from './scripts/asset-editor-logs';
import { createAppLogStorage } from '@ocentra/logging-domain/app-log/createAppLogStorage';
import type { LogEntry } from '@ocentra/logging-domain/types/logEntry';
import type { LogLevel } from '@ocentra/logging-domain/types/logLevel';
import { LocalApiEndpoint } from '@ocentra/endpoint-domain/constants/local';
import { loadWorkspaceEnv } from '../../scripts/shared/loadWorkspaceEnv';
import { workspaceSourceResolver } from '../../vite/plugins/workspaceSourceResolver';
import JSON5 from 'json5';

const rootPkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../package.json'), 'utf-8')) as { version?: string };
const appVersion = rootPkg?.version ?? '0.1.0';

const assetEditorLogDir = getAssetEditorLogDir(__dirname);
const ASSET_EDITOR_LOGS_PATH = '/__asset-editor-logs__';
const EDITOR_PROFILE_PATH = '/_dev/profile-editor';
const EDITOR_PROFILE_FILENAME = 'performance-profile-editor.json';
const echoLogsToTerminal = process.env.VITE_ECHO_LOGS_TO_TERMINAL === '1';

const rootDir = path.resolve(__dirname, '../..');
const assetEditorResourcesDir = path.resolve(__dirname, 'Resources');
const coreUiHeaderProfilesDir = path.resolve(__dirname, '../core-ui/src/Header/profiles');
loadWorkspaceEnv(__dirname, rootDir);

const workspaceSourcePackages = [
  { name: '@ocentra/app-assets', rootDir: path.resolve(__dirname, '../app-assets') },
  { name: '@ocentra/app-core', rootDir: path.resolve(__dirname, '../app-core') },
  { name: '@ocentra/asset-domain', rootDir: path.resolve(__dirname, '../asset-domain') },
  { name: '@ocentra/asset-editor-types', rootDir: path.resolve(__dirname, '../asset-editor-types') },
  { name: '@ocentra/boundary-domain', rootDir: path.resolve(__dirname, '../boundary-domain') },
  { name: '@ocentra/card-game-ui', rootDir: path.resolve(__dirname, '../card-game-ui') },
  { name: '@ocentra/card-games', rootDir: path.resolve(__dirname, '../card-games') },
  { name: '@ocentra/core-ui', rootDir: path.resolve(__dirname, '../core-ui') },
  { name: '@ocentra/endpoint-domain', rootDir: path.resolve(__dirname, '../endpoint-domain') },
  { name: '@ocentra/eventing-domain', rootDir: path.resolve(__dirname, '../eventing-domain') },
  { name: '@ocentra/game-asset-domain', rootDir: path.resolve(__dirname, '../game-asset-domain') },
  { name: '@ocentra/game-domain', rootDir: path.resolve(__dirname, '../game-domain') },
  { name: '@ocentra/game-layout-domain', rootDir: path.resolve(__dirname, '../game-layout-domain') },
  { name: '@ocentra/game-ui-types', rootDir: path.resolve(__dirname, '../game-ui-types') },
  { name: '@ocentra/logging-domain', rootDir: path.resolve(__dirname, '../logging-domain') },
  { name: '@ocentra/schema-domain', rootDir: path.resolve(__dirname, '../schema-domain') },
];

const workspaceTsconfigProjects = [
  './tsconfig.json',
  ...workspaceSourcePackages.map(({ rootDir: packageRoot }) =>
    path.relative(__dirname, path.join(packageRoot, 'tsconfig.json')).replace(/\\/g, '/')
  ),
];

type BrowserAssetIndexEntry =
  | {
      resourceEntryType: 'AssetResourceEntry';
      path: string;
      guid: string;
      assetType: string;
      displayName: string;
      fileSize: number;
    }
  | {
      resourceEntryType: 'ImageResourceEntry';
      path: string;
      hash: string;
      fileSize: number;
    }
  | {
      resourceEntryType: 'FileResourceEntry';
      path: string;
      checksum: string;
      fileSize: number;
    };

const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.svg',
  '.avif',
]);

let cachedBrowserAssetIndex:
  | {
      builtAtMs: number;
      entries: BrowserAssetIndexEntry[];
    }
  | null = null;
const BROWSER_ASSET_INDEX_CACHE_TTL_MS = 30000;

function normalizeResourceUrlPath(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/').replace(/^\/+/, '');
  return normalized.startsWith('Resources/') ? normalized : `Resources/${normalized}`;
}

function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function buildBrowserAssetIndexEntries(): BrowserAssetIndexEntry[] {
  if (
    cachedBrowserAssetIndex &&
    Date.now() - cachedBrowserAssetIndex.builtAtMs < BROWSER_ASSET_INDEX_CACHE_TTL_MS
  ) {
    return cachedBrowserAssetIndex.entries;
  }

  const entries: BrowserAssetIndexEntry[] = [];

  const walk = (dir: string): void => {
    if (!fs.existsSync(dir)) {
      return;
    }

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
        continue;
      }

      const relativePath = path.relative(assetEditorResourcesDir, fullPath);
      const resourcePath = normalizeResourceUrlPath(relativePath);
      const stats = fs.statSync(fullPath);
      const extension = path.extname(entry.name).toLowerCase();
      const fileBytes = fs.readFileSync(fullPath);

      if (extension === '.asset') {
        try {
          const parsed = JSON5.parse(fileBytes.toString('utf8')) as Record<string, unknown>;
          const system =
            parsed.system && typeof parsed.system === 'object'
              ? (parsed.system as Record<string, unknown>)
              : {};
          const guid = typeof system.guid === 'string' ? system.guid : null;
          if (!guid) {
            continue;
          }
          entries.push({
            resourceEntryType: 'AssetResourceEntry',
            path: resourcePath,
            guid,
            assetType: typeof system.assetType === 'string' ? system.assetType : 'Unknown',
            displayName:
              typeof system.displayName === 'string'
                ? system.displayName
                : entry.name.replace(/\.asset$/i, ''),
            fileSize: stats.size,
          });
        } catch {
          continue;
        }
        continue;
      }

      if (IMAGE_EXTENSIONS.has(extension)) {
        entries.push({
          resourceEntryType: 'ImageResourceEntry',
          path: resourcePath,
          hash: sha256Hex(fileBytes),
          fileSize: stats.size,
        });
        continue;
      }

      entries.push({
        resourceEntryType: 'FileResourceEntry',
        path: resourcePath,
        checksum: sha256Hex(fileBytes),
        fileSize: stats.size,
      });
    }
  };

  walk(assetEditorResourcesDir);
  cachedBrowserAssetIndex = {
    builtAtMs: Date.now(),
    entries,
  };
  return entries;
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function normalizeHeaderProfileName(name: string): string {
  const normalized = name.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  return normalized || 'main_screen';
}

function parseNdjson(body: string): Array<Omit<LogEntry, 'id' | 'origin'>> {
  const lines = body.trim().split('\n').filter(Boolean);
  const entries: Array<Omit<LogEntry, 'id' | 'origin'>> = [];
  for (const line of lines) {
    try {
      const raw = JSON.parse(line) as Record<string, unknown>;
      entries.push({
        level: (typeof raw.level === 'string' ? raw.level : 'info') as LogLevel,
        context: typeof raw.context === 'string' ? raw.context : '',
        message: typeof raw.message === 'string' ? raw.message : String(raw.message ?? ''),
        source: typeof raw.source === 'string' ? raw.source : 'AssetEditor:app',
        timestamp: typeof raw.timestamp === 'number' ? raw.timestamp : Date.now(),
        args: Array.isArray(raw.args) ? raw.args : undefined,
        stack: typeof raw.stack === 'string' ? raw.stack : undefined,
        stackFrames: Array.isArray(raw.stackFrames) ? raw.stackFrames : undefined,
        file: typeof raw.file === 'string' ? raw.file : undefined,
        filePath: typeof raw.filePath === 'string' ? raw.filePath : undefined,
        line: typeof raw.line === 'number' ? raw.line : undefined,
        column: typeof raw.column === 'number' ? raw.column : undefined,
      });
    } catch {
      // skip
    }
  }
  return entries;
}

export default defineConfig(({ command }) => ({
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(appVersion),
  },
  esbuild: {
    keepNames: true,
  },
  plugins: [
    workspaceSourceResolver({
      enabled: command === 'serve',
      packages: workspaceSourcePackages,
    }),
    react({
      babel: {
        plugins: [
          ['@babel/plugin-proposal-decorators', { legacy: true }],
          ['@babel/plugin-transform-class-properties', { loose: true }],
          ['@babel/plugin-transform-class-static-block', { loose: true }],
        ],
      },
      // Ensure Babel also processes files in linked packages
      include: [
        /\.[tj]sx?$/,
        /packages\/.*\/src\/.*\.[tj]sx?$/
      ],
    }),
    tsconfigPaths({
      projects: workspaceTsconfigProjects,
    }),
    {
      name: 'asset-editor-logs',
      configureServer(server) {
        wipeAssetEditorLogs(assetEditorLogDir);
        const storage = createAppLogStorage({
          scope: 'asset-editor',
          dbDir: assetEditorLogDir,
          ingestIntervalMs: 1000,
        });
        const bootstrapEntry: Omit<LogEntry, 'id' | 'origin'> = {
          level: 'info' as LogLevel,
          context: '',
          message: 'Asset-editor log server started; POST to /__asset-editor-logs__',
          source: 'AssetEditor:server',
          timestamp: Date.now(),
        };
        storage.storeLogsBatch([bootstrapEntry]);
        server.middlewares.use(ASSET_EDITOR_LOGS_PATH, async (req, res, next) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.statusCode = 200;
            res.end();
            return;
          }
          if (req.method !== 'POST') return next();
          res.setHeader('Access-Control-Allow-Origin', '*');
          try {
            const body = await readBody(req);
            const entries = parseNdjson(body);
            if (entries.length > 0) {
              storage.storeLogsBatch(entries);
              if (echoLogsToTerminal) {
                for (const e of entries) {
                  const ts = new Date(e.timestamp).toISOString();
                  const data = e.args && e.args.length > 0 ? ` ${JSON.stringify(e.args)}` : '';
                  console.log(`[${ts}] [${e.level}] ${e.message}${data}`);
                }
              }
            }
            res.statusCode = 204;
            res.end();
          } catch {
            res.statusCode = 400;
            res.end();
          }
        });
        server.httpServer?.on('close', () => {
          storage.dispose().catch(() => {});
        });
      },
    },
    {
      name: 'asset-editor-profile',
      configureServer(server) {
        server.middlewares.use(EDITOR_PROFILE_PATH, async (req, res, next) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.statusCode = 200;
            res.end();
            return;
          }
          if (req.method !== 'POST') return next();
          res.setHeader('Access-Control-Allow-Origin', '*');
          try {
            const body = await readBody(req);
            const report = JSON.parse(body) as Record<string, unknown>;
            const tempDir = path.join(rootDir, '.temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
            const filePath = path.join(tempDir, EDITOR_PROFILE_FILENAME);
            fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: true, path: filePath }));
          } catch {
            res.statusCode = 400;
            res.end();
          }
        });
      },
    },
    {
      name: 'asset-editor-header-config',
      configureServer(server) {
        server.middlewares.use(LocalApiEndpoint.HeaderConfig, async (req, res, next) => {
          if (req.method === 'OPTIONS') {
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.statusCode = 200;
            res.end();
            return;
          }

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            try {
              if (!fs.existsSync(coreUiHeaderProfilesDir)) {
                res.statusCode = 200;
                res.end(JSON.stringify([]));
                return;
              }

              const requestUrl = new URL(req.url ?? '', 'http://localhost');
              const requestedName = requestUrl.searchParams.get('name');
              if (requestedName) {
                const profileName = normalizeHeaderProfileName(requestedName);
                const profilePath = path.join(coreUiHeaderProfilesDir, `${profileName}.json`);
                if (!fs.existsSync(profilePath)) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Profile not found' }));
                  return;
                }

                res.statusCode = 200;
                res.end(fs.readFileSync(profilePath, 'utf8'));
                return;
              }

              const profiles = fs.readdirSync(coreUiHeaderProfilesDir)
                .filter((entry) => entry.endsWith('.json'))
                .map((entry) => path.basename(entry, '.json'))
                .sort();
              res.statusCode = 200;
              res.end(JSON.stringify(profiles));
              return;
            } catch (error) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
              return;
            }
          }

          if (req.method === 'POST') {
            res.setHeader('Content-Type', 'application/json');
            try {
              const body = JSON.parse(await readBody(req)) as { name?: unknown; content?: unknown };
              const profileName = normalizeHeaderProfileName(String(body.name ?? 'main_screen'));
              const content = typeof body.content === 'string' ? body.content : '';
              if (!content) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing profile content' }));
                return;
              }

              fs.mkdirSync(coreUiHeaderProfilesDir, { recursive: true });
              const profilePath = path.join(coreUiHeaderProfilesDir, `${profileName}.json`);
              fs.writeFileSync(profilePath, `${content.trim()}\n`, 'utf8');
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, profile: profileName }));
              return;
            } catch (error) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
              return;
            }
          }

          next();
        });
      },
    },
    {
      name: 'serve-resources',
      configureServer(server) {
        server.middlewares.use(LocalApiEndpoint.AssetEditor.DiskResourceEntries, (_req, res) => {
          try {
            const entries = buildBrowserAssetIndexEntries();
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(entries));
          } catch (error) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              })
            );
          }
        });
        server.middlewares.use(LocalApiEndpoint.AssetEditor.WriteAsset, async (req, res, next) => {
          if (req.method !== 'POST') {
            next();
            return;
          }
          res.setHeader('Content-Type', 'application/json');
          try {
            const body = JSON.parse(await readBody(req)) as { path?: unknown; content?: unknown };
            const requestedPath = typeof body.path === 'string' ? body.path : '';
            const resourcePath = normalizeResourceUrlPath(requestedPath);
            if (!resourcePath.startsWith('Resources/') || resourcePath.includes('..')) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid resource path' }));
              return;
            }
            const content = Array.isArray(body.content) ? body.content : null;
            if (!content || !content.every(value => Number.isInteger(value) && value >= 0 && value <= 255)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid asset content' }));
              return;
            }
            const filePath = path.resolve(__dirname, resourcePath);
            if (!filePath.startsWith(assetEditorResourcesDir)) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: 'Invalid resource target' }));
              return;
            }
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, Buffer.from(content));
            cachedBrowserAssetIndex = null;
            res.statusCode = 200;
            res.end(JSON.stringify({ ok: true }));
          } catch (error) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
          }
        });
        server.middlewares.use('/Resources', (req, res, next) => {
          const filePath = path.join(__dirname, 'Resources', req.url ?? '/');
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            res.end(fs.readFileSync(filePath));
          } else {
            next();
          }
        });
      },
    },
  ],
  optimizeDeps: {
    exclude: [
      ...workspaceSourcePackages.map(({ name }) => name),
    ],
  },
  server: {
    port: parseInt(process.env.PORT ?? process.env.VITE_PORT ?? '5174', 10),
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/packages/*/dist/**',
        '**/.turbo/**',
      ],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
  publicDir: false as const,
  envDir: __dirname,
}));
