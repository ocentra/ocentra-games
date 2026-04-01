import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { afterAll } from 'vitest';
import { getFirestoreUserUrl } from '@/utils/firebase';
import { buildFullUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const FIREBASE_FIRESTORE_BASE = 'https://firestore.googleapis.com';
const buildExpectedFirestoreUrl = (projectId: string, userId: string) => buildFullUrl(`/v1/projects/${projectId}/databases/(default)/documents/users/${userId}`, { baseUrl: FIREBASE_FIRESTORE_BASE });

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

  it(testName('getFirestoreUserUrl: generates correct Firestore user URL'), () => {
    logInfo('[TEST] Testing getFirestoreUserUrl', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    const projectId = 'test-project';
    const userId = 'user123';
    const result = getFirestoreUserUrl(projectId, userId);
    expect(result).toBe(buildExpectedFirestoreUrl(projectId, userId));
    if (!result.includes(projectId) || !result.includes(userId) || !result.includes('/users/')) {
      logError('[TEST] Firestore user URL generation failed', getStackTrace(), { result, projectId, userId });
    }
    logInfo('[TEST] Firestore user URL validated', getStackTrace(), {}, LOG_TEST_OPERATIONS);
  });

  it(testName('getFirestoreUserUrl: handles different project IDs'), () => {
    const projectId = 'my-project-id';
    const userId = 'user456';
    const result = getFirestoreUserUrl(projectId, userId);
    expect(result).toBe(buildExpectedFirestoreUrl(projectId, userId));
  });

  it(testName('getFirestoreUserUrl: handles different user IDs'), () => {
    const projectId = 'test-project';
    const userId = 'another-user-id';
    const result = getFirestoreUserUrl(projectId, userId);
    expect(result).toBe(buildExpectedFirestoreUrl(projectId, userId));
  });

  it(testName('getFirestoreUserUrl: handles empty user ID'), () => {
    const projectId = 'test-project';
    const userId = '';
    const result = getFirestoreUserUrl(projectId, userId);
    expect(result).toBe(buildExpectedFirestoreUrl(projectId, ''));
  });

  it(testName('getFirestoreUserUrl: includes correct database path'), () => {
    const projectId = 'test-project';
    const userId = 'user123';
    const result = getFirestoreUserUrl(projectId, userId);
    expect(result).toContain('/databases/(default)/documents');
  });

  it(testName('getFirestoreUserUrl: includes users collection path'), () => {
    const projectId = 'test-project';
    const userId = 'user123';
    const result = getFirestoreUserUrl(projectId, userId);
    expect(result).toContain('/users/');
  });
});
