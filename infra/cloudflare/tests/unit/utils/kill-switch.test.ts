import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import {
  isEmergencyShutdownEnabled,
  isStateChangingMethod,
  createShutdownResponse,
} from '@/utils/kill-switch';
import type { Env } from '@/constants/env';
import { Environment } from '@ocentra/endpoint-domain/constants/environment';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { QueryValue } from '@ocentra/endpoint-domain/constants/query';
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

describe(extractName(import.meta.url), TestSuiteType.Unit, () => {
  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
  });

  it(testName('isEmergencyShutdownEnabled: returns true when EMERGENCY_SHUTDOWN is true'), () => {
    logInfo('[TEST] Testing isEmergencyShutdownEnabled', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const env: Env = {
      ENVIRONMENT: 'development',
      EMERGENCY_SHUTDOWN: QueryValue.True,
    } as Env;

    const result = isEmergencyShutdownEnabled(env);
    expect(result).toBe(true);
    if (result !== true) {
      logError('[TEST] Kill-switch check failed', getStackTrace(), { result, expected: true });
    }
    logInfo('[TEST] Kill-switch check validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('isEmergencyShutdownEnabled: returns false when EMERGENCY_SHUTDOWN is not set'), () => {
    const env: Env = {
      ENVIRONMENT: 'development',
    } as Env;

    const result = isEmergencyShutdownEnabled(env);
    expect(result).toBe(false);
    if (result !== false) {
      logError('[TEST] Kill-switch should return false when not set', getStackTrace(), { result, expected: false });
    }
  });

  it(testName('isEmergencyShutdownEnabled: returns false when EMERGENCY_SHUTDOWN is false'), () => {
    const env: Env = {
      ENVIRONMENT: 'development',
      EMERGENCY_SHUTDOWN: QueryValue.False,
    } as Env;

    expect(isEmergencyShutdownEnabled(env)).toBe(false);
  });

  it(testName('isEmergencyShutdownEnabled: returns false when EMERGENCY_SHUTDOWN is empty string'), () => {
    const env: Env = {
      ENVIRONMENT: 'development',
      EMERGENCY_SHUTDOWN: '',
    } as Env;

    expect(isEmergencyShutdownEnabled(env)).toBe(false);
  });

  it(testName('Rule 15.7.9: production ignores X-TestKillSwitch header (auth protection)'), () => {
    const env: Env = {
      ENVIRONMENT: Environment.Production,
      EMERGENCY_SHUTDOWN: undefined,
    } as Env;
    const request = new Request('https://api.test/', {
      method: HttpMethod.Get,
      headers: { [HttpHeader.XTestKillSwitch]: 'true' },
    });
    expect(isEmergencyShutdownEnabled(env, request)).toBe(false);
  });

  it(testName('isEmergencyShutdownEnabled: non-production honors X-TestKillSwitch true'), () => {
    const env: Env = {
      ENVIRONMENT: Environment.Development,
      EMERGENCY_SHUTDOWN: undefined,
    } as Env;
    const request = new Request('https://api.test/', {
      method: HttpMethod.Get,
      headers: { [HttpHeader.XTestKillSwitch]: 'true' },
    });
    expect(isEmergencyShutdownEnabled(env, request)).toBe(true);
  });

  it(testName('isEmergencyShutdownEnabled: non-production honors X-TestKillSwitch false'), () => {
    const env: Env = {
      ENVIRONMENT: Environment.Development,
      EMERGENCY_SHUTDOWN: QueryValue.True,
    } as Env;
    const request = new Request('https://api.test/', {
      method: HttpMethod.Get,
      headers: { [HttpHeader.XTestKillSwitch]: 'false' },
    });
    expect(isEmergencyShutdownEnabled(env, request)).toBe(false);
  });

  it(testName('isStateChangingMethod: returns true for POST method'), () => {
    expect(isStateChangingMethod(HttpMethod.Post)).toBe(true);
  });

  it(testName('isStateChangingMethod: returns true for PUT method'), () => {
    expect(isStateChangingMethod(HttpMethod.Put)).toBe(true);
  });

  it(testName('isStateChangingMethod: returns true for DELETE method'), () => {
    expect(isStateChangingMethod(HttpMethod.Delete)).toBe(true);
  });

  it(testName('isStateChangingMethod: returns false for GET method'), () => {
    expect(isStateChangingMethod(HttpMethod.Get)).toBe(false);
  });

  it(testName('isStateChangingMethod: returns false for OPTIONS method'), () => {
    expect(isStateChangingMethod(HttpMethod.Options)).toBe(false);
  });

  it(testName('createShutdownResponse: returns 503 Service Unavailable response'), async () => {
    const request = new Request('https://api.test/api/credits/user/purchase', {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: 'https://game.ocentra.ca',
      },
    });

    const env: Env = {
      ENVIRONMENT: 'development',
      CORS_ORIGIN: '*',
    } as Env;

    const response = createShutdownResponse(request, env);

    expect(response.status).toBe(HttpStatus.ServiceUnavailable);
    await response.text().catch(() => undefined);
  });

  it(testName('createShutdownResponse: returns JSON error message'), async () => {
    const request = new Request('https://api.test/api/credits/user/purchase', {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: 'https://game.ocentra.ca',
      },
    });

    const env: Env = {
      ENVIRONMENT: 'development',
      CORS_ORIGIN: '*',
    } as Env;

    const response = createShutdownResponse(request, env);
    const data = await response.json() as { error: string; message: string };

    expect(data.error).toBe(ErrorMessage.ServiceUnavailable);
    expect(data.message).toContain('emergency shutdown');
  });

  it(testName('createShutdownResponse: includes CORS headers'), () => {
    const request = new Request('https://api.test/api/credits/user/purchase', {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: 'https://game.ocentra.ca',
      },
    });

    const env: Env = {
      ENVIRONMENT: 'development',
      CORS_ORIGIN: '*',
    } as Env;

    const response = createShutdownResponse(request, env);

    expect(response.headers.get(HttpHeader.ContentType)).toBe(HttpContentType.ApplicationJson);
  });
});
