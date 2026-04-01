import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import { validateRequestPrerequisites } from './test-helpers';
import { getCurrentTestName, getTestHeaders, getTestHeadersFromGlobal, type SetupContextToken } from '@tests/test-setup-core';
import { getRunId } from '@ocentra/logging-domain/test-log/testLogBuffer';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { TestRunMode } from '@/constants/test-run-mode';
import { TestEnvVar, TestEnvValue, TestConfig, TestWorkerHost } from '@tests/constants/test-constants';
import { getUnstableIncludeFiles } from '../../test-runner/script/lib/suite-type-map.js';

export type WorkerMode = 'in-process' | 'http' | 'both' | 'real';

export type WorkerStatus = {
  mode: WorkerMode;
  port?: number;
  url?: string;
  health: 'ready' | 'starting' | 'error' | 'stopped';
  httpServer?: boolean;
  inProcess?: boolean;
  message?: string;
};

export type TestWorker = {
  fetch: (input: RequestInfo | URL, init?: RequestInit, token?: SetupContextToken) => Promise<Response>;
  stop?: () => Promise<void>;
  getStatus: () => WorkerStatus;
};

type UnstableDevWorker = {
  port?: number;
  stop: () => Promise<void>;
  fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
};

type UnstableDevReturn = {
  port?: number;
  stop: () => Promise<void>;
  fetch: (input: RequestInfo | URL | string, init?: RequestInit) => Promise<Response>;
};

let cachedUnstablePaths: string[] | null = null;

const LOG_DIAG = false;

function getUnstableTestPaths(): string[] {
  if (cachedUnstablePaths === null) {
    const cwd = path.resolve(__dirname, '..', '..');
    cachedUnstablePaths = getUnstableIncludeFiles(cwd);
  }
  return cachedUnstablePaths;
}

function isRealWorkerMode(): boolean {
  const testMode = process.env[TestEnvVar.TestMode];
  return testMode === TestEnvValue.Real || testMode === TestEnvValue.Cloud;
}

function requireRealWorkerUrl(): string {
  const raw = process.env[TestEnvVar.WorkerUrl];
  if (!raw || raw.trim().length === 0) {
    throw new Error('WORKER_URL must be set when TEST_MODE=real or TEST_MODE=cloud');
  }
  return raw.trim().replace(/\/+$/, '');
}

function normalizeRealWorkerFetchUrl(inputUrl: string, workerBaseUrl: string): string {
  const trimmed = inputUrl.trim();
  if (!trimmed) {
    throw new Error(`[FAIL-FAST] Empty or invalid URL provided to worker.fetch. URL: ${JSON.stringify(inputUrl)}`);
  }

  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return new URL(path, workerBaseUrl).toString();
  }

  const u = new URL(trimmed);
  const base = new URL(workerBaseUrl);

  if (u.hostname === TestWorkerHost.ApiTest || u.origin === TestConfig.TestApiUrlPlaceholder) {
    return new URL(`${u.pathname}${u.search}${u.hash}`, base).toString();
  }

  if (u.origin === base.origin) {
    return u.toString();
  }

  throw new Error(
    `[FAIL-FAST] Invalid hostname for real worker fetch. Expected '${base.hostname}' or '${TestWorkerHost.ApiTest}', got: ${u.hostname}`
  );
}

const DEFAULT_REAL_WORKER_MAX_REQUESTS_PER_TEST = 10;
const DEFAULT_REAL_WORKER_MAX_REQUESTS_PER_RUN = 200;

let _realWorkerRunRequestCount = 0;
const _realWorkerPerTestRequestCount = new Map<string, number>();

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number.parseInt(trimmed, 10);
  if (!Number.isFinite(n) || Number.isNaN(n) || n <= 0) return null;
  return n;
}

