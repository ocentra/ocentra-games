import { describe, it, expect, extractName, TestSuiteType } from '@tests/helpers/test-utils';
import { testName } from '@tests/helpers/test-name';
import { beforeAll, afterAll } from 'vitest';
import { getTestWorker, type TestWorker } from '@tests/helpers/worker-helper';
import { getTokenForFetch } from '@tests/test-setup-core';
import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { SignalingDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod, HttpStatus, HttpHeader, HttpContentType, WebSocketProtocol, ConnectionValue, WebSocketCloseCode } from '@ocentra/endpoint-domain/constants/http';
import { TestConfig, TestTimeout, TestValues } from '@tests/constants/test-constants';
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

type SignalPayload = {
  type?: string;
  from?: string;
  to?: string;
  payload?: unknown;
  sdp?: unknown;
  candidate?: unknown;
};

async function waitForSignalMessage(
  ws: WebSocket,
  type: string,
  timeoutMs = TestTimeout.WebSocketMessage
): Promise<SignalPayload> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const remaining = Math.max(1, deadline - Date.now());
    const payload = await new Promise<SignalPayload>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for WebSocket message')), remaining);
      const onMessage = (event: MessageEvent) => {
        clearTimeout(timer);
        ws.removeEventListener('message', onMessage as EventListener);
        try {
          resolve(JSON.parse(String(event.data)) as SignalPayload);
        } catch (error) {
          reject(error);
        }
      };
      ws.addEventListener('message', onMessage as EventListener);
    });

    if (payload.type === type) return payload;
  }
  throw new Error(`Timed out waiting for signaling message type=${type}`);
}

async function expectNoSignalMessage(ws: WebSocket, timeoutMs = 150): Promise<void> {
  await expect(new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      ws.removeEventListener('message', onMessage as EventListener);
      resolve();
    }, timeoutMs);
    const onMessage = (event: MessageEvent) => {
      clearTimeout(timer);
      reject(new Error(`Unexpected signaling message: ${String(event.data)}`));
    };
    ws.addEventListener('message', onMessage as EventListener);
  })).resolves.toBeUndefined();
}

async function closeSocket(ws: WebSocket): Promise<void> {
  try {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close(WebSocketCloseCode.NormalClosure, TestValues.WebSocketCloseReasonDone);
    }
  } catch {
    void 0;
  }
  await new Promise(resolve => setTimeout(resolve, 50));
}

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

  const openSignalingSocket = async (socketSessionId: string): Promise<WebSocket> => {
    const token = getTokenForFetch();
    const url = buildApiUrl(ApiEndpoint.Ws.Signaling(socketSessionId), { baseUrl });
    const response = await worker.fetch(url, {
      method: HttpMethod.Get,
      headers: {
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
        [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
        [HttpHeader.Connection]: ConnectionValue.Upgrade,
      },
    }, token);
    expect(response.status).toBe(HttpStatus.SwitchingProtocols);
    expect(response.webSocket).toBeTruthy();
    const ws = response.webSocket!;
    ws.accept();
    return ws;
  };

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

  it(testName('SignalingDO websocket: relays offer answer and ICE between peers'), async () => {
    const socketSessionId = `signal-relay-${crypto.randomUUID()}`;
    const alice = await openSignalingSocket(socketSessionId);
    const bob = await openSignalingSocket(socketSessionId);
    try {
      alice.send(JSON.stringify({
        type: 'offer',
        from: 'alice',
        to: 'bob',
        sdp: { type: 'offer', sdp: 'v=0 relay offer' },
      }));
      const offer = await waitForSignalMessage(bob, 'offer');
      expect(offer.from).toBe('alice');
      expect(offer.to).toBe('bob');
      expect(offer.sdp).toMatchObject({ type: 'offer' });

      bob.send(JSON.stringify({
        type: 'answer',
        from: 'bob',
        to: 'alice',
        sdp: { type: 'answer', sdp: 'v=0 relay answer' },
      }));
      const answer = await waitForSignalMessage(alice, 'answer');
      expect(answer.from).toBe('bob');
      expect(answer.to).toBe('alice');
      expect(answer.sdp).toMatchObject({ type: 'answer' });

      alice.send(JSON.stringify({
        type: 'ice-candidate',
        from: 'alice',
        to: 'bob',
        candidate: { candidate: 'candidate:1', sdpMid: '0', sdpMLineIndex: 0 },
      }));
      const ice = await waitForSignalMessage(bob, 'ice-candidate');
      expect(ice.candidate).toMatchObject({ candidate: 'candidate:1' });
    } finally {
      await closeSocket(alice);
      await closeSocket(bob);
    }
  });

  it(testName('SignalingDO websocket: replays pending offer and ICE only to late peer'), async () => {
    const socketSessionId = `signal-replay-${crypto.randomUUID()}`;
    const alice = await openSignalingSocket(socketSessionId);
    try {
      alice.send(JSON.stringify({
        type: 'offer',
        from: 'alice',
        to: 'bob',
        sdp: { type: 'offer', sdp: 'v=0 pending offer' },
      }));
      alice.send(JSON.stringify({
        type: 'ice-candidate',
        from: 'alice',
        to: 'bob',
        candidate: { candidate: 'candidate:late', sdpMid: '0', sdpMLineIndex: 0 },
      }));
      await expectNoSignalMessage(alice);

      const bob = await openSignalingSocket(socketSessionId);
      try {
        const offer = await waitForSignalMessage(bob, 'offer');
        const ice = await waitForSignalMessage(bob, 'ice-candidate');
        expect(offer.sdp).toMatchObject({ sdp: 'v=0 pending offer' });
        expect(ice.candidate).toMatchObject({ candidate: 'candidate:late' });
        await expectNoSignalMessage(alice);
      } finally {
        await closeSocket(bob);
      }
    } finally {
      await closeSocket(alice);
    }
  });

  it(testName('SignalingDO websocket: rejects a third peer for one WebRTC pair session'), async () => {
    const socketSessionId = `signal-capacity-${crypto.randomUUID()}`;
    const alice = await openSignalingSocket(socketSessionId);
    const bob = await openSignalingSocket(socketSessionId);
    try {
      const token = getTokenForFetch();
      const response = await worker.fetch(buildApiUrl(ApiEndpoint.Ws.Signaling(socketSessionId), { baseUrl }), {
        method: HttpMethod.Get,
        headers: {
          [HttpHeader.Origin]: TestConfig.LocalhostOrigin,
          [HttpHeader.Upgrade]: WebSocketProtocol.WebSocket,
          [HttpHeader.Connection]: ConnectionValue.Upgrade,
        },
      }, token);
      expect(response.status).toBe(HttpStatus.ServiceUnavailable);
      expect(response.webSocket).toBeFalsy();
      await response.text().catch(() => undefined);
    } finally {
      await closeSocket(alice);
      await closeSocket(bob);
    }
  });
});
