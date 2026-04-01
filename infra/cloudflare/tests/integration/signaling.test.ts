import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getTokenForFetch } from '@tests/test-setup-core';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { SignalingDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig } from '@tests/constants/test-constants';
import { Logger, getStackTrace, flushAllBatchesAndTestLogs } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = Logger.instance;
log.register(import.meta.url);

const logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
  log.logError(message, stackTrace, data);
};

const sessionId = 'test-session';
const offerPath = `${ApiEndpoint.Ws.Signaling(sessionId)}/${SignalingDOSegment.Offer}`;
const answerPath = `${ApiEndpoint.Ws.Signaling(sessionId)}/${SignalingDOSegment.Answer}`;
const icePath = `${ApiEndpoint.Ws.Signaling(sessionId)}/${SignalingDOSegment.Ice}`;

describe(extractName(import.meta.url), TestSuiteType.Integration, () => {
  let worker: TestWorker;

  beforeAll(async () => {
    try {
      worker = await getTestWorker();
    } catch (error) {
      logError('Failed to initialize test worker', getStackTrace(), { error });
      throw error;
    }
  }, 30000);

  afterAll(async () => {
    await flushAllBatchesAndTestLogs();
    if (worker.stop) await worker.stop();
  });

  const baseUrl = TestConfig.TestApiUrlPlaceholder;

  it(testName('SignalingDO POST offer without websocket upgrade: returns 426'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(offerPath, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({ sdp: { type: 'offer', sdp: 'v=0' } }),
    }, token);
    expect(response.status).toBe(HttpStatus.UpgradeRequired);
    await response.text().catch(() => undefined);
  });

  it(testName('SignalingDO POST answer without websocket upgrade: returns 426'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(answerPath, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({ sdp: { type: 'answer', sdp: 'v=0' } }),
    }, token);
    expect(response.status).toBe(HttpStatus.UpgradeRequired);
    await response.text().catch(() => undefined);
  });

  it(testName('SignalingDO POST ice without websocket upgrade: returns 426'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(icePath, { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Post,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.ContentType]: String(HttpContentType.ApplicationJson),
      },
      body: JSON.stringify({ candidate: { candidate: '', sdpMid: '0', sdpMLineIndex: 0 } }),
    }, token);
    expect(response.status).toBe(HttpStatus.UpgradeRequired);
    await response.text().catch(() => undefined);
  });

  it(testName('SignalingDO non-upgrade GET path: returns 426'), async () => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Ws.Signaling(sessionId), { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: { [HttpHeader.Origin]: TestConfig.LocalhostOrigin },
    }, token);
    expect(response.status).toBe(HttpStatus.UpgradeRequired);
    await response.text().catch(() => undefined);
  });
});