function getRealWorkerRequestBudgets(): { perTest: number; perRun: number } {
  const perTest = parsePositiveInt(process.env[TestEnvVar.RealWorkerMaxRequestsPerTest]) ?? DEFAULT_REAL_WORKER_MAX_REQUESTS_PER_TEST;
  const perRun = parsePositiveInt(process.env[TestEnvVar.RealWorkerMaxRequestsPerRun]) ?? DEFAULT_REAL_WORKER_MAX_REQUESTS_PER_RUN;
  return { perTest, perRun };
}

function shouldUseUnstableDev(): boolean {
  if (process.env[TestEnvVar.TestRunner] === TestRunMode.Unstable) {
    return true;
  }
  
  if (typeof process !== 'undefined' && process.env) {
    const testFile = process.env.VITEST_TEST_FILE || process.env.__VITEST_TEST_FILE__;
    if (testFile) {
      const cwd = path.resolve(__dirname, '..', '..');
      const normalizedPath = path.isAbsolute(testFile)
        ? path.relative(cwd, testFile).replace(/\\/g, '/')
        : testFile.replace(/\\/g, '/');
      return getUnstableTestPaths().some(rel => normalizedPath === rel || normalizedPath.endsWith('/' + rel));
    }
  }
  
  try {
    const stack = new Error().stack;
    if (stack) {
      const normalizedStack = stack.replace(/\\/g, '/');
      return getUnstableTestPaths().some(rel => normalizedStack.includes(rel));
    }
  } catch {
    void 0;
  }
  
  return false;
}

function isUnstableDevMode(): boolean {
  return shouldUseUnstableDev();
}

function canReachPortTcp(port: number, host: string = '127.0.0.1', timeoutMs: number = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const done = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
    socket.connect(port, host);
  });
}

async function warmupUnstableDev(
  devFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  port: number
): Promise<void> {
  const healthUrl = 'http://localhost/health';
  const oneAttemptMs = 5_000;
  let response: Response | undefined;
  try {
    response = await Promise.race([
      devFetch(healthUrl, { method: HttpMethod.Get }),
      new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('Health check timeout')), oneAttemptMs);
      })
    ]);
  } catch (healthError) {
    const tcpReachable = await canReachPortTcp(port);
    if (!tcpReachable) {
      throw new Error(`[FAIL-FAST] unstable_dev: nothing listening on port ${port} - server did not start`);
    }
    throw new Error(
      `[FAIL-FAST] unstable_dev health check failed after ${oneAttemptMs}ms. Error: ${healthError instanceof Error ? healthError.message : String(healthError)}`
    );
  }
  if (!response?.ok) {
    try { await response?.text(); } catch { /* consume then throw */ }
    throw new Error(`[FAIL-FAST] unstable_dev health check returned status ${response?.status ?? 'unknown'}. Worker is not ready.`);
  }
  try { await response.text(); } catch { /* body may already be consumed */ }
}

const UNSTABLE_DEV_STARTUP_TIMEOUT_MS = 60_000;
const UNSTABLE_DEV_DRAIN_MS = 600;

