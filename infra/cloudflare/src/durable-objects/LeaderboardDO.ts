import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { LeaderboardDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { LeaderboardDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
const MAX_ENTRIES = 1000;
const DEFAULT_TOP_LIMIT = 100;
const DEFAULT_NEARBY_WINDOW = 5;

interface LeaderboardEntryStored {
  userId: string;
  displayName: string;
  score: number;
}

interface LeaderboardEntryWithRank extends LeaderboardEntryStored {
  rank: number;
}

export class LeaderboardDO implements DurableObject {
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

      if (request.method === HttpMethod.Get && pathname.endsWith(`/${LeaderboardDOSegment.Top}`)) {
        return this.getTop(url);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${LeaderboardDOSegment.UserRank}`)) {
        return this.getUserRank(url);
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${LeaderboardDOSegment.Nearby}`)) {
        return this.getNearby(url);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${LeaderboardDOSegment.Upsert}`)) {
        return this.upsert(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${LeaderboardDOSegment.Refresh}`)) {
        return this.refresh(request);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('LeaderboardDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getTop(url: URL): Promise<Response> {
    const limit = Math.min(MAX_ENTRIES, Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_TOP_LIMIT), 10) || DEFAULT_TOP_LIMIT));
    const offset = Math.max(0, parseInt(url.searchParams.get('offset') ?? '0', 10) || 0);
    const entries = await this.loadAndSort();
    const total = entries.length;
    const slice = entries.slice(offset, offset + limit);
    const withRank: LeaderboardEntryWithRank[] = slice.map((e, i) => ({ ...e, rank: offset + i + 1 }));
    return this.json({ entries: withRank, total, limit, offset });
  }

  private async getUserRank(url: URL): Promise<Response> {
    const userId = url.searchParams.get('userId') ?? '';
    if (!userId) return this.json({ rank: null });
    const entries = await this.loadAndSort();
    const idx = entries.findIndex((e) => e.userId === userId);
    if (idx === -1) return this.json({ rank: null });
    const entry = entries[idx];
    return this.json({ rank: idx + 1, entry: { ...entry, rank: idx + 1 } });
  }

  private async getNearby(url: URL): Promise<Response> {
    const userId = url.searchParams.get('userId') ?? '';
    const window = Math.min(50, Math.max(1, parseInt(url.searchParams.get('window') ?? String(DEFAULT_NEARBY_WINDOW), 10) || DEFAULT_NEARBY_WINDOW));
    if (!userId) return this.json({ entries: [] });
    const entries = await this.loadAndSort();
    const idx = entries.findIndex((e) => e.userId === userId);
    if (idx === -1) return this.json({ entries: [] });
    const start = Math.max(0, idx - window);
    const end = Math.min(entries.length, idx + window + 1);
    const slice = entries.slice(start, end);
    const withRank: LeaderboardEntryWithRank[] = slice.map((e, i) => ({ ...e, rank: start + i + 1 }));
    return this.json({ entries: withRank, userRank: idx + 1 });
  }

  private async upsert(request: Request): Promise<Response> {
    let body: { userId: string; displayName?: string; score: number };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const userId = body.userId ?? '';
    if (!userId || typeof body.score !== 'number') return this.json({ error: 'userId and score required' }, HttpStatus.BadRequest);
    const entries = await this.loadAndSort();
    const existingIdx = entries.findIndex((e) => e.userId === userId);
    const entry: LeaderboardEntryStored = {
      userId,
      displayName: typeof body.displayName === 'string' ? body.displayName : userId,
      score: body.score,
    };
    if (existingIdx >= 0) {
      entries[existingIdx] = entry;
    } else {
      entries.push(entry);
    }
    entries.sort((a, b) => b.score - a.score);
    const trimmed = entries.slice(0, MAX_ENTRIES);
    await this.ctx.storage.put(LeaderboardDOStoragePrefix.Entries, trimmed);
    return this.json({ ok: true, rank: trimmed.findIndex((e) => e.userId === userId) + 1 });
  }

  private async loadAndSort(): Promise<LeaderboardEntryStored[]> {
    const raw = await this.ctx.storage.get<LeaderboardEntryStored[]>(LeaderboardDOStoragePrefix.Entries);
    const entries = Array.isArray(raw) ? raw : [];
    return [...entries].sort((a, b) => b.score - a.score);
  }

  private async refresh(request: Request): Promise<Response> {
    let body: { entries?: LeaderboardEntryStored[] };
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const entries = Array.isArray(body.entries) ? body.entries : [];
    const valid = entries
      .filter((e) => e && typeof e.userId === 'string' && typeof e.score === 'number')
      .map((e) => ({ userId: e.userId, displayName: typeof e.displayName === 'string' ? e.displayName : e.userId, score: e.score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);
    await this.ctx.storage.put(LeaderboardDOStoragePrefix.Entries, valid);
    return this.json({ ok: true, count: valid.length });
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
