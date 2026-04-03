import { describe, it, expect, extractName, TestSuiteType, RunIn } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { sendRawHttpRequest, buildRawHttpGet } from '@tests/helpers/raw-http-client';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { HttpHeader, HttpStatus } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';

describe(extractName(import.meta.url), TestSuiteType.Integration, { runIn: RunIn.Unstable, concurrent: false }, () => {
  let worker: TestWorker;
  let host: string;
  let port: number;

  const sendH2cProbe = async (): Promise<{ statusCode: number; raw: string }> => {
    const h2cProbe = buildRawHttpGet(ApiEndpoint.Admin.Products, [
      [HttpHeader.Host, `${host}:${port}`],
      [HttpHeader.Origin, TestConfig.LocalhostOrigin],
      [HttpHeader.Connection, 'Upgrade, HTTP2-Settings'],
      [HttpHeader.Upgrade, 'h2c'],
      [HttpHeader.Http2Settings, 'AAMAAABkAARAAAAAAAIAAAAA'],
    ]);

    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await sendRawHttpRequest(host, port, h2cProbe);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('h2c probe failed');
  };

  beforeAll(async () => {
    worker = await getTestWorker({ DISABLE_AUTH: 'false' });
    const status = worker.getStatus();
    if (!status.httpServer || status.port == null) {
      throw new Error('http2-downgrade tests require unstable_dev HTTP worker (runIn=unstable).');
    }
    host = 'localhost';
    port = status.port;
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  it(testName('http2 downgrade: h2c upgrade attempt is never protocol-switched and still enforces authz'), async () => {
    const probeResult = await sendH2cProbe();
    expect(probeResult.statusCode).not.toBe(HttpStatus.SwitchingProtocols);
    expect([
      HttpStatus.Unauthorized,
      HttpStatus.Forbidden,
      HttpStatus.BadRequest,
      HttpStatus.NotImplemented,
      HttpStatus.MethodNotAllowed,
    ]).toContain(probeResult.statusCode);
  });

});
