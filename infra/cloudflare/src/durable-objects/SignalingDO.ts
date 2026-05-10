import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { SignalingDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const MAX_PEERS = 2;
const MAX_ICE_QUEUE = 64;

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice' | 'ice-candidate';
  from?: string;
  to?: string;
  payload?: unknown;
  sdp?: unknown;
  candidate?: unknown;
}

export class SignalingDO implements DurableObject {
  private readonly log = Logger.instance;
  private readonly peers: WebSocket[] = [];
  private pendingOffer: SignalingMessage | null = null;
  private pendingAnswer: SignalingMessage | null = null;
  private readonly iceQueue: SignalingMessage[] = [];

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
      const upgradeHeader = request.headers.get(HttpHeader.Upgrade);
      if (upgradeHeader && upgradeHeader.toLowerCase() === 'websocket') {
        if (this.peers.length >= MAX_PEERS) {
          this.logWarn('Refusing connection: Signaling session full', getStackTrace(), {
            sessionId: this.ctx.id.toString(),
            peers: this.peers.length
          });
          return new Response('Session Full', { status: HttpStatus.ServiceUnavailable });
        }
        const pair = new WebSocketPair();
        this.ctx.acceptWebSocket(pair[1]);
        this.peers.push(pair[1]);
        this.flushPendingToPeer(pair[1]);
        this.logInfo('Accepting WebSocket connection', getStackTrace(), {
          sessionId: this.ctx.id.toString(),
          peerCount: this.peers.length
        });
        return new Response(null, { status: HttpStatus.SwitchingProtocols, webSocket: pair[0] });
      }
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${SignalingDOSegment.Offer}`)) {
        const body = (await request.json().catch(() => ({}))) as { sdp?: unknown };
        this.pendingOffer = { type: 'offer', payload: body.sdp ?? body };
        this.broadcast(this.pendingOffer);
        return this.json({ accepted: true });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${SignalingDOSegment.Answer}`)) {
        const body = (await request.json().catch(() => ({}))) as { sdp?: unknown };
        this.pendingAnswer = { type: 'answer', payload: body.sdp ?? body };
        this.broadcast(this.pendingAnswer);
        return this.json({ accepted: true });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${SignalingDOSegment.Ice}`)) {
        const body = (await request.json().catch(() => ({}))) as { candidate?: unknown };
        const candidate = body.candidate ?? body;
        const message: SignalingMessage = { type: 'ice', payload: candidate };
        if (this.iceQueue.length < MAX_ICE_QUEUE) this.iceQueue.push(message);
        this.broadcast(message);
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
    let parsed: SignalingMessage;
    try {
      parsed = JSON.parse(raw) as SignalingMessage;
    } catch {
      this.logWarn('Dropping malformed signaling message', getStackTrace(), {
        sessionId: this.ctx.id.toString()
      });
      return;
    }
    if (!this.isValidSignal(parsed)) {
      this.logWarn('Dropping unsupported signaling message', getStackTrace(), {
        sessionId: this.ctx.id.toString(),
        type: typeof parsed?.type === 'string' ? parsed.type : undefined
      });
      return;
    }
    if (parsed.type === 'offer') this.pendingOffer = parsed;
    if (parsed.type === 'answer') this.pendingAnswer = parsed;
    if ((parsed.type === 'ice' || parsed.type === 'ice-candidate') && this.iceQueue.length < MAX_ICE_QUEUE) {
      this.iceQueue.push(parsed);
    }
    this.broadcastToOthers(ws, JSON.stringify(parsed));
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
        this.sendIfOpen(peer, raw);
      } catch {
        //
      }
    }
  }

  private broadcastToOthers(sender: WebSocket, raw: string): void {
    for (const peer of this.peers) {
      if (peer !== sender && peer.readyState === WebSocket.OPEN) {
        try {
          this.sendIfOpen(peer, raw);
        } catch {
          //
        }
      }
    }
  }

  private flushPendingToPeer(peer: WebSocket): void {
    if (this.pendingOffer != null) this.sendIfOpen(peer, JSON.stringify(this.pendingOffer));
    if (this.pendingAnswer != null) this.sendIfOpen(peer, JSON.stringify(this.pendingAnswer));
    for (const candidate of this.iceQueue) {
      this.sendIfOpen(peer, JSON.stringify(candidate));
    }
  }

  private sendIfOpen(peer: WebSocket, raw: string): void {
    if (peer.readyState === WebSocket.OPEN) peer.send(raw);
  }

  private isValidSignal(message: SignalingMessage): boolean {
    if (!message || typeof message !== 'object') return false;
    if (message.type === 'offer') return message.payload != null || message.sdp != null;
    if (message.type === 'answer') return message.payload != null || message.sdp != null;
    if (message.type === 'ice' || message.type === 'ice-candidate') return message.payload != null || message.candidate != null;
    return false;
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
