import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { enableKillSwitch, disableKillSwitch, getKillSwitchState } from '@tests/helpers/kill-switch-helper';
import { getTestHeadersFromGlobal } from '@tests/test-setup-pool';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const LOG_TEST_RESPONSE_DETAILS = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logWarn(message, stackTrace, data, enabled);
};

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

/**
 * Verification Test: Ensures kill-switch tests actually test real behavior
 * 
 * This test verifies that:
 * 1. The helper functions actually set state
 * 2. The header is actually injected
 * 3. The tests would fail if the protection was removed
 */
describe(extractName(import.meta.url), TestSuiteType.Integration, { concurrent: false, poolSequential: true }, () => {
    beforeAll(() => {
      logInfo('[TEST] Kill-switch verification', getStackTrace(), {}, LOG_TEST_OPERATIONS);
      logWarn('[TEST] Verification mode', getStackTrace(), {}, LOG_TEST_RESPONSE_DETAILS);
      logError('[TEST] (no error)', getStackTrace(), {});
    });

    afterAll(async () => {
      await flushAllBatchesAndTestLogs();
    });

    it(testName('should set globalThis state when enableKillSwitch is called'), () => {
        disableKillSwitch();
        expect(getKillSwitchState()).toBe(false);
        
        enableKillSwitch();
        expect(getKillSwitchState()).toBe(true);
        
        disableKillSwitch();
        expect(getKillSwitchState()).toBe(false);
    });

    it(testName('should inject X-Test-Kill-Switch header when state is set'), () => {
        disableKillSwitch();
        let headers = getTestHeadersFromGlobal();
        expect(headers.get('X-Test-Kill-Switch')).toBe('false');
        
        enableKillSwitch();
        headers = getTestHeadersFromGlobal();
        expect(headers.get('X-Test-Kill-Switch')).toBe('true');
        
        disableKillSwitch();
        headers = getTestHeadersFromGlobal();
        expect(headers.get('X-Test-Kill-Switch')).toBe('false');
    });

    it(testName('should not inject header when state is undefined'), () => {
        // Clear state
        (globalThis as { __TEST_KILL_SWITCH_ENABLED?: boolean }).__TEST_KILL_SWITCH_ENABLED = undefined;
        
        const headers = getTestHeadersFromGlobal();
        expect(headers.get('X-Test-Kill-Switch')).toBeNull();
        
        // Restore
        disableKillSwitch();
    });
});
