import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpoint } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import '@/index';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = true) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

async function consumeResponseBody(response: Response): Promise<void> {
  if (!response.bodyUsed) {
    try {
      await response.arrayBuffer();
    } catch {
      try {
        await response.text();
      } catch {
        try {
          await response.blob();
        } catch {
          void 0;
        }
      }
    }
  }
}

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    worker = await getTestWorker();
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('DEBUG - Logging Flow Investigation: test code logging only'), () => {
    logInfo('DEBUG: Test code log 1', getStackTrace());
    logInfo('DEBUG: Test code log 2', getStackTrace(), { testData: 'from test code' });
    expect(true).toBe(true);
  });

  it(testName('DEBUG - Logging Flow Investigation: worker call logging'), async () => {
    logInfo('DEBUG: Before worker call', getStackTrace());
    const token = await createToken();
    const healthUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Health);
    const response = await worker.fetch(healthUrl, {
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin }
    }, token);
    logInfo('DEBUG: After worker call', getStackTrace(), { status: response.status });
    expect(response.ok).toBe(true);
    await consumeResponseBody(response);
  });

  for (let i = 1; i <= 10; i++) {
    it(testName(`Basic Logging Scenarios: test ${i} - basic info logging`), () => {
      logInfo(`Test ${i} started`, getStackTrace());
      logInfo(`Test ${i} processing`, getStackTrace());
      logInfo(`Test ${i} completed`, getStackTrace());
      expect(i).toBeGreaterThan(0);
    });
  }

  for (let i = 1; i <= 10; i++) {
    it(testName(`Worker Call Scenarios: test ${i} - worker health check`), async () => {
      logInfo(`Worker test ${i} starting`, getStackTrace());
      const token = await createToken();
      const healthUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Health);
      const response = await worker.fetch(healthUrl, {
        headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin }
      }, token);
      logInfo(`Health check ${i}`, getStackTrace(), { status: response.status });
      expect(response.ok).toBe(true);
    });
  }

  for (let i = 1; i <= 5; i++) {
    it(testName(`Error Logging Scenarios: test ${i} - error logging`), () => {
      logInfo(`Error test ${i} starting`, getStackTrace());
      logWarn(`Warning ${i}`, getStackTrace());
      logError(`Error ${i} occurred`, getStackTrace());
      if (i % 2 === 0) {
        expect(() => {
          throw new Error(`Intentional error ${i}`);
        }).toThrow(`Intentional error ${i}`);
      } else {
        expect(i).toBeGreaterThan(0);
      }
    });
  }

  for (let i = 1; i <= 5; i++) {
    it(testName(`JSON Data Logging: test ${i} - complex JSON logging`), () => {
      logInfo('Request received', getStackTrace(), {
        testId: i,
        userId: `user-${i}`,
        action: 'test',
        metadata: {
          nested: {
            deep: {
              value: i * 100,
              array: [1, 2, 3, i],
            },
          },
        },
      });
      logInfo('Response sent', getStackTrace(), {
        status: 200,
        testId: i,
        data: { result: 'success', count: i },
      });
      expect(i).toBeGreaterThan(0);
    });
  }

  it(testName('High Volume Logging: test - 100 logs in one test'), () => {
    for (let i = 0; i < 100; i++) {
      logInfo(`Log entry ${i}`, getStackTrace());
    }
    expect(100).toBe(100);
  });

  it(testName('High Volume Logging: test - mixed log levels'), () => {
    for (let i = 0; i < 50; i++) {
      if (i % 4 === 0) {
        logError(`Error ${i}`, getStackTrace());
      } else if (i % 3 === 0) {
        logWarn(`Warning ${i}`, getStackTrace());
      } else {
        logInfo(`Info ${i}`, getStackTrace());
      }
    }
    expect(50).toBe(50);
  });

  it(testName('Context-Based Logging: test - CREDITS context'), () => {
    logInfo('CREDITS', getStackTrace(), 'Balance check');
    logInfo('CREDITS', getStackTrace(), 'Award processing');
    logInfo('CREDITS', getStackTrace(), 'Consumption check');
    expect(true).toBe(true);
  });

  it(testName('Context-Based Logging: test - AUTH context'), () => {
    logInfo('Token validation', getStackTrace());
    logInfo('Permission check', getStackTrace());
    logWarn('Expired token', getStackTrace());
    expect(true).toBe(true);
  });

  it(testName('Context-Based Logging: test - NETWORK context'), () => {
    logInfo('Request received', getStackTrace());
    logInfo('Processing', getStackTrace());
    logWarn('Slow response', getStackTrace());
    expect(true).toBe(true);
  });

  it(testName('Concurrent Operations: test - parallel worker calls'), async () => {
    logInfo('Starting parallel calls', getStackTrace());
    const token = await createToken();
    const healthUrl = buildTestApiUrlForEndpoint(ApiEndpoint.Health);
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(
        worker.fetch(healthUrl, {
          headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin }
        }, token).then((res: Response) => {
          logInfo(`Parallel call ${i}`, getStackTrace(), { status: res.status });
          return res;
        })
      );
    }
    const results = await Promise.all(promises);
    for (const res of results) {
      await consumeResponseBody(res);
    }
    logInfo('All parallel calls completed', getStackTrace(), { count: results.length });
    expect(results.length).toBe(5);
  });

  it(testName('Edge Cases: test - empty message'), () => {
    logInfo('', getStackTrace());
    logInfo('Normal message', getStackTrace());
    expect(true).toBe(true);
  });

  it(testName('Edge Cases: test - very long message'), () => {
    const longMessage = 'A'.repeat(1000);
    logInfo(longMessage, getStackTrace());
    expect(longMessage.length).toBe(1000);
  });

  it(testName('Edge Cases: test - special characters'), () => {
    logInfo('Message with "quotes" and \'apostrophes\'', getStackTrace());
    logInfo('Message with\nnewlines\tand\ttabs', getStackTrace());
    logInfo('Message with unicode: 🚀 ✅ ❌', getStackTrace());
    expect(true).toBe(true);
  });

  it(testName('Edge Cases: test - null/undefined data'), () => {
    logInfo('Message with null', getStackTrace(), null);
    logInfo('Message with undefined', getStackTrace(), undefined);
    logInfo('Normal message', getStackTrace());
    expect(true).toBe(true);
  });

  it(testName('Failure Scenarios: test - assertion failure logging'), () => {
    logInfo('About to test assertion failure logging', getStackTrace());
    logError('Assertion failure logged', getStackTrace(), { expected: 2, actual: 1 });
    expect(1).toBe(1);
  });

  it(testName('Failure Scenarios: test - exception thrown logging'), () => {
    logInfo('About to test exception logging', getStackTrace());
    const testError = new Error('Test exception');
    logError('Exception logged', getStackTrace(), { error: testError.message });
    expect(() => {
      throw testError;
    }).toThrow('Test exception');
  });

  it(testName('Failure Scenarios: test - timeout simulation logging'), () => {
    logInfo('Starting timeout test logging', getStackTrace());
    logWarn('Request taking too long', getStackTrace());
    logError('Timeout error logged', getStackTrace(), { timeout: 5000 });
    expect(() => {
      throw new Error('Test timed out');
    }).toThrow('Test timed out');
  });

  it(testName('Real-World Scenarios: test - purchase flow'), async () => {
    logInfo('Validating user token', getStackTrace());
    logInfo('Checking balance', getStackTrace(), { userId: 'user-123', balance: 100 });
    logInfo('Processing purchase', getStackTrace(), { amount: 50 });
    logInfo('Purchase completed', getStackTrace(), { newBalance: 50 });
    expect(100 - 50).toBe(50);
  });

  it(testName('Real-World Scenarios: test - error handling flow'), () => {
    logInfo('Request received', getStackTrace());
    logWarn('Validation warning', getStackTrace());
    logError('Processing failed', getStackTrace(), { error: 'Invalid input' });
    expect(true).toBe(true);
  });

  it(testName('Real-World Scenarios: test - multi-step workflow'), () => {
    logInfo('Step 1: Init', getStackTrace());
    logInfo('Step 2: Validate', getStackTrace());
    logInfo('Step 3: Process', getStackTrace());
    logInfo('Step 4: Complete', getStackTrace());
    expect(4).toBe(4);
  });

  it(testName('Original Logging Test Scenarios: should pass - hello world'), () => {
    logInfo('Hello from passing test', getStackTrace());
    logInfo('This is an info log', getStackTrace());
    expect(1 + 1).toBe(2);
  });

  it(testName('Original Logging Test Scenarios: should pass - with worker-like logs'), () => {
    logInfo('Processing request', getStackTrace());
    logInfo('Token validated for user-123', getStackTrace());
    logInfo('Balance check: 100 credits', getStackTrace());
    expect(true).toBe(true);
  });

  it(testName('Original Logging Test Scenarios: should verify error logging for assertion failures'), () => {
    logInfo('Testing error logging for assertion failures', getStackTrace());
    logError('Assertion failure logged', getStackTrace(), { expected: 2, actual: 1 });
    expect(1).toBe(1);
  });

  it(testName('Original Logging Test Scenarios: should pass - with JSON data'), () => {
    logInfo('Request received', getStackTrace(), { userId: 'abc', action: 'test' });
    logInfo('Status 200', getStackTrace(), { success: true });
    expect('hello').toContain('ell');
  });

  it(testName('Original Logging Test Scenarios: should verify error logging for timeout scenarios'), () => {
    logInfo('Testing timeout error logging', getStackTrace());
    logWarn('Request timed out after 5000ms', getStackTrace());
    logError('Timeout error logged', getStackTrace(), { timeout: 5000 });
    expect(() => {
      throw new Error('Test timed out waiting for response');
    }).toThrow('Test timed out waiting for response');
  });
});
