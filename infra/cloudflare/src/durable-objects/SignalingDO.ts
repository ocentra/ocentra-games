import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { SignalingDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const MAX_PEERS = 2;
const MAX_ICE_QUEUE = 64;

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice';
  payload?: unknown;
}

export class SignalingDO implements DurableObject {
  private readonly log = Logger.instance;
  private readonly peers: WebSocket[] = [];
  private pendingOffer: unknown = null;
  private pendingAnswer: unknown = null;
  private readonly iceQueue: unknown[] = [];

  constructor(
    private readonly ctx: DurableObjectState,
    private readonly env: Env
  ) {
    this.log.register(import.meta.url);
  }

  private logInfo = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logInfo(message, stackTrace, data, enabled);
  };

  private logWarn = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logWarn(message, stackTrace, data, enabled);
  };

  private logError = (message: string, stackTrace: StackTrace, data?: unknown) => {
    this.log.logError(message, stackTrace, data);
  };

  private logDebug = (message: string, stackTrace: StackTrace, data?: unknown, enabled: boolean = false) => {
    this.log.logDebug(message, stackTrace, data, enabled);
  };

  async fetch(request: Request): Promise<Response> {
    try {
      if (request.headers.get(HttpHeader.Upgrade) === 'websocket') {
        if (this.peers.length >= MAX_PEERS) {
          return new Response(JSON.stringify({ error: 'Session full' }), {
            status: HttpStatus.ServiceUnavailable,
            headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
          });
        }
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1]);
        this.peers.push(pair[1]);
        this.flushPendingToPeers();
        return new Response(null, { status: 101, webSocket: pair[0] });
      }
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${SignalingDOSegment.Offer}`)) {
        const body = (await request.json().catch(() => ({}))) as { sdp?: unknown };
        this.pendingOffer = body.sdp ?? body;
        this.broadcast({ type: 'offer', payload: this.pendingOffer });
        return this.json({ accepted: true });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${SignalingDOSegment.Answer}`)) {
        const body = (await request.json().catch(() => ({}))) as { sdp?: unknown };
        this.pendingAnswer = body.sdp ?? body;
        this.broadcast({ type: 'answer', payload: this.pendingAnswer });
        return this.json({ accepted: true });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${SignalingDOSegment.Ice}`)) {
        const body = (await request.json().catch(() => ({}))) as { candidate?: unknown };
        const candidate = body.candidate ?? body;
        if (this.iceQueue.length < MAX_ICE_QUEUE) this.iceQueue.push(candidate);
        this.broadcast({ type: 'ice', payload: candidate });
        return this.json({ accepted: true });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('SignalingDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    const raw = typeof message === 'string' ? message : new TextDecoder().decode(message);
    try {
      const msg = JSON.parse(raw) as SignalingMessage;
      if (msg.type === 'offer') this.pendingOffer = msg.payload ?? null;
      if (msg.type === 'answer') this.pendingAnswer = msg.payload ?? null;
      if (msg.type === 'ice' && msg.payload != null && this.iceQueue.length < MAX_ICE_QUEUE) {
        this.iceQueue.push(msg.payload);
      }
    } catch {
      //
    }
    this.broadcastToOthers(ws, raw);
  }

  webSocketClose(ws: WebSocket): void {
    const i = this.peers.indexOf(ws);
    if (i !== -1) this.peers.splice(i, 1);
  }

  webSocketError(ws: WebSocket): void {
    const i = this.peers.indexOf(ws);
    if (i !== -1) this.peers.splice(i, 1);
  }

  private broadcast(msg: SignalingMessage): void {
    const raw = JSON.stringify(msg);
    for (const peer of this.peers) {
      try {
        if (peer.readyState === WebSocket.OPEN) peer.send(raw);
      } catch {
        //
      }
    }
  }

  private broadcastToOthers(sender: WebSocket, raw: string): void {
    for (const peer of this.peers) {
      if (peer !== sender && peer.readyState === WebSocket.OPEN) {
        try {
          peer.send(raw);
        } catch {
          //
        }
      }
    }
  }

  private flushPendingToPeers(): void {
    if (this.pendingOffer != null) {
      this.broadcast({ type: 'offer', payload: this.pendingOffer });
    }
    if (this.pendingAnswer != null) {
      this.broadcast({ type: 'answer', payload: this.pendingAnswer });
    }
    for (const candidate of this.iceQueue) {
      this.broadcast({ type: 'ice', payload: candidate });
    }
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
