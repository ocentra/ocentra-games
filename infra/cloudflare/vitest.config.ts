import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync } from 'node:fs';
import { RunType } from '@ocentra/logging-domain/test-log/types';
import { TestWorkerBindings } from './tests/constants/test-worker-bindings';
import { getUnstableIncludeFiles, getWebsocketIncludeFiles } from './test-runner/script/lib/suite-type-map.js';
import { getDurableObjectsFromWrangler } from './test-runner/wrangler-do-bindings';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRootDir = path.resolve(__dirname, '../..');

function parseEnvLineValue(raw: string): string {
  let value = raw.trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
    value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
  }
  return value;
}

function loadEnvFileIntoProcess(envPath: string): void {
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalIndex = trimmed.indexOf('=');
    if (equalIndex === -1) continue;
    const key = trimmed.substring(0, equalIndex).trim();
    const value = parseEnvLineValue(trimmed.substring(equalIndex + 1));
    if (key && value !== '' && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFileIntoProcess(path.join(repoRootDir, '.env'));

const CF_TESTS_ENV_KEYS = [
  'CF_TESTS_STRIPE_SECRET_KEY',
  'CF_TESTS_FIREBASE_PRIVATE_KEY_PEM',
  'CF_TESTS_AI_SUBSTITUTE_DEFAULT_KEY',
  'CF_TESTS_AI_LEAKAGE_FAKE_KEY',
  'CF_TESTS_AI_API_KEY',
] as const;

function cfTestsEnvForVitest(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of CF_TESTS_ENV_KEYS) {
    const v = process.env[key];
    if (v !== undefined && v !== '') {
      out[key] = v;
    }
  }
  return out;
}

const unstableExclude = getUnstableIncludeFiles(__dirname);
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
        include: [
          'tests/unit/**/*.test.ts',
          'tests/integration/**/*.test.ts',
          'tests/e2e/**/*.test.ts',
        ],
        exclude: ['**/node_modules/**', ...unstableExclude, ...websocketExclude],
    reporters: ['default', './test-runner/script/report/summary-reporter.ts'],
    poolOptions: {
      workers: ({ inject }) => ({
        wrangler: {
          configPath: './wrangler.toml',
        },
        miniflare: {
          // isolated storage enabled for most tests
          // WebSocket + DO tests use vitest.websocket.config.ts with isolatedStorage: false
          isolatedStorage: true,
          r2Buckets: ['MATCHES_BUCKET', 'ASSETS_BUCKET'],
          kvNamespaces: [
            'LOGS_RATE_LIMIT_KV',
            'ADMIN_CACHE_KV',
            'RESOURCES_RATE_LIMIT_KV',
            'RATE_LIMIT_KV',
          ],
          analyticsEngineDatasets: {
            ANALYTICS: { dataset: 'logs' },
          },
          durableObjects: durableObjectsFromWrangler,
          bindings: {
            TEST_RUN_ID: (inject as (key: string) => string)('testRunId'),
            TEST_RUN_TYPE: RunType.SinglePool,
            ...TestWorkerBindings,
            ...cfTestsEnvForVitest(),
          },
          // Service binding that runs in Node.js context - can use readFileSync
          // Tests call env.FIXTURE_LOADER.fetch() to load binary files
          serviceBindings: {
            async FIXTURE_LOADER(request: Request): Promise<Response> {
              const url = new URL(request.url);
              const filename = url.pathname.slice(1); // Remove leading /
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
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './test-runner/coverage',
      clean: true,
      cleanOnRerun: true,
      reportOnFailure: true,
      include: [
        'src/logic/**/*.ts',
        'src/utils/**/*.ts',
        'src/constants/**/*.ts'
      ],
      exclude: [
        'src/**/*.d.ts',
        'src/**/types.ts',
        'src/templates/**',
        'src/handlers/**',
        'node_modules/**',
        'dist/**',
        '.wrangler/**'
      ],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95
      }
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
