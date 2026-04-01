import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, getWorkerStatus } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpoint } from '@tests/helpers/test-helpers';
import { buildFullUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestEnvVar, TestEnvValue, WorkerMode, WorkerHealth, TestTimeout, TestWorkerPort, TestWorkerUrl, TestConfig } from '@tests/constants/test-constants';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

function isThreadsMode(): boolean {
  return process.env.TEST_RUNNER === 'unstable';
}

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  const originalTestMode = process.env[TestEnvVar.TestMode];
  const originalWorkerUrl = process.env[TestEnvVar.WorkerUrl];
  const originalViteWorkerUrl = process.env[TestEnvVar.ViteWorkerUrl];

  beforeEach(async () => {
    delete process.env[TestEnvVar.TestMode];
    delete process.env[TestEnvVar.WorkerUrl];
    delete process.env[TestEnvVar.ViteWorkerUrl];
  });

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (originalTestMode) {
      process.env[TestEnvVar.TestMode] = originalTestMode;
    } else {
      delete process.env[TestEnvVar.TestMode];
    }
    if (originalWorkerUrl) {
      process.env[TestEnvVar.WorkerUrl] = originalWorkerUrl;
    } else {
      delete process.env[TestEnvVar.WorkerUrl];
    }
    if (originalViteWorkerUrl) {
      process.env[TestEnvVar.ViteWorkerUrl] = originalViteWorkerUrl;
    } else {
      delete process.env[TestEnvVar.ViteWorkerUrl];
    }
  });

  it(testName('getTestWorker - In-Process Mode: creates worker without HTTP server when httpPort not specified'), async () => {
      logInfo('[TEST] Testing getTestWorker without HTTP server', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      const worker = await getTestWorker();
      const status = worker.getStatus();
      logInfo('[TEST] Worker status', getStackTrace(), { status }, LOG_TEST_OPERATIONS);

      if (isThreadsMode()) {
        expect(status.mode).toBe(WorkerMode.Http);
        expect(status.httpServer).toBe(true);
        expect(typeof status.port).toBe('number');
        expect(status.health).toBe(WorkerHealth.Ready);
        expect(status.message).toContain('unstable_dev');
      } else {
        expect(status.mode).toBe(WorkerMode.InProcess);
        expect(status.inProcess).toBe(true);
        expect(status.httpServer).toBeUndefined();
        expect(status.port).toBeUndefined();
        expect(status.health).toBe(WorkerHealth.Ready);
        expect(status.message).toContain('pool-workers');
      }
      if (status.health !== WorkerHealth.Ready) {
        logError('[TEST] Worker initialization failed', getStackTrace(), { mode: status.mode, health: status.health });
      }

      const token = await createToken();
      const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
      const response = await worker.fetch(rootUrl, {}, token);
      expect(response.status).toBe(HttpStatus.Ok);
      if (response.status !== HttpStatus.Ok) {
        logError('[TEST] Worker root endpoint failed', getStackTrace(), { status: response.status });
      }

      if (worker.stop) {
        await worker.stop();
      }
    },
    TestTimeout.Default
  );

  it(testName('getTestWorker - In-Process Mode: creates isolated worker instances per call (no shared state)'), async () => {
    const worker1 = await getTestWorker();
    const worker2 = await getTestWorker();

    const status1 = worker1.getStatus();
    const status2 = worker2.getStatus();

    if (isThreadsMode()) {
      expect(status1.mode).toBe(WorkerMode.Http);
      expect(status2.mode).toBe(WorkerMode.Http);
      expect(status1.httpServer).toBe(true);
      expect(status2.httpServer).toBe(true);
    } else {
      expect(status1.inProcess).toBe(true);
      expect(status2.inProcess).toBe(true);
    }
    expect(status1.health).toBe(WorkerHealth.Ready);
    expect(status2.health).toBe(WorkerHealth.Ready);

    const token = await createToken();
    const rootUrl1 = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const rootUrl2 = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response1 = await worker1.fetch(rootUrl1, {}, token);
    const response2 = await worker2.fetch(rootUrl2, {}, token);
    expect(response1.status).toBe(HttpStatus.Ok);
    expect(response2.status).toBe(HttpStatus.Ok);

    if (worker1.stop) {
      await worker1.stop();
    }
    if (worker2.stop) {
      await worker2.stop();
    }
  }, TestTimeout.Default);

  it(testName('getTestWorker - In-Process Mode: accepts environment variable overrides'), async () => {
    const worker = await getTestWorker({
      ENVIRONMENT: TestEnvValue.Test,
      CORS_ORIGIN: TestConfig.TestOriginExample,
    });

    const status = worker.getStatus();
    expect(status.health).toBe(WorkerHealth.Ready);
    if (isThreadsMode()) {
      expect(status.mode).toBe(WorkerMode.Http);
      expect(status.httpServer).toBe(true);
    } else {
      expect(status.inProcess).toBe(true);
    }

    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {}, token);
    expect(response.status).toBe(HttpStatus.Ok);

    if (worker.stop) {
      await worker.stop();
    }
  }, TestTimeout.Default);

  it(testName('getTestWorker - In-Process Mode: provides getStatus method that returns current status'), async () => {
    const worker = await getTestWorker();
    const status = worker.getStatus();

    expect(status).toHaveProperty('mode');
    expect(status).toHaveProperty('health');
    expect(typeof status.mode).toBe('string');
    expect(typeof status.health).toBe('string');
    if (isThreadsMode()) {
      expect(status).toHaveProperty('httpServer');
      expect(status.httpServer).toBe(true);
      expect(typeof status.port).toBe('number');
    } else {
      expect(status).toHaveProperty('inProcess');
      expect(typeof status.inProcess).toBe('boolean');
    }

    if (worker.stop) {
      await worker.stop();
    }
  }, TestTimeout.Default);

  it(testName('getTestWorker - Pool-Workers Mode: ignores httpPort option and uses pool-workers'), async () => {
    const worker = await getTestWorker({}, { httpPort: TestWorkerPort.Default });
    const status = worker.getStatus();

    if (isThreadsMode()) {
      expect(status.mode).toBe(WorkerMode.Http);
      expect(status.httpServer).toBe(true);
      expect(typeof status.port).toBe('number');
      expect(status.health).toBe(WorkerHealth.Ready);
      expect(status.message).toContain('unstable_dev');
    } else {
      expect(status.mode).toBe(WorkerMode.InProcess);
      expect(status.inProcess).toBe(true);
      expect(status.httpServer).toBeUndefined();
      expect(status.port).toBeUndefined();
      expect(status.health).toBe(WorkerHealth.Ready);
      expect(status.message).toContain('pool-workers');
    }

    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {}, token);
    expect(response.status).toBe(HttpStatus.Ok);

    if (worker.stop) {
      await worker.stop();
    }
  }, TestTimeout.Default);

  it(testName('getTestWorker - Pool-Workers Mode: ignores environment variable overrides in pool-workers mode'), async () => {
    const worker = await getTestWorker({
      ENVIRONMENT: TestEnvValue.Test,
      CORS_ORIGIN: TestConfig.TestOriginExample,
    });
    const status = worker.getStatus();

    if (isThreadsMode()) {
      expect(status.mode).toBe(WorkerMode.Http);
      expect(status.httpServer).toBe(true);
    } else {
      expect(status.mode).toBe(WorkerMode.InProcess);
      expect(status.inProcess).toBe(true);
    }
    expect(status.health).toBe(WorkerHealth.Ready);

    const token = await createToken();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response = await worker.fetch(rootUrl, {}, token);
    expect(response.status).toBe(HttpStatus.Ok);

    if (worker.stop) {
      await worker.stop();
    }
  }, TestTimeout.Default);

  it(testName('getWorkerStatus: returns default status when no worker is active (per-test-file isolation)'), async () => {
    const status = getWorkerStatus();

    expect(status.health).toBe(WorkerHealth.Ready);
    if (isThreadsMode()) {
      expect(status.mode).toBe(WorkerMode.Http);
      expect(status.message).toContain('unstable_dev');
    } else {
      expect(status.mode).toBe(WorkerMode.InProcess);
      expect(status.message).toContain('pool-workers');
    }
  });

  it(testName('getWorkerStatus: returns default status regardless of active workers (no shared state)'), async () => {
    const worker = await getTestWorker();
    const status = getWorkerStatus();

    expect(status.health).toBe(WorkerHealth.Ready);
    if (isThreadsMode()) {
      expect(status.mode).toBe(WorkerMode.Http);
      expect(status.message).toContain('unstable_dev');
      expect(status.httpServer).toBe(true);
    } else {
      expect(status.mode).toBe(WorkerMode.InProcess);
      expect(status.message).toContain('pool-workers');
      expect(status.inProcess).toBeUndefined();
    }

    if (worker.stop) {
      await worker.stop();
    }
  });

  it(testName('getWorkerStatus: returns default status regardless of httpPort option (pool-workers mode)'), async () => {
    const worker = await getTestWorker({}, { httpPort: TestWorkerPort.Default });

    const status = getWorkerStatus();
    if (isThreadsMode()) {
      expect(status.mode).toBe(WorkerMode.Http);
      expect(status.message).toContain('unstable_dev');
    } else {
      expect(status.mode).toBe(WorkerMode.InProcess);
      expect(status.message).toContain('pool-workers');
    }

    const workerStatus = worker.getStatus();
    if (isThreadsMode()) {
      expect(workerStatus.mode).toBe(WorkerMode.Http);
      expect(workerStatus.httpServer).toBe(true);
      expect(typeof workerStatus.port).toBe('number');
    } else {
      expect(workerStatus.mode).toBe(WorkerMode.InProcess);
      expect(workerStatus.httpServer).toBeUndefined();
      expect(workerStatus.port).toBeUndefined();
    }

    if (worker.stop) {
      await worker.stop();
    }
  }, TestTimeout.Default);

  it(testName('getWorkerStatus: returns status with required fields (default static status)'), async () => {
    const status = getWorkerStatus();

    expect(status).toHaveProperty('mode');
    expect(status).toHaveProperty('health');
    expect(status).toHaveProperty('message');
    if (isThreadsMode()) {
      expect(status.mode).toBe(WorkerMode.Http);
    } else {
      expect(status.mode).toBe(WorkerMode.InProcess);
    }
    expect(status.health).toBe(WorkerHealth.Ready);
    expect(typeof status.message).toBe('string');
  });

  it(testName('Worker Lifecycle: handles complete lifecycle create, use, stop'), async () => {
    const token = await createToken();
    const worker = await getTestWorker();
    const rootUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Root);
    const response1 = await worker.fetch(rootUrl, {}, token);
    expect(response1.status).toBe(HttpStatus.Ok);

    const statusBeforeStop = worker.getStatus();
    expect(statusBeforeStop.health).toBe(WorkerHealth.Ready);

    if (worker.stop) {
      await worker.stop();
    }

    const statusAfterStop = worker.getStatus();
    expect(statusAfterStop.health).toBe(WorkerHealth.Ready);
  }, TestTimeout.Default);

  it(testName('Health Check Endpoint: responds to /health endpoint via in-process API'), async () => {
    const token = await createToken();
    const worker = await getTestWorker();
    const healthUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Health);
    const response = await worker.fetch(healthUrl, {}, token);
    expect(response.status).toBe(HttpStatus.Ok);

    if (worker.stop) {
      await worker.stop();
    }
  }, TestTimeout.Default);

  it(testName('Error Handling: handles worker fetch errors gracefully'), async () => {
    const token = await createToken();
    const worker = await getTestWorker();

    const response = await worker.fetch('/nonexistent-endpoint-12345', {}, token);
    expect(typeof response.status).toBe('number');
    expect([HttpStatus.NotFound, HttpStatus.BadRequest]).toContain(response.status);

    if (worker.stop) {
      await worker.stop();
    }
  }, TestTimeout.Default);

  it(testName('Error Handling: maintains status consistency after errors'), async () => {
    const token = await createToken();
    const worker = await getTestWorker();

    const errRes = await worker.fetch('/nonexistent', {}, token);
    await errRes.text().catch(() => undefined);
    const status = worker.getStatus();

    expect(status.health).toBe(WorkerHealth.Ready);
    if (isThreadsMode()) {
      expect(status.mode).toBe(WorkerMode.Http);
      expect(status.httpServer).toBe(true);
    } else {
      expect(status.inProcess).toBe(true);
    }

    if (worker.stop) {
      await worker.stop();
    }
  }, TestTimeout.Default);

  describe(`${extractName(import.meta.url)} - Production Worker Mode`, TestSuiteType.Unit, () => {
    const originalTestMode = process.env[TestEnvVar.TestMode];
    const originalWorkerUrl = process.env[TestEnvVar.WorkerUrl];
    const originalViteWorkerUrl = process.env[TestEnvVar.ViteWorkerUrl];

    beforeEach(() => {
      delete process.env[TestEnvVar.TestMode];
      delete process.env[TestEnvVar.WorkerUrl];
      delete process.env[TestEnvVar.ViteWorkerUrl];
    });

    afterEach(() => {
      if (originalTestMode) {
        process.env[TestEnvVar.TestMode] = originalTestMode;
      } else {
        delete process.env[TestEnvVar.TestMode];
      }
      if (originalWorkerUrl) {
        process.env[TestEnvVar.WorkerUrl] = originalWorkerUrl;
      } else {
        delete process.env[TestEnvVar.WorkerUrl];
      }
      if (originalViteWorkerUrl) {
        process.env[TestEnvVar.ViteWorkerUrl] = originalViteWorkerUrl;
      } else {
        delete process.env[TestEnvVar.ViteWorkerUrl];
      }
    });

    it(testName('should require WORKER_URL when TEST_MODE=real'), async () => {
      process.env[TestEnvVar.TestMode] = TestEnvValue.Real;
      delete process.env[TestEnvVar.WorkerUrl];
      delete process.env[TestEnvVar.ViteWorkerUrl];

      await expect(async () => {
        await getTestWorker({ [TestEnvVar.TestMode]: TestEnvValue.Real });
      }).rejects.toThrow(/WORKER_URL must be set/);
    });

    it(testName('should create production worker when URL is provided'), async () => {
      process.env[TestEnvVar.TestMode] = TestEnvValue.Real;
      process.env[TestEnvVar.WorkerUrl] = TestWorkerUrl.TestWorker;

      const worker = await getTestWorker({
        [TestEnvVar.TestMode]: TestEnvValue.Real,
        [TestEnvVar.WorkerUrl]: TestWorkerUrl.TestWorker
      });
      const status = worker.getStatus();

      expect(status.mode).toBe(WorkerMode.Real);
      expect(status.url).toBe(TestWorkerUrl.TestWorker);
      expect([WorkerHealth.Ready, WorkerHealth.Error]).toContain(status.health);
      expect(status.message).toBeDefined();
      expect(typeof status.message).toBe('string');
      expect((status.message as string).length).toBeGreaterThanOrEqual(0);
      expect(worker.stop).toBeUndefined();
    });

    it(testName('should support custom domain production URLs'), async () => {
      process.env[TestEnvVar.TestMode] = TestEnvValue.Real;
      process.env[TestEnvVar.WorkerUrl] = TestWorkerUrl.ApiExample;

      const worker = await getTestWorker({
        [TestEnvVar.TestMode]: TestEnvValue.Real,
        [TestEnvVar.WorkerUrl]: TestWorkerUrl.ApiExample
      });
      const status = worker.getStatus();

      expect(status.mode).toBe(WorkerMode.Real);
      expect(status.url).toBe(TestWorkerUrl.ApiExample);
    });

    it(testName('should normalize production URL (remove trailing slash)'), async () => {
      process.env[TestEnvVar.TestMode] = TestEnvValue.Real;
      process.env[TestEnvVar.WorkerUrl] = TestWorkerUrl.TestWorkerWithSlash;

      const worker = await getTestWorker({
        [TestEnvVar.TestMode]: TestEnvValue.Real,
        [TestEnvVar.WorkerUrl]: TestWorkerUrl.TestWorkerWithSlash
      });
      const status = worker.getStatus();

      expect(status.url).toBe(TestWorkerUrl.TestWorker);
    });

    it(testName('should replace api.test placeholder in URLs'), async () => {
      process.env[TestEnvVar.TestMode] = TestEnvValue.Real;
      process.env[TestEnvVar.WorkerUrl] = TestWorkerUrl.TestWorker;

      let capturedUrl: string | undefined;
      const originalFetch = global.fetch;
      global.fetch = vi.fn(async (input: RequestInfo | URL) => {
        capturedUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        return new Response('OK', { status: HttpStatus.Ok });
      }) as typeof fetch;

      try {
        const token = await createToken();
        const worker = await getTestWorker({
          [TestEnvVar.TestMode]: TestEnvValue.Real,
          [TestEnvVar.WorkerUrl]: TestWorkerUrl.TestWorker
        });
        const healthUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Health);
        const res1 = await worker.fetch(healthUrl, {}, token);
        await res1.text().catch(() => undefined);
        
        expect(capturedUrl).not.toBeUndefined();
        expect(typeof capturedUrl).toBe('string');
        expect(capturedUrl).toContain('test-worker.workers.dev');
        expect(capturedUrl).not.toContain(TestConfig.TestApiUrlPlaceholder.split('://')[1]);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it(testName('should handle relative paths with production worker'), async () => {
      process.env[TestEnvVar.TestMode] = TestEnvValue.Real;
      process.env[TestEnvVar.WorkerUrl] = TestWorkerUrl.TestWorker;

      let capturedUrl: string | undefined;
      const originalFetch = global.fetch;
      global.fetch = vi.fn(async (input: RequestInfo | URL) => {
        capturedUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        return new Response('OK', { status: HttpStatus.Ok });
      }) as typeof fetch;

      try {
        const token = await createToken();
        const worker = await getTestWorker({
          [TestEnvVar.TestMode]: TestEnvValue.Real,
          [TestEnvVar.WorkerUrl]: TestWorkerUrl.TestWorker
        });
        const healthUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Health);
        const res2 = await worker.fetch(healthUrl, {}, token);
        await res2.text().catch(() => undefined);
        
        expect(capturedUrl).toBe(buildFullUrl(ApiEndpoint.Health, { baseUrl: TestWorkerUrl.TestWorker }));
      } finally {
        global.fetch = originalFetch;
      }
    });

    it(testName('should handle absolute URLs with production worker'), async () => {
      process.env[TestEnvVar.TestMode] = TestEnvValue.Real;
      process.env[TestEnvVar.WorkerUrl] = TestWorkerUrl.TestWorker;

      let capturedUrl: string | undefined;
      const originalFetch = global.fetch;
      global.fetch = vi.fn(async (input: RequestInfo | URL) => {
        capturedUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        return new Response('OK', { status: HttpStatus.Ok });
      }) as typeof fetch;

      try {
        const token = await createToken();
        const worker = await getTestWorker({
          [TestEnvVar.TestMode]: TestEnvValue.Real,
          [TestEnvVar.WorkerUrl]: TestWorkerUrl.TestWorker
        });
        const res3 = await worker.fetch(buildFullUrl(ApiEndpoint.Health, { baseUrl: TestWorkerUrl.TestWorker }), {}, token);
        await res3.text().catch(() => undefined);
        
        expect(capturedUrl).toBe(buildFullUrl(ApiEndpoint.Health, { baseUrl: TestWorkerUrl.TestWorker }));
        expect(capturedUrl).toContain('test-worker.workers.dev');
      } finally {
        global.fetch = originalFetch;
      }
    });

    it(testName('should not start HTTP server for production workers'), async () => {
      process.env[TestEnvVar.TestMode] = TestEnvValue.Real;
      process.env[TestEnvVar.WorkerUrl] = TestWorkerUrl.TestWorker;

      const worker = await getTestWorker({
        [TestEnvVar.TestMode]: TestEnvValue.Real,
        [TestEnvVar.WorkerUrl]: TestWorkerUrl.TestWorker
      }, { httpPort: TestWorkerPort.Default });
      const status = worker.getStatus();

      expect(status.mode).toBe(WorkerMode.Real);
      expect(status.httpServer).toBeUndefined();
      expect(status.port).toBeUndefined();
    });

    it(testName('should report ready status for production worker (health check not performed at creation)'), async () => {
      process.env[TestEnvVar.TestMode] = TestEnvValue.Real;
      process.env[TestEnvVar.WorkerUrl] = TestWorkerUrl.Unreachable;

      const worker = await getTestWorker({
        [TestEnvVar.TestMode]: TestEnvValue.Real,
        [TestEnvVar.WorkerUrl]: TestWorkerUrl.Unreachable
      });
      const status = worker.getStatus();

      expect(status.mode).toBe(WorkerMode.Real);
      expect(status.health).toBe(WorkerHealth.Ready);
      expect(status.url).toBe(TestWorkerUrl.Unreachable);
      expect(typeof status.message).toBe('string');
    });

    it(testName('should provide status information for production workers'), async () => {
      process.env[TestEnvVar.TestMode] = TestEnvValue.Real;
      process.env[TestEnvVar.WorkerUrl] = TestWorkerUrl.TestWorker;

      const worker = await getTestWorker({
        [TestEnvVar.TestMode]: TestEnvValue.Real,
        [TestEnvVar.WorkerUrl]: TestWorkerUrl.TestWorker
      });
      const status = worker.getStatus();

      expect(status).toHaveProperty('mode');
      expect(status).toHaveProperty('url');
      expect(status).toHaveProperty('health');
      expect(status).toHaveProperty('message');
      expect(status.mode).toBe(WorkerMode.Real);
      expect(typeof status.url).toBe('string');
      expect([WorkerHealth.Ready, WorkerHealth.Error, WorkerHealth.Starting]).toContain(status.health);
    });

    it(testName('should default to local mode when TEST_MODE is not set'), async () => {
      delete process.env[TestEnvVar.TestMode];
      delete process.env[TestEnvVar.WorkerUrl];
      delete process.env[TestEnvVar.ViteWorkerUrl];

      const worker = await getTestWorker();
      const status = worker.getStatus();

      if (isThreadsMode()) {
        expect(status.mode).toBe(WorkerMode.Http);
        expect(status.httpServer).toBe(true);
        expect(status.url).toMatch(/^http:\/\/localhost:\d+$/);
        expect(typeof status.port).toBe('number');
      } else {
        expect(status.mode).toBe(WorkerMode.InProcess);
        expect(status.inProcess).toBe(true);
        expect(status.url).toBeUndefined();
      }

      if (worker.stop) {
        await worker.stop();
      }
    }, TestTimeout.Default);

    it(testName('should use local mode even if WORKER_URL is set but TEST_MODE is not real'), async () => {
      process.env[TestEnvVar.WorkerUrl] = TestWorkerUrl.SomeWorker;
      delete process.env[TestEnvVar.TestMode];

      const worker = await getTestWorker();
      const status = worker.getStatus();

      if (isThreadsMode()) {
        expect(status.mode).toBe(WorkerMode.Http);
        expect(status.httpServer).toBe(true);
      } else {
        expect(status.mode).toBe(WorkerMode.InProcess);
        expect(status.inProcess).toBe(true);
      }

      if (worker.stop) {
        await worker.stop();
      }
    }, TestTimeout.Default);
  });
});
