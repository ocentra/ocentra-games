/**
 * Vitest config for integration tests only
 * Uses pool-workers with only integration test patterns.
 * Files that declare runIn: RunIn.Unstable in the test are excluded from the pool
 * (they run in the unstable phase via suite-type-map).
 */
import { defineWorkersConfig } from './test-runner/vitest-workers-config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, existsSync } from 'node:fs';
import { RunType } from '@ocentra/logging-domain/test-log/types';
import { TestWorkerBindings } from './tests/constants/test-worker-bindings';
import { getDurableObjectsFromWrangler } from './test-runner/wrangler-do-bindings';
import { getWebsocketIncludeFiles } from './test-runner/script/lib/suite-type-map.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getUnstableIntegrationExclude(): string[] {
  const mapPath = path.join(__dirname, 'test-runner', 'suite-type-map.json');
  if (!existsSync(mapPath)) return [];
  try {
    const raw = readFileSync(mapPath, 'utf-8');
    const data = JSON.parse(raw) as { map?: Record<string, { type?: string; runIn?: string }> };
    const map = data.map ?? {};
    return Object.entries(map)
      .filter(
        ([, entry]) =>
          (entry.type === 'integration' || entry.type === 'websocket') &&
          entry.runIn === 'unstable'
      )
      .map(([file]) => file);
  } catch {
    return [];
  }
}

const unstableExclude = getUnstableIntegrationExclude();
const websocketExclude = getWebsocketIncludeFiles(__dirname);
const durableObjectsFromWrangler = getDurableObjectsFromWrangler(__dirname);

// Fixtures base path for binary test files
const FIXTURES_BASE = path.resolve(__dirname, 'tests/fixtures/assets');

// Helper to determine content type from filename
function getContentType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const types: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.json': 'application/json',
    '.txt': 'text/plain',
    '.asset': 'application/octet-stream',
    '.bin': 'application/octet-stream',
    '.zip': 'application/zip',
    '.wasm': 'application/wasm',
  };
  return types[ext] || 'application/octet-stream';
}

export default defineWorkersConfig({
  test: {
    globals: true,
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts', './tests/test-setup-pool.ts'],
    include: ['tests/integration/**/*.test.ts'],
    exclude: ['**/node_modules/**', ...unstableExclude, ...websocketExclude],
    reporters: ['default', 'json', './test-runner/script/report/summary-reporter.ts'],
    poolOptions: {
      workers: ({ inject }) => ({
        singleWorker: false,
        wrangler: {
          configPath: './wrangler.toml',
        },
        miniflare: {
          isolatedStorage: true,
          r2Buckets: ['MATCHES_BUCKET', 'ASSETS_BUCKET'],
          kvNamespaces: [
            'LOGS_RATE_LIMIT_KV',
            'ADMIN_CACHE_KV',
            'RESOURCES_RATE_LIMIT_KV',
            'RATE_LIMIT_KV',
            'PRODUCT_KV',
            'AI_CATALOG_KV',
            'PROMO_KV',
          ],
          analyticsEngineDatasets: {
            ANALYTICS: { dataset: 'logs' },
          },
          durableObjects: durableObjectsFromWrangler,
          bindings: {
            TEST_RUN_ID: (inject as (key: string) => string)('testRunId'),
            TEST_RUN_TYPE: RunType.SinglePool,
            ...TestWorkerBindings,
          },
          serviceBindings: {
            async FIXTURE_LOADER(request: Request): Promise<Response> {
              const url = new URL(request.url);
              const filename = url.pathname.slice(1);
              const filePath = path.join(FIXTURES_BASE, filename);

              try {
                const buffer = readFileSync(filePath);
                const contentType = getContentType(filename);
                return new Response(buffer, {
                  headers: { 'Content-Type': contentType },
                });
              } catch (err) {
                const error = err as NodeJS.ErrnoException;
                if (error.code === 'ENOENT') {
                  return new Response(`File not found: ${filename}`, { status: 404 });
                }
                return new Response(`Error reading file: ${error.message}`, { status: 500 });
              }
            },
          },
        },
      }),
    },
    outputFile: {
      json: './test-runner/ReportJson/test-results.json',
      text: './test-runner/logs/test-output-latest.txt',
    },
    onConsoleLog() {
      return true;
    },
    testTimeout: 30000,
    hookTimeout: 30000,
    isolate: true,
    sequence: {
      shuffle: false,
    },
  },
  esbuild: {
    target: 'node18',
    sourcemap: false,
    logLevel: 'error',
    legalComments: 'none',
    treeShaking: false,
    format: 'esm',
    keepNames: false,
    minifyIdentifiers: false,
    minifySyntax: false,
    minifyWhitespace: false,
    platform: 'node',
  },
  build: {
    commonjsOptions: {
      include: []
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@tests': path.resolve(__dirname, 'tests'),
      '@services/monitoring/MetricsCollector': path.resolve(__dirname, '../../src/services/monitoring/MetricsCollector.ts'),
      '@services': path.resolve(__dirname, '../../src/services')
    }
  }
});