function assertUnstableDevPrerequisites(): void {
  const cwd = process.cwd();
  const wranglerToml = path.join(cwd, 'wrangler.toml');
  const workerEntry = path.join(cwd, 'src', 'index.ts');
  const persistToDir = path.join(cwd, 'tests', '.test-storage');

  if (!fs.existsSync(wranglerToml)) {
    throw new Error(`[FAIL-FAST] unstable_dev prerequisite: wrangler.toml not found at ${wranglerToml}`);
  }
  if (!fs.existsSync(workerEntry)) {
    throw new Error(`[FAIL-FAST] unstable_dev prerequisite: src/index.ts not found at ${workerEntry}`);
  }
  try {
    fs.mkdirSync(persistToDir, { recursive: true });
  } catch (err) {
    throw new Error(
      `[FAIL-FAST] unstable_dev prerequisite: cannot create persistTo dir ${persistToDir}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}

async function createUnstableDevWorker(overrides: Record<string, string> = {}): Promise<TestWorker> {
  assertUnstableDevPrerequisites();

  const failFastMessage = `[FAIL-FAST] unstable_dev failed to start within ${UNSTABLE_DEV_STARTUP_TIMEOUT_MS / 1000}s - check env, wrangler.toml, and worker process logs`;
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(failFastMessage)), UNSTABLE_DEV_STARTUP_TIMEOUT_MS);
  });

  const workerPromise = (async (): Promise<TestWorker> => {
    const { unstable_dev } = await import('wrangler');
    const { TestWorkerBindings } = await import('@tests/constants/test-constants');
    const vars: Record<string, string> = {
      ...TestWorkerBindings,
      ...overrides
    };
    const cwd = process.cwd();
    const entryPath = path.join(cwd, 'src', 'index.ts');
    const configPath = path.join(cwd, 'wrangler.toml');
    const persistToPath = path.join(cwd, 'tests', '.test-storage');
    const dev = await unstable_dev(entryPath, {
      experimental: { disableExperimentalWarning: true },
      config: configPath,
      env: 'development',
      logLevel: 'debug',
      vars,
      persist: true,
      persistTo: persistToPath
    });

    const devTyped = dev as unknown as UnstableDevReturn;
    const actualPort = devTyped.port ?? (dev as { port?: number }).port ?? 8787;
    const fetchTyped = dev.fetch as unknown as (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

    try {
      await warmupUnstableDev(fetchTyped, actualPort);
    } catch (warmupError) {
      await dev.stop();
      throw warmupError;
    }
    const w: UnstableDevWorker = {
      port: actualPort,
      stop: dev.stop,
      fetch: fetchTyped
    };

    return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit, token?: SetupContextToken) => {
      if (!token) {
        throw new Error(
          `[FAIL-FAST] Token required for unstable_dev (threads mode). Pass token from test fixture. ` +
          `Use: test('name', async ({ token }) => { await worker.fetch(url, init, token); })`
        );
      }

      let url: string;
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input instanceof Request) {
        url = input.url;
      } else {
        url = String(input);
      }

      if (!url || url.trim().length === 0) {
        throw new Error(`[FAIL-FAST] Empty or invalid URL provided to worker.fetch. This would cause a timeout. URL: ${JSON.stringify(url)}`);
      }

      let requestUrl: string;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        requestUrl = `http://localhost${url.startsWith('/') ? url : `/${url}`}`;
      } else {
        try {
          const u = new URL(url);
          if (u.hostname === TestWorkerHost.ApiTest || u.origin === TestConfig.TestApiUrlPlaceholder) {
            requestUrl = `http://localhost${u.pathname}${u.search}${u.hash}`;
          } else if (u.hostname === TestWorkerHost.Localhost || u.hostname === TestWorkerHost.Localhost127) {
            requestUrl = url;
          } else {
            throw new Error(`[FAIL-FAST] Invalid hostname for unstable_dev fetch. Expected '${TestWorkerHost.ApiTest}' or '${TestWorkerHost.Localhost}', got: ${u.hostname}`);
          }
        } catch (urlError) {
          if (urlError instanceof Error && urlError.message.includes('[FAIL-FAST]')) {
            throw urlError;
          }
          throw new Error(`[FAIL-FAST] Invalid URL format. This would cause a timeout. URL: ${JSON.stringify(url)}, Error: ${urlError instanceof Error ? urlError.message : String(urlError)}`);
        }
      }

      const headers = getTestHeaders(token);
      if (init?.headers) {
        const initHeaders = new Headers(init.headers);
        initHeaders.forEach((value, key) => {
          headers.set(key, value);
        });
      }

      const UNSTABLE_FETCH_TIMEOUT_MS = 60_000;
      const fetchInit: RequestInit = { ...init, headers };
      if (!fetchInit.signal) {
        fetchInit.signal = AbortSignal.timeout(UNSTABLE_FETCH_TIMEOUT_MS);
      }
      const t0 = Date.now();
      if (LOG_DIAG && typeof console !== 'undefined') console.log('[DIAG] worker.fetch called', { path: requestUrl.replace(/^https?:\/\/[^/]+/, ''), timeoutMs: UNSTABLE_FETCH_TIMEOUT_MS });
      return fetchTyped(requestUrl, fetchInit)
        .then((res) => {
          if (LOG_DIAG && typeof console !== 'undefined') console.log('[DIAG] worker.fetch completed', { path: requestUrl.replace(/^https?:\/\/[^/]+/, ''), status: res.status, ms: Date.now() - t0 });
          return res;
        })
        .catch((err) => {
          if (LOG_DIAG && typeof console !== 'undefined') console.log('[DIAG] worker.fetch failed', { path: requestUrl.replace(/^https?:\/\/[^/]+/, ''), ms: Date.now() - t0, error: err instanceof Error ? err.message : String(err) });
          throw err;
        });
    },
    stop: async () => {
      await new Promise((r) => setTimeout(r, UNSTABLE_DEV_DRAIN_MS));
      await w.stop();
    },
    getStatus: () => {
      const port = w.port ?? 8787;
      return {
        mode: 'http',
        port,
        url: `http://localhost:${port}`,
        health: 'ready',
        httpServer: true,
        message: 'Using unstable_dev (separate process, HTTP server)'
      };
    }
  };
  })();

  return Promise.race([workerPromise, timeoutPromise]);
}

