/**
 * WebSocket Security Tests - Pure Rejection Tests Only
 *
 * This file contains ONLY tests that verify rejection behavior without creating WebSocket connections.
 * All tests that might create WebSocket connections are in websocket-isolated-storage.test.ts
 * (which runs with isolatedStorage: false to avoid cleanup issues).
 *
 * See: docs/WEBSOCKET-ISOLATED-STORAGE-CLEANUP-ISSUE.md
 */
import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { buildTestApiUrlForEndpointWithPath, generateTestUserId, getValidRequestHeaders, generateTestMatchId } from '@tests/helpers/test-helpers';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpStatus, HttpHeader, WebSocketProtocol, ConnectionValue } from '@ocentra/endpoint-domain/constants/http';
import { ErrorMessage } from '@ocentra/endpoint-domain/constants/errors';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const LOG_TEST_OPERATIONS = false;
const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
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
          // Ignore - all consumption methods failed, response may be aborted/invalid
        }
      }
    }
  }
}

async function cleanupResponse(response: Response): Promise<void> {
  await consumeResponseBody(response);
}

describe(extractName(import.meta.url), TestSuiteType.Websocket, { runIn: RunIn.Unstable, concurrent: false }, () => {
  let worker: TestWorker;
  const testMatchId = generateTestMatchId('test-match-ws');

  beforeAll(async () => {
    logInfo('[TEST] Initializing test worker for WebSocket security tests', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    try {
      worker = await getTestWorker();
      logInfo('[TEST] Test worker initialized', getStackTrace(), {}, LOG_TEST_OPERATIONS);
    } catch (error) {
      log.logError('[TEST] Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('Connection Header Validation: should reject WebSocket upgrade request without Connection header'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, testMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      expect(response.webSocket).toBeFalsy();
      const body = await response.json() as { error?: string; message?: string };
      expect(body.error).toBe(ErrorMessage.BadRequest);
      expect(body.message).toContain('Connection: Upgrade header is required');
      await cleanupResponse(response);
    });

  it(testName('Connection Header Validation: should reject WebSocket upgrade request with Connection header missing Upgrade value'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchId = generateTestMatchId('connection-no-upgrade');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, matchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.KeepAlive,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect(response.status).toBe(HttpStatus.BadRequest);
      expect(response.webSocket).toBeFalsy();
      const body = await response.json() as { error?: string; message?: string };
      expect(body.error).toBe(ErrorMessage.BadRequest);
      expect(body.message).toContain('Connection header must include "Upgrade"');
      await cleanupResponse(response);
    });

  it(testName('Match ID Validation: should reject WebSocket upgrade request with empty match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, '');
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect([HttpStatus.BadRequest, HttpStatus.NotFound]).toContain(response.status);
      expect(response.webSocket).toBeFalsy();
      await cleanupResponse(response);
    });

  it(testName('Match ID Validation: should reject WebSocket upgrade request with double-encoded match ID'), async () => {
      const token = await createToken();
      const userId = generateTestUserId('test-user');
      const maliciousMatchId = encodeURIComponent(encodeURIComponent('../other-match'));
      const matchUrl = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Matches.Base, maliciousMatchId);
      
      const response = await worker.fetch(matchUrl, {
        headers: {
          ...getValidRequestHeaders(userId),
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin
        }
      }, token);

      expect([HttpStatus.BadRequest, HttpStatus.Forbidden, HttpStatus.NotFound]).toContain(response.status);
      expect(response.webSocket).toBeFalsy();
      await cleanupResponse(response);
    });

});
