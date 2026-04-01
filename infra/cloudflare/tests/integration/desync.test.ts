import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { sendRawHttpRequest, buildRawHttpGet } from '@tests/helpers/raw-http-client';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpHeader, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { createAdminToken } from '@tests/helpers/test-helpers';
import { formatBearerToken } from '@/utils/auth';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

const EXPECTED_REJECT_STATUSES = [
  HttpStatus.BadRequest,
  HttpStatus.Unauthorized,
  HttpStatus.Forbidden,
  HttpStatus.MethodNotAllowed,
  HttpStatus.NotImplemented,
];

function buildConflictingRequest(host: string, port: number, matchId: string): Buffer {
  const smuggled = `GET ${ApiEndpoint.Admin.Products} HTTP/1.1\r\nHost: ${host}:${port}\r\nOrigin: ${TestConfig.LocalhostOrigin}\r\n\r\n`;
  const raw = [
    `POST ${ApiEndpoint.Matches.ById(matchId)} HTTP/1.1`,
    `${HttpHeader.Host}: ${host}:${port}`,
    `${HttpHeader.Origin}: ${TestConfig.LocalhostOrigin}`,
    `${HttpHeader.ContentType}: application/json`,
    `${HttpHeader.Authorization}: ${formatBearerToken(createAdminToken())}`,
    `${HttpHeader.ContentLength}: 4`,
    `${HttpHeader.TransferEncoding}: chunked`,
    '',
    `0\r\n\r\n${smuggled}`,
  ].join('\r\n');
  return Buffer.from(raw, 'utf8');
}

describe(extractName(import.meta.url), TestSuiteType.Integration, { runIn: RunIn.Unstable, concurrent: false }, () => {
  let worker: TestWorker;
  let host: string;
  let port: number;

  beforeAll(async () => {
    worker = await getTestWorker();
    const status = worker.getStatus();
    if (!status.httpServer || status.port == null) {
      throw new Error('desync tests require unstable_dev HTTP worker (runIn=unstable).');
    }
    host = 'localhost';
    port = status.port;
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('desync: conflicting Content-Length + Transfer-Encoding request is rejected'), async () => {
    const matchId = TestConfig.TestMatchId;
    const raw = buildConflictingRequest(host, port, matchId);
    const { statusCode } = await sendRawHttpRequest(host, port, raw);
    expect(EXPECTED_REJECT_STATUSES).toContain(statusCode);
  });

  it(testName('desync: malformed request does not poison subsequent parser state'), async () => {
    const matchId = TestConfig.TestMatchId;
    const malformed = buildConflictingRequest(host, port, matchId);
    const malformedResult = await sendRawHttpRequest(host, port, malformed);
    expect(EXPECTED_REJECT_STATUSES).toContain(malformedResult.statusCode);

    const healthRequest = buildRawHttpGet('/health', [
      [HttpHeader.Host, `${host}:${port}`],
      [HttpHeader.Origin, TestConfig.LocalhostOrigin],
    ]);
    const healthResult = await sendRawHttpRequest(host, port, healthRequest);
    expect(healthResult.statusCode).toBe(HttpStatus.Ok);
  });
});
