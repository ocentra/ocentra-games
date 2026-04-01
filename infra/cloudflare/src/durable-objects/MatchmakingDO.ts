import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { MatchmakingDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { MatchmakingDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

const QUEUE_TICKET_TIMEOUT_MS = 300_000;
const DEFAULT_REGION = 'default';

function writeMatchmakingAnalytics(
  env: Env,
  event: 'queue_join' | 'match' | 'timeout',
  queueDepth: number,
  waitTimeMs: number,
  region: string = DEFAULT_REGION
): void {
  if (!env.ANALYTICS) return;
  try {
    env.ANALYTICS.writeDataPoint({
      blobs: [event, region],
      doubles: [queueDepth, waitTimeMs, Date.now()],
      indexes: [region],
    });
  } catch {
    //
  }
}
const QUEUE_EXPANSION_STEPS = [
  { waitSeconds: 0, eloTolerance: 100 },
  { waitSeconds: 15, eloTolerance: 150 },
  { waitSeconds: 30, eloTolerance: 200 },
  { waitSeconds: 60, eloTolerance: 300 },
] as const;
import { DefaultGameType } from '@ocentra/endpoint-domain/constants/game';

interface QueuedEntry {
  ticketId: string;
  userId: string;
  displayName: string;
  elo: number;
  gameType: string;
  queuedAt: number;
  queueExpiresAt: number;
}

function getEloTolerance(queuedAt: number): number {
  const waitSeconds = (Date.now() - queuedAt) / 1000;
  for (let i = QUEUE_EXPANSION_STEPS.length - 1; i >= 0; i--) {
    if (waitSeconds >= QUEUE_EXPANSION_STEPS[i].waitSeconds) return QUEUE_EXPANSION_STEPS[i].eloTolerance;
  }
  return QUEUE_EXPANSION_STEPS[0].eloTolerance;
}

export class MatchmakingDO implements DurableObject {
  private readonly log = Logger.instance;

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
      const url = new URL(request.url, 'http://dummy');
      const pathname = url.pathname;

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${MatchmakingDOSegment.Queue}`)) {
        return this.joinQueue(request);
      }
      if ((request.method === HttpMethod.Post || request.method === HttpMethod.Delete) && pathname.endsWith(`/${MatchmakingDOSegment.Leave}`)) {
        return this.leaveQueue(request);
      }
      if (request.method === HttpMethod.Delete && pathname.endsWith(`/${MatchmakingDOSegment.Queue}`)) {
        return this.leaveQueue(request);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${MatchmakingDOSegment.Status}`)) {
        return this.getStatus(request);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('MatchmakingDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async joinQueue(request: Request): Promise<Response> {
    let body: { userId: string; displayName?: string; elo?: number; gameType?: string };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const userId = body.userId ?? '';
    if (!userId) return this.json({ error: 'userId required' }, HttpStatus.BadRequest);
    const queue = (await this.ctx.storage.get<QueuedEntry[]>(MatchmakingDOStoragePrefix.Queue)) ?? [];
    const existing = queue.find((e) => e.userId === userId);
    if (existing) return this.json({ error: 'Already in queue', ticketId: existing.ticketId, position: queue.indexOf(existing) + 1 }, HttpStatus.Conflict);
    const now = Date.now();
    const ticketId = crypto.randomUUID();
    const elo = typeof body.elo === 'number' && body.elo >= 0 ? body.elo : 1500;
    const gameType = typeof body.gameType === 'string' && body.gameType.length > 0 ? body.gameType : DefaultGameType.Hearts;
    const entry: QueuedEntry = {
      ticketId,
      userId,
      displayName: typeof body.displayName === 'string' ? body.displayName : userId,
      elo,
      gameType,
      queuedAt: now,
      queueExpiresAt: now + QUEUE_TICKET_TIMEOUT_MS,
    };
    queue.push(entry);
    const match = await this.tryMatch(queue);
    if (match) {
      await this.ctx.storage.put(MatchmakingDOStoragePrefix.Queue, match.remaining);
      const waitTimeMs = now - match.firstMatchedQueuedAt;
      writeMatchmakingAnalytics(this.env, 'match', match.remaining.length, waitTimeMs);
      return this.json({
        ticketId,
        position: 1,
        status: 'matched',
        matchId: match.matchId,
        opponent: match.opponent,
      });
    }
    await this.ctx.storage.put(MatchmakingDOStoragePrefix.Queue, queue);
    this.scheduleNextAlarm().catch(() => {});
    writeMatchmakingAnalytics(this.env, 'queue_join', queue.length, 0);
    const position = queue.findIndex((e) => e.ticketId === ticketId) + 1;
    return this.json({ ticketId, position, status: 'queued' });
  }

  private async leaveQueue(request: Request): Promise<Response> {
    const url = new URL(request.url, 'http://dummy');
    let body: { userId?: string; ticketId?: string } = {};
    if (request.method === HttpMethod.Delete) {
      body = { userId: url.searchParams.get('userId') ?? undefined, ticketId: url.searchParams.get('ticketId') ?? undefined };
    } else {
      try {
        const ct = request.headers.get(HttpHeader.ContentType);
        if (ct?.includes(HttpContentType.ApplicationJson) && request.method === HttpMethod.Post) {
          const raw = await request.text();
          if (raw) body = JSON.parse(raw) as { userId?: string; ticketId?: string };
        }
      } catch {
        return this.json({ left: true });
      }
    }
    const queue = (await this.ctx.storage.get<QueuedEntry[]>(MatchmakingDOStoragePrefix.Queue)) ?? [];
    const filtered = queue.filter((e) => {
      if (body.userId && e.userId === body.userId) return false;
      if (body.ticketId && e.ticketId === body.ticketId) return false;
      if (e.queueExpiresAt < Date.now()) return false;
      return true;
    });
    await this.ctx.storage.put(MatchmakingDOStoragePrefix.Queue, filtered);
    this.scheduleNextAlarm().catch(() => {});
    return this.json({ left: true });
  }

  async alarm(): Promise<void> {
    const queue = (await this.ctx.storage.get<QueuedEntry[]>(MatchmakingDOStoragePrefix.Queue)) ?? [];
    const now = Date.now();
    const valid = queue.filter((e) => e.queueExpiresAt > now);
    const removed = queue.filter((e) => e.queueExpiresAt <= now);
    if (removed.length > 0) {
      for (const e of removed) {
        await this.ctx.storage.put(`${MatchmakingDOStoragePrefix.Timeout}${e.userId}`, now);
      }
      await this.ctx.storage.put(MatchmakingDOStoragePrefix.Queue, valid);
      writeMatchmakingAnalytics(this.env, 'timeout', valid.length, 0, DEFAULT_REGION);
    }
    await this.scheduleNextAlarm();
  }

  private async scheduleNextAlarm(): Promise<void> {
    const queue = (await this.ctx.storage.get<QueuedEntry[]>(MatchmakingDOStoragePrefix.Queue)) ?? [];
    const now = Date.now();
    const nextExpiry = queue
      .filter((e) => e.queueExpiresAt > now)
      .reduce((min, e) => (e.queueExpiresAt < min ? e.queueExpiresAt : min), Number.POSITIVE_INFINITY);
    if (nextExpiry !== Number.POSITIVE_INFINITY) {
      await this.ctx.storage.setAlarm(nextExpiry + 1000);
    }
  }

  private async getStatus(request: Request): Promise<Response> {
    const url = new URL(request.url, 'http://dummy');
    const ticketId = url.searchParams.get('ticketId');
    const userId = url.searchParams.get('userId');
    const queue = (await this.ctx.storage.get<QueuedEntry[]>(MatchmakingDOStoragePrefix.Queue)) ?? [];
    const valid = queue.filter((e) => e.queueExpiresAt >= Date.now());
    if (valid.length !== queue.length) await this.ctx.storage.put(MatchmakingDOStoragePrefix.Queue, valid);
    const entry = valid.find((e) => e.ticketId === ticketId || e.userId === userId);
    if (!entry) {
      if (userId) {
        const timeoutKey = `${MatchmakingDOStoragePrefix.Timeout}${userId}`;
        const timeoutAt = await this.ctx.storage.get<number>(timeoutKey);
        if (timeoutAt !== undefined) {
          await this.ctx.storage.delete(timeoutKey);
          return this.json({ status: 'idle', position: 0, lastEvent: 'queue-timeout' });
        }
      }
      return this.json({ status: 'idle', position: 0 });
    }
    const position = valid.findIndex((e) => e.ticketId === entry.ticketId) + 1;
    return this.json({ status: 'queued', ticketId: entry.ticketId, position, gameType: entry.gameType });
  }

  private tryMatch(queue: QueuedEntry[]): { matchId: string; opponent: { userId: string; displayName: string; elo: number }; remaining: QueuedEntry[]; firstMatchedQueuedAt: number } | null {
    const now = Date.now();
    const valid = queue.filter((e) => e.queueExpiresAt >= now);
    if (valid.length < 2) return null;
    for (let i = 0; i < valid.length; i++) {
      const a = valid[i];
      const tolerance = getEloTolerance(a.queuedAt);
      for (let j = i + 1; j < valid.length; j++) {
        const b = valid[j];
        if (a.gameType !== b.gameType) continue;
        if (Math.abs(a.elo - b.elo) <= tolerance) {
          const matchId = crypto.randomUUID();
          const remaining = valid.filter((_, idx) => idx !== i && idx !== j);
          return {
            matchId,
            opponent: { userId: b.userId, displayName: b.displayName, elo: b.elo },
            remaining,
            firstMatchedQueuedAt: a.queuedAt,
          };
        }
      }
    }
    return null;
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