async function createRealWorker(workerBaseUrlOverride?: string): Promise<TestWorker> {
  const rawUrl = workerBaseUrlOverride || requireRealWorkerUrl();
  const workerBaseUrl = rawUrl.trim().replace(/\/+$/, '');

  const workerStatus: WorkerStatus = {
    mode: 'real',
    url: workerBaseUrl,
    health: 'ready',
    message: 'Using real deployed worker (external HTTP)'
  };

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit, token?: SetupContextToken): Promise<Response> => {
      // Fail-fast: verify context is set (unless token proves it)
      if (!token) {
        const testName = getCurrentTestName();
        const runId = getRunId();
        if (!testName || !runId) {
          throw new Error(
            `[FAIL-FAST] Test context not set. testName=${testName ?? 'null'}, runId=${runId ?? 'null'}. ` +
            `Ensure test-setup-pool is imported and beforeEach has run. For beforeAll, use setSetupContext() and pass token as third arg.`
          );
        }
      }

      let url: string;
      if (typeof input === 'string') {
        url = input;
      } else if (input instanceof URL) {
        url = input.toString();
      } else if (input instanceof Request) {
        url = input.url;
      } else {
        url = String(input);
      }

      const normalizedUrl = normalizeRealWorkerFetchUrl(url, workerBaseUrl);

      const { perTest, perRun } = getRealWorkerRequestBudgets();
      const currentTestName = getCurrentTestName();
      const currentRunId = getRunId();
      const testName = currentTestName || '__unknown_test__';
      const runId = currentRunId || '__unknown_run__';

      const prevTestCount = _realWorkerPerTestRequestCount.get(testName) ?? 0;
      const nextTestCount = prevTestCount + 1;
      const nextRunCount = _realWorkerRunRequestCount + 1;

      if (nextTestCount > perTest) {
        throw new Error(
          `[FAIL-FAST] Real-worker request budget exceeded (per-test). Test: ${testName}, Run: ${runId}, Count: ${nextTestCount}, Max: ${perTest}`
        );
      }
      if (nextRunCount > perRun) {
        throw new Error(
          `[FAIL-FAST] Real-worker request budget exceeded (per-run). Test: ${testName}, Run: ${runId}, Count: ${nextRunCount}, Max: ${perRun}`
        );
      }

      _realWorkerPerTestRequestCount.set(testName, nextTestCount);
      _realWorkerRunRequestCount = nextRunCount;

      const validation = validateRequestPrerequisites(normalizedUrl, init);
      if (!validation.valid) {
        throw new Error(
          `[FAIL-FAST] Request prerequisites validation failed. URL: ${normalizedUrl.substring(0, 100)}, Errors: ${validation.errors.join('; ')}`
        );
      }

      const headers = getTestHeadersFromGlobal();
      if (init?.headers) {
        const initHeaders = new Headers(init.headers);
        initHeaders.forEach((value, key) => {
          headers.set(key, value);
        });
      }

      return fetch(normalizedUrl, { ...init, headers });
    },
    getStatus: () => ({ ...workerStatus })
  };
}

