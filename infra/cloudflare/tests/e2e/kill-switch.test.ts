import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
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
 * Unified Kill-Switch E2E Tests
 * 
 * These tests use dynamic kill-switch state management to test both
 * enabled and disabled states in a single test run.
 * 
 * Run with: npm test -- kill-switch.test.ts
 */
describe(extractName(import.meta.url), TestSuiteType.E2E, () => {
    let worker: TestWorker;

    beforeAll(async () => {
        logInfo('[TEST] Initializing worker for kill-switch E2E tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
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
        if (worker?.stop) await worker.stop();
    });

    it(testName('Kill-Switch Disabled (Normal Operation): should allow state-changing requests when kill-switch is disabled'), async () => {
        const token = await createToken();
        disableKillSwitch();
            const userId = TestConfig.TestUserId;
            const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
            const response = await worker.fetch(purchaseUrl, {
                method: HttpMethod.Post,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson
                },
                body: JSON.stringify({ ac_amount: 100, amount: 1, currency: Currency.USD }),
            }, token
            );

            logInfo('[TEST] Normal POST response (kill-switch disabled)', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
            expect(response.status).not.toBe(HttpStatus.ServiceUnavailable);
            await consumeResponseBody(response);
        });

    it(testName('Kill-Switch Disabled (Normal Operation): should allow GET requests when kill-switch is disabled'), async () => {
        const token = await createToken();
        disableKillSwitch();
            const userId = TestConfig.TestUserId;
            const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
            const response = await worker.fetch(balanceUrl, {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(userId)
            }, token
            );

            logInfo('[TEST] Normal GET response (kill-switch disabled)', getStackTrace(), { status: response.status }, LOG_TEST_OPERATIONS);
            expect(response.status).not.toBe(HttpStatus.ServiceUnavailable);
            await consumeResponseBody(response);
        });

    it(testName('Kill-Switch Enabled (Emergency Shutdown): should reject POST requests when kill-switch is enabled'), async () => {
        const token = await createToken();
        enableKillSwitch();
        try {
            const userId = TestConfig.TestUserId;
            const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
            const response = await worker.fetch(purchaseUrl, {
                method: HttpMethod.Post,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson
                },
                body: JSON.stringify({ ac_amount: 100, amount: 1, currency: Currency.USD }),
            }, token
            );

            logInfo('[TEST] Kill-switch POST response', getStackTrace(), { status: response.status }, LOG_TEST_RESPONSE_DETAILS);
            expect(response.status).toBe(HttpStatus.ServiceUnavailable);
            const data = await response.json() as { error: string; message: string };
            expect(data.error).toBe('Service Unavailable');
            expect(data.message).toContain('emergency shutdown');
        } finally {
            disableKillSwitch();
        }
    });

    it(testName('Kill-Switch Enabled (Emergency Shutdown): should reject PUT requests when kill-switch is enabled'), async () => {
        const token = await createToken();
        enableKillSwitch();
        try {
            const userId = TestConfig.TestUserId;
            const matchId = TestConfig.TestMatchId;
            const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
            const response = await worker.fetch(matchUrl, {
                method: HttpMethod.Put,
                headers: {
                    ...getValidRequestHeaders(userId),
                    [HttpHeader.ContentType]: HttpContentType.ApplicationJson
                },
                body: JSON.stringify({ match_id: matchId }),
            }, token
            );

            expect(response.status).toBe(HttpStatus.ServiceUnavailable);
            const data = await response.json() as { error: string };
            expect(data.error).toBe('Service Unavailable');
        } finally {
            disableKillSwitch();
        }
    });

    it(testName('Kill-Switch Enabled (Emergency Shutdown): should reject DELETE requests when kill-switch is enabled'), async () => {
        const token = await createToken();
        enableKillSwitch();
        try {
            const userId = TestConfig.TestUserId;
            const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, TestConfig.TestMatchId);
            const response = await worker.fetch(matchUrl, {
                method: HttpMethod.Delete,
                headers: getValidRequestHeaders(userId)
            }, token
            );

            expect(response.status).toBe(HttpStatus.ServiceUnavailable);
            const data = await response.json() as { error: string };
            expect(data.error).toBe('Service Unavailable');
        } finally {
            disableKillSwitch();
        }
    });

    it(testName('Kill-Switch Enabled (Emergency Shutdown): should allow GET requests when kill-switch is enabled'), async () => {
        const token = await createToken();
        enableKillSwitch();
        try {
            const userId = TestConfig.TestUserId;
            const balanceUrl = buildCreditsApiUrl(userId, CreditAction.Balance);
            const response = await worker.fetch(balanceUrl, {
                method: HttpMethod.Get,
                headers: getValidRequestHeaders(userId)
            }, token
            );

            expect(response.status).not.toBe(HttpStatus.ServiceUnavailable);
        } finally {
            disableKillSwitch();
        }
    });

    it(testName('Kill-Switch Enabled (Emergency Shutdown): should allow OPTIONS requests when kill-switch is enabled'), async () => {
        const token = await createToken();
        enableKillSwitch();
        try {
            const userId = generateTestUserId('test-user');
            const purchaseUrl = buildCreditsApiUrl(userId, CreditAction.Purchase);
            const response = await worker.fetch(purchaseUrl, {
                method: HttpMethod.Options,
                headers: {
                    [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
                },
            }, token
            );

            expect(response.status).toBe(HttpStatus.NoContent);
            expect(response.status).not.toBe(HttpStatus.ServiceUnavailable);
            await consumeResponseBody(response);
        } finally {
            disableKillSwitch();
        }
    });
});
