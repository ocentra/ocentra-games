import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { ActivityFeedDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

import { FeedType } from '@ocentra/endpoint-domain/constants/game';
import { ActivityFeedDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
const MAX_ITEMS = 500;

interface FeedItem {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export class ActivityFeedDO implements DurableObject {
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

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${ActivityFeedDOSegment.Append}`)) {
        const body = (await request.json().catch(() => ({}))) as { type?: string; payload?: Record<string, unknown> };
        const result = await this.append(body.type ?? FeedType.Activity, body.payload ?? {});
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ appended: true, id: result.id });
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${ActivityFeedDOSegment.List}`)) {
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
        const before = url.searchParams.get('before') ?? undefined;
        const result = await this.list(limit, before);
        return this.json({ items: result.items, nextCursor: result.nextCursor });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('ActivityFeedDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getItems(): Promise<FeedItem[]> {
    const stored = await this.ctx.storage.get<FeedItem[]>(ActivityFeedDOStoragePrefix.Items);
    return stored ?? [];
  }

  private async append(
    type: string,
    payload: Record<string, unknown>
  ): Promise<{ error?: string; status?: number; id?: string }> {
    const items = await this.getItems();
    const item: FeedItem = {
      id: crypto.randomUUID(),
      type: type.slice(0, 64),
      payload: typeof payload === 'object' && payload !== null ? payload : {},
      timestamp: Date.now(),
    };
    items.push(item);
    if (items.length > MAX_ITEMS) items.splice(0, items.length - MAX_ITEMS);
    await this.ctx.storage.put(ActivityFeedDOStoragePrefix.Items, items);
    return { id: item.id };
  }

  private async list(
    limit: number,
    before?: string
  ): Promise<{ items: FeedItem[]; nextCursor?: string }> {
    const items = await this.getItems();
    let start = items.length;
    if (before) {
      const idx = items.findIndex((i) => i.id === before);
      if (idx !== -1) start = idx;
    }
    const slice = items.slice(Math.max(0, start - limit), start).reverse();
    const nextCursor = start - limit > 0 ? items[start - limit - 1]?.id : undefined;
    return { items: slice, nextCursor };
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