export async function getTestWorker(overrides: Record<string, string> = {}, _options?: { httpPort?: number }): Promise<TestWorker> {
  const testModeFromOverrides = overrides[TestEnvVar.TestMode];
  const testModeFromEnv = process.env[TestEnvVar.TestMode];
  const testMode = testModeFromOverrides || testModeFromEnv;
  const workerUrlFromOverrides = overrides[TestEnvVar.WorkerUrl];
  const workerUrlFromEnv = process.env[TestEnvVar.WorkerUrl];
  const workerUrl = workerUrlFromOverrides || workerUrlFromEnv;
  
  if (testMode === TestEnvValue.Real || testMode === TestEnvValue.Cloud) {
    if (!workerUrl || workerUrl.trim().length === 0) {
      throw new Error('WORKER_URL must be set when TEST_MODE=real or TEST_MODE=cloud');
    }
    return createRealWorker(workerUrl);
  }
  
  if (isRealWorkerMode()) {
    return createRealWorker();
  }

  if (isUnstableDevMode()) {
    return createUnstableDevWorker(overrides);
  }

  const workerStatus: WorkerStatus = {
    mode: 'in-process',
    health: 'ready',
    inProcess: true,
    message: 'Using pool-workers (tests run in-pool, no separate process)'
  };
  
  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit, token?: SetupContextToken): Promise<Response> => {
      let normalizedInput: RequestInfo | URL = input;
      if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
          const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
          normalizedInput = `${TestConfig.TestApiUrlPlaceholder}${path}`;
        }
      }

      const validation = validateRequestPrerequisites(normalizedInput, init);
      if (!validation.valid) {
        let urlString: string;
        if (typeof normalizedInput === 'string') {
          urlString = normalizedInput;
        } else if (input instanceof URL) {
          urlString = input.toString();
        } else if (input instanceof Request) {
          urlString = input.url;
        } else {
          urlString = String(input);
        }
        throw new Error(`[FAIL-FAST] Request prerequisites validation failed. This would cause a timeout. URL: ${urlString.substring(0, 100)}, Errors: ${validation.errors.join('; ')}`);
      }

      const { fetchWithTestContext } = await import('@tests/test-setup-pool');
      return fetchWithTestContext(normalizedInput, init, token);
    },
    stop: async () => {
    },
    getStatus: () => ({ ...workerStatus })
  };
}

export function getWorkerStatus(): WorkerStatus {
  const testMode = process.env[TestEnvVar.TestMode];
  const workerUrl = process.env[TestEnvVar.WorkerUrl];
  
  if (testMode === TestEnvValue.Real || testMode === TestEnvValue.Cloud || isRealWorkerMode()) {
    return {
      mode: 'real',
      url: workerUrl,
      health: 'ready',
      message: 'Using real deployed worker (external HTTP)'
    };
  }

  if (isUnstableDevMode()) {
    return {
      mode: 'http',
      health: 'ready',
      httpServer: true,
      message: 'Using unstable_dev (separate process, HTTP server)'
    };
  }
  
  return {
    mode: 'in-process',
    health: 'ready',
    message: 'Using pool-workers (tests run in-pool)'
  };
}
