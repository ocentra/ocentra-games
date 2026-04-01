import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { createToken } from '@tests/test-context';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { sendRawHttpRequest, buildRawHttpGet } from '@tests/helpers/raw-http-client';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpAuthScheme, HttpHeader, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
  log.logInfo(message, stackTrace, data, enabled);
};

const MATCH_PATH = `${ApiEndpoint.Matches.Base}/${TestConfig.TestMatchId}`;
const EXPECTED_REJECT_STATUSES = [HttpStatus.BadRequest, HttpStatus.Unauthorized, HttpStatus.Forbidden];

describe(extractName(import.meta.url), TestSuiteType.Integration, { runIn: RunIn.Unstable, concurrent: false }, () => {
  let worker: TestWorker;
  let host: string;
  let port: number;
  const walletId = `test-wallet-raw-${Date.now()}`;

  beforeAll(async () => {
    logInfo('[TEST] Initializing worker for header-injection-raw tests', getStackTrace(), {}, false);
    worker = await getTestWorker();
    const status = worker.getStatus();
    if (!status.httpServer || status.port == null) {
      throw new Error(
        'header-injection-raw tests require worker exposed over HTTP (unstable_dev). ' +
          'Run with integration threads config (Phase C).'
      );
    }
    host = 'localhost';
    port = status.port;
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('CRLF in Authorization (raw TCP): should reject CRLF injection in Authorization header'), async () => {
    const token = await createToken();
    const maliciousAuth = Buffer.from(
      `${HttpAuthScheme.Bearer} ${token}\r\nX-Admin: true\r\nX-Forwarded-For: 127.0.0.1`,
      'utf8'
    );
    const request = buildRawHttpGet(MATCH_PATH, [
      [HttpHeader.Host, `${host}:${port}`],
      [HttpHeader.Authorization, maliciousAuth],
      [HttpHeader.Origin, TestConfig.LocalhostOrigin],
    ]);
    const { statusCode } = await sendRawHttpRequest(host, port, request);
    expect(EXPECTED_REJECT_STATUSES).toContain(statusCode);
  });

  it(testName('CRLF in X-Wallet-Id (raw TCP): should reject CRLF injection in X-Wallet-Id header'), async () => {
    const maliciousWalletId = Buffer.from(
      `${walletId}\r\nX-Admin: true\r\nX-Forwarded-For: 127.0.0.1`,
      'utf8'
    );
    const request = buildRawHttpGet(MATCH_PATH, [
      [HttpHeader.Host, `${host}:${port}`],
      [HttpHeader.XWalletId, maliciousWalletId],
      [HttpHeader.Origin, TestConfig.LocalhostOrigin],
    ]);
    const { statusCode } = await sendRawHttpRequest(host, port, request);
    expect(EXPECTED_REJECT_STATUSES).toContain(statusCode);
  });

  it(testName('CRLF in Origin (raw TCP): should reject CRLF injection in Origin header'), async () => {
    const token = await createToken();
    const maliciousOrigin = Buffer.from(
      `${TestConfig.LocalhostOrigin}\r\nAccess-Control-Allow-Origin: *\r\nX-Admin: true`,
      'utf8'
    );
    const request = buildRawHttpGet(MATCH_PATH, [
      [HttpHeader.Host, `${host}:${port}`],
      [HttpHeader.Origin, maliciousOrigin],
      [HttpHeader.XWalletId, walletId],
      [HttpHeader.Authorization, `${HttpAuthScheme.Bearer} ${token}`],
    ]);
    try {
      const { statusCode } = await sendRawHttpRequest(host, port, request);
      expect(EXPECTED_REJECT_STATUSES).toContain(statusCode);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      expect(msg).toMatch(/timed out|timeout/i);
    }
  });

  it(testName('Null byte in Authorization (raw TCP): should reject null byte in Authorization header'), async () => {
    const token = await createToken();
    const maliciousAuth = Buffer.from(
      `${HttpAuthScheme.Bearer} ${token}\0X-Admin: true`,
      'utf8'
    );
    const request = buildRawHttpGet(MATCH_PATH, [
      [HttpHeader.Host, `${host}:${port}`],
      [HttpHeader.Authorization, maliciousAuth],
      [HttpHeader.Origin, TestConfig.LocalhostOrigin],
    ]);
    const { statusCode } = await sendRawHttpRequest(host, port, request);
    expect(EXPECTED_REJECT_STATUSES).toContain(statusCode);
  });

  it(testName('Null byte in X-Wallet-Id (raw TCP): should reject null byte in X-Wallet-Id header'), async () => {
    const maliciousWalletId = Buffer.from(`${walletId}\0X-Admin: true`, 'utf8');
    const request = buildRawHttpGet(MATCH_PATH, [
      [HttpHeader.Host, `${host}:${port}`],
      [HttpHeader.XWalletId, maliciousWalletId],
      [HttpHeader.Origin, TestConfig.LocalhostOrigin],
    ]);
    const { statusCode } = await sendRawHttpRequest(host, port, request);
    expect(EXPECTED_REJECT_STATUSES).toContain(statusCode);
  });
});
