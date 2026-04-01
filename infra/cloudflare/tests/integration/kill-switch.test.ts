import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import {
    buildCreditsApiUrl,
    buildTestApiUrlForEndpointWithPath,
    getValidRequestHeaders,
    generateTestUserId,
} from '@tests/helpers/test-helpers';
import { enableKillSwitch, disableKillSwitch } from '@tests/helpers/kill-switch-helper';
import { CreditAction, Currency } from '@ocentra/endpoint-domain/constants/credits';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    log.logInfo(message, stackTrace, data, enabled);
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

/**
 * Unified Kill-Switch Tests
 * 
 * These tests use dynamic kill-switch state management to test both
 * enabled and disabled states in a single test run.
 * 
 * Run with: npm test -- kill-switch.test.ts
 */
describe(extractName(import.meta.url), TestSuiteType.Integration, { concurrent: false, retry: 0, poolSequential: true }, () => {
    let worker: TestWorker;

    beforeAll(async () => {
        logInfo('[TEST] Initializing worker for kill-switch tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
        try {
            worker = await getTestWorker();
            logInfo('[TEST] Worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
        } catch (error) {
            logError('[TEST] Failed to initialize worker', getStackTrace(), { error });
            throw error;
        }
    }, 30000);

    afterAll(async () => {
        await flushAllBatchesAndTestLogs();
        disableKillSwitch();
    });

    beforeEach(() => {
        disableKillSwitch();
    });

    afterEach(() => {
        disableKillSwitch();
    });

    it(testName('Kill-Switch Disabled: should allow state-changing requests when kill-switch is disabled'), async () => {
            const token = await createToken();
            const userId = generateTestUserId('test-user');
            logInfo('[TEST] Testing POST with kill-switch disabled', getStackTrace(), { endpoint: ApiEndpoint.Credits.Balance('user-id') }, LOG_TEST_OPERATIONS);

            const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
            const response = await worker.fetch(purchaseUrl, {
                method: HttpMethod.Post,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
                body: JSON.stringify({ ac_amount: 100, amount: 1, currency: Currency.USD }),
            }
            , token);

            logInfo('[TEST] Normal POST response (kill-switch disabled)', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
            expect(response.status).not.toBe(HttpStatus.ServiceUnavailable);
            await consumeResponseBody(response);
        });

    it(testName('Kill-Switch Disabled: should allow GET requests when kill-switch is disabled'), async () => {
            const token = await createToken();
            const userId = generateTestUserId('test-user');
            logInfo('[TEST] Testing GET with kill-switch disabled', getStackTrace(), { endpoint: ApiEndpoint.Credits.Balance('user-id') }, LOG_TEST_OPERATIONS);

            const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
            const response = await worker.fetch(balanceUrl, {
                method: HttpMethod.Get,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
            }
            , token);

            logInfo('[TEST] Normal GET response (kill-switch disabled)', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
            expect(response.status).not.toBe(HttpStatus.ServiceUnavailable);
            await consumeResponseBody(response);
        });

    it(testName('Kill-Switch Enabled: should reject POST requests when kill-switch is enabled'), async () => {
            enableKillSwitch();
            const token = await createToken();
            const userId = generateTestUserId('test-user');
            logInfo('[TEST] Testing POST rejection with kill-switch enabled', getStackTrace(), { endpoint: ApiEndpoint.Credits.Balance('user-id') }, LOG_TEST_OPERATIONS);

            const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
            const response = await worker.fetch(purchaseUrl, {
                method: HttpMethod.Post,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
                body: JSON.stringify({ ac_amount: 100, amount: 1, currency: Currency.USD }),
            }
            , token);

            logInfo('[TEST] Kill-switch POST response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
            expect(response.status).toBe(HttpStatus.ServiceUnavailable);
            const data = await response.json() as { error: string; message: string };
            expect(data.error).toBe('Service Unavailable');
            expect(data.message).toContain('emergency shutdown');
        });

    it(testName('Kill-Switch Enabled: should reject PUT requests when kill-switch is enabled'), async () => {
            enableKillSwitch();
            const token = await createToken();
            const userId = generateTestUserId('test-user');
            logInfo('[TEST] Testing PUT rejection with kill-switch enabled', getStackTrace(), { endpoint: ApiEndpoint.Matches.Base }, LOG_TEST_OPERATIONS);

            const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
            const response = await worker.fetch(matchUrl, {
                method: HttpMethod.Put,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
                body: JSON.stringify({ match_id: 'test-match' }),
            }
            , token);

            logInfo('[TEST] Kill-switch PUT response', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
            expect(response.status).toBe(HttpStatus.ServiceUnavailable);
            const data = await response.json() as { error: string };
            expect(data.error).toBe('Service Unavailable');
        });

    it(testName('Kill-Switch Enabled: should reject DELETE requests when kill-switch is enabled'), async () => {
            enableKillSwitch();
            const token = await createToken();
            const userId = generateTestUserId('test-user');
            logInfo('[TEST] Testing DELETE rejection with kill-switch enabled', getStackTrace(), { endpoint: ApiEndpoint.Matches.Base }, LOG_TEST_OPERATIONS);

            const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
            const response = await worker.fetch(matchUrl, {
                method: HttpMethod.Delete,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
            }
            , token);

            logInfo('[TEST] Kill-switch DELETE response', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
            expect(response.status).toBe(HttpStatus.ServiceUnavailable);
            const data = await response.json() as { error: string };
            expect(data.error).toBe('Service Unavailable');
        });

    it(testName('Kill-Switch Enabled: should allow GET requests when kill-switch is enabled'), async () => {
            enableKillSwitch();
            const token = await createToken();
            const userId = generateTestUserId('test-user');
            logInfo('[TEST] Testing GET allowed with kill-switch enabled', getStackTrace(), { endpoint: ApiEndpoint.Credits.Balance('user-id') }, LOG_TEST_OPERATIONS);

            const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
            const response = await worker.fetch(balanceUrl, {
                method: HttpMethod.Get,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
            }
            , token);

            logInfo('[TEST] Kill-switch GET response (should be allowed)', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
            expect(response.status).not.toBe(HttpStatus.ServiceUnavailable);
            await consumeResponseBody(response);
        });

    it(testName('Kill-Switch Enabled: should allow OPTIONS requests when kill-switch is enabled'), async () => {
            enableKillSwitch();
            const token = await createToken();
            const userId = generateTestUserId('test-user');
            logInfo('[TEST] Testing OPTIONS allowed with kill-switch enabled', getStackTrace(), { endpoint: ApiEndpoint.Credits.Balance('user-id') }, LOG_TEST_OPERATIONS);

            const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
            const response = await worker.fetch(purchaseUrl, {
                method: HttpMethod.Options,
                headers: {
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
            }
            , token);

            logInfo('[TEST] Kill-switch OPTIONS response', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
            expect(response.status).toBe(HttpStatus.NoContent);
            expect(response.status).not.toBe(HttpStatus.ServiceUnavailable);
            await consumeResponseBody(response);
        });

    it(testName('Rule 15.7.10: kill-switch rollback - after disable, state-changing requests are allowed again'), async () => {
            const token = await createToken();
            const userId = generateTestUserId('rollback-user');
            enableKillSwitch();
            const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
            const whenEnabled = await worker.fetch(purchaseUrl, {
                method: HttpMethod.Post,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
                body: JSON.stringify({ ac_amount: 100, amount: 1, currency: Currency.USD }),
            }, token);
            expect(whenEnabled.status).toBe(HttpStatus.ServiceUnavailable);
            await consumeResponseBody(whenEnabled);

            disableKillSwitch();
            const whenDisabled = await worker.fetch(purchaseUrl, {
                method: HttpMethod.Post,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
                body: JSON.stringify({ ac_amount: 100, amount: 1, currency: Currency.USD }),
            }, token);
            expect(whenDisabled.status).not.toBe(HttpStatus.ServiceUnavailable);
            await consumeResponseBody(whenDisabled);
        });

    it(testName('Rule 15.7.11: kill-switch abuse prevention - when enabled, state-changing requests get 503 (no bypass)'), async () => {
            enableKillSwitch();
            const token = await createToken();
            const userId = generateTestUserId('abuse-user');
            const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
            const r1 = await worker.fetch(purchaseUrl, {
                method: HttpMethod.Post,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
                body: JSON.stringify({ ac_amount: 100, amount: 1, currency: Currency.USD }),
            }, token);
            const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, 'test-match');
            const r2 = await worker.fetch(matchUrl, {
                method: HttpMethod.Put,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
                body: JSON.stringify({ match_id: 'test-match', version: '1', events: [] }),
            }, token);
            expect(r1.status).toBe(HttpStatus.ServiceUnavailable);
            expect(r2.status).toBe(HttpStatus.ServiceUnavailable);
            await consumeResponseBody(r1);
            await consumeResponseBody(r2);
        });

    it(testName('Rule 15.7.12: kill-switch observability - 503 response has stable JSON shape (error, message)'), async () => {
            enableKillSwitch();
            const token = await createToken();
            const userId = generateTestUserId('obs-user');
            const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
            const response = await worker.fetch(purchaseUrl, {
                method: HttpMethod.Post,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
                body: JSON.stringify({ ac_amount: 100, amount: 1, currency: Currency.USD }),
            }, token);
            expect(response.status).toBe(HttpStatus.ServiceUnavailable);
            const contentType = response.headers.get(HttpHeader.ContentType) ?? '';
            expect(contentType).toContain(HttpContentType.ApplicationJson);
            const data = (await response.json()) as { error?: string; message?: string };
            expect(typeof data.error).toBe('string');
            expect(typeof data.message).toBe('string');
            expect(data.message).toContain('emergency');
            await consumeResponseBody(response);
        });
});
