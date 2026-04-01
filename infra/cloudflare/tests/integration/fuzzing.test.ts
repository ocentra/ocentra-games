import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getValidRequestHeaders, buildTestApiUrlWithQuery } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus, HttpHeader } from '@ocentra/endpoint-domain/constants/http';
import { QueryParam } from '@ocentra/endpoint-domain/constants/query';
import { ResourceType } from '@ocentra/endpoint-domain/constants/resources';
import { TestConfig, TestEnvVar, TestEnvValue } from '@tests/constants/test-constants';
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
  const walletId = `${TestConfig.TestWalletId}-fuzz-${Date.now()}`;

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for fuzzing tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    } catch (error) {
      logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function generateUnicodeString(): string {
    const unicodeRanges = [
      [0x0020, 0x007F],
      [0x00A0, 0x00FF],
      [0x0100, 0x017F],
      [0x0180, 0x024F],
      [0x1E00, 0x1EFF],
      [0x2000, 0x206F],
      [0x2070, 0x209F],
      [0x20A0, 0x20CF],
      [0x2100, 0x214F],
      [0x2190, 0x21FF],
      [0x2200, 0x22FF],
      [0x2300, 0x23FF],
      [0x2400, 0x243F],
      [0x2440, 0x245F],
      [0x2460, 0x24FF],
      [0x2500, 0x257F],
      [0x2580, 0x259F],
      [0x25A0, 0x25FF],
      [0x2600, 0x26FF],
      [0x2700, 0x27BF],
      [0xFE00, 0xFE0F],
      [0x1F300, 0x1F5FF],
      [0x1F600, 0x1F64F],
      [0x1F680, 0x1F6FF],
      [0x1F700, 0x1F77F],
      [0x1F780, 0x1F7FF],
      [0x1F800, 0x1F8FF],
      [0x1F900, 0x1F9FF],
      [0x1FA00, 0x1FA6F],
      [0x1FA70, 0x1FAFF],
      [0x1FB00, 0x1FBFF]
    ];
    
    const range = unicodeRanges[Math.floor(Math.random() * unicodeRanges.length)];
    const codePoint = Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
    return String.fromCodePoint(codePoint);
  }

  function generateEmoji(): string {
    const emojis = ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  function generateBoundaryValue(): string {
    const values = [
      String(Number.MAX_SAFE_INTEGER),
      String(Number.MIN_SAFE_INTEGER),
      String(Number.MAX_VALUE),
      String(Number.MIN_VALUE),
      '-1',
      '0',
      '1',
      String(2 ** 31 - 1),
      String(-(2 ** 31)),
      String(2 ** 32 - 1),
      String(-(2 ** 32)),
      String(2 ** 53 - 1),
      String(-(2 ** 53))
    ];
    return values[Math.floor(Math.random() * values.length)];
  }

  function generateMalformedUTF8(): string {
    const malformed = [
      '\xFF\xFE',
      '\x00\x01\x02',
      '\xC0\x80',
      '\xE0\x80\x80',
      '\xF0\x80\x80\x80',
      '\xED\xA0\x80',
      '\xF4\x90\x80\x80'
    ];
    return malformed[Math.floor(Math.random() * malformed.length)];
  }

  function generateTypeConfusion(): string {
    const types = [
      'null',
      'undefined',
      'true',
      'false',
      '[]',
      '{}',
      'NaN',
      'Infinity',
      '-Infinity'
    ];
    return types[Math.floor(Math.random() * types.length)];
  }

  const payloadGenerators = [
    () => generateRandomString(Math.floor(Math.random() * 100) + 1),
    () => generateUnicodeString().repeat(Math.floor(Math.random() * 10) + 1),
    () => generateEmoji().repeat(Math.floor(Math.random() * 5) + 1),
    () => generateBoundaryValue(),
    () => generateMalformedUTF8(),
    () => generateTypeConfusion(),
    () => '\0'.repeat(Math.floor(Math.random() * 5) + 1),
    () => ' '.repeat(Math.floor(Math.random() * 100) + 1),
    () => '\t'.repeat(Math.floor(Math.random() * 10) + 1),
    () => '\n'.repeat(Math.floor(Math.random() * 10) + 1),
    () => '\r\n'.repeat(Math.floor(Math.random() * 10) + 1),
    () => String.fromCharCode(Math.floor(Math.random() * 256)),
    () => String.fromCodePoint(Math.floor(Math.random() * 0x10FFFF)),
    () => Array(Math.floor(Math.random() * 50) + 1).fill('x').join(''),
    () => 'x'.repeat(Math.floor(Math.random() * 1000) + 1)
  ];

  it(testName('should handle 1000 random payloads without crashes'), async () => {
    const token = await createToken();
    const TEST_MODE = process.env[TestEnvVar.TestMode] || TestEnvValue.Local;
    const isRealMode = TEST_MODE === TestEnvValue.Real || TEST_MODE === TestEnvValue.Cloud;
    // 1000 sequential requests to the same worker - tests robustness against random/malformed inputs
    // Sequential because: (1) all hit same worker instance, (2) parallel would overwhelm it,
    // (3) easier to debug which payload caused failure
    const iterations = isRealMode ? 5 : 1000;

    const errors: Array<{ payload: string; status: number; error?: string }> = [];
    const statusCodes = new Map<number, number>();

    for (let i = 0; i < iterations; i++) {
      const generator = payloadGenerators[Math.floor(Math.random() * payloadGenerators.length)];
      const payload = generator();
      const encodedPayload = encodeURIComponent(payload);

      try {
        const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: encodedPayload, [QueryParam.Type]: ResourceType.Image });
        const response = await worker.fetch(resourceUrl, {
            headers: {
              ...getValidRequestHeaders(TestConfig.TestUserId),
              [HttpHeader.XWalletId]: walletId
            }
          }, token
        );

        const status = response.status;
        statusCodes.set(status, (statusCodes.get(status) || 0) + 1);

        if (status >= HttpStatus.InternalServerError) {
          const text = await response.text();
          errors.push({
            payload: payload.substring(0, 50),
            status,
            error: text.substring(0, 100)
          });
        }
      } catch (error) {
        errors.push({
          payload: payload.substring(0, 50),
          status: 0,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      if ((i + 1) % 100 === 0) {
        logInfo('[TEST] Fuzz progress', getStackTrace(), { iteration: i + 1, total: iterations }, true);
      }
    }

    await flushAllBatchesAndTestLogs();

    expect(errors.length).toBe(0);
    expect(statusCodes.has(HttpStatus.InternalServerError)).toBe(false);
    expect(statusCodes.has(502)).toBe(false);
    expect(statusCodes.has(HttpStatus.ServiceUnavailable)).toBe(false);
    if (errors.length > 0 || statusCodes.has(HttpStatus.InternalServerError) || statusCodes.has(502) || statusCodes.has(HttpStatus.ServiceUnavailable)) {
      logError('[TEST] Fuzzing test detected errors or unexpected status codes', getStackTrace(), { errorCount: errors.length, has500: statusCodes.has(HttpStatus.InternalServerError), has502: statusCodes.has(502), has503: statusCodes.has(HttpStatus.ServiceUnavailable) });
    }
    
    const allowedStatuses: number[] = [HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.NotFound, HttpStatus.TooManyRequests];
    const invalidStatuses = Array.from(statusCodes.keys()).filter((s: number) => !allowedStatuses.includes(s) && s < HttpStatus.InternalServerError);
    expect(invalidStatuses.length).toBe(0);
  }, 600000);

  it(testName('should handle unicode payloads correctly'), async () => {
    const token = await createToken();
    const unicodePayloads = [
      '测试',
      'тест',
      'テスト',
      '🎮🎯🎲',
      '🚀🚁🚂',
      'αβγδε',
      'אב',
      'अआइ',
      '😀😃😄',
      String.fromCodePoint(0x1F600, 0x1F601, 0x1F602)
    ];

    for (const payload of unicodePayloads) {
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: payload, [QueryParam.Type]: ResourceType.Image });
      const response = await worker.fetch(resourceUrl, {
          headers: {
              ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.XWalletId]: walletId
          }
        },
        token
      );

      expect([HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.NotFound]).toContain(response.status);
    }
  });

  it(testName('should handle null byte injection'), async () => {
    const token = await createToken();
    const nullBytePayloads = [
      'test\0hash',
      '\0\0\0',
      'hash\0with\0nulls',
      String.fromCharCode(0)
    ];

    for (const payload of nullBytePayloads) {
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: payload, [QueryParam.Type]: ResourceType.Image });
      const response = await worker.fetch(resourceUrl, {
          headers: {
              ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.XWalletId]: walletId
          }
        }, token
      );

      expect([HttpStatus.BadRequest, HttpStatus.NotFound]).toContain(response.status);
      await consumeResponseBody(response);
    }
  });

  it(testName('should handle boundary values'), async () => {
    const token = await createToken();
    const boundaryPayloads = [
      String(Number.MAX_SAFE_INTEGER),
      String(Number.MIN_SAFE_INTEGER),
      '0',
      '-1',
      String(2 ** 32)
    ];

    for (const payload of boundaryPayloads) {
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: payload, [QueryParam.Type]: ResourceType.Image });
      const response = await worker.fetch(resourceUrl, {
          headers: {
              ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.XWalletId]: walletId
          }
        }, token
      );

      expect([HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.NotFound]).toContain(response.status);
    }
  });

  it(testName('should handle type confusion attacks'), async () => {
    const token = await createToken();
    const typeConfusionPayloads = [
      'null',
      'undefined',
      'true',
      'false',
      '[]',
      '{}',
      'NaN',
      'Infinity'
    ];

    for (const payload of typeConfusionPayloads) {
      const resourceUrl = buildTestApiUrlWithQuery(ApiEndpoint.Resources.Base, { [QueryParam.Hash]: payload, [QueryParam.Type]: ResourceType.Image });
      const response = await worker.fetch(resourceUrl, {
          headers: {
              ...getValidRequestHeaders(TestConfig.TestUserId),
            [HttpHeader.XWalletId]: walletId
          }
        },
        token
      );

      expect([HttpStatus.Ok, HttpStatus.BadRequest, HttpStatus.NotFound]).toContain(response.status);
      await consumeResponseBody(response);
    }
  });
});
