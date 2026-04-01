import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { AuditLogDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { AuditEventSchema, AuditQueryFiltersSchema, type AuditEvent, type AuditIntegrity } from '@ocentra/endpoint-domain/schemas/audit';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';
import { AuditLogDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
const RETENTION_LONG = 'long';

function auditArchiveKey(actorId: string, eventId: string, timestamp: number): string {
  const d = new Date(timestamp);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${BucketPath.AuditArchive}${actorId}/${y}/${m}/${day}/${eventId}.json`;
}

export class AuditLogDO implements DurableObject {
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

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${AuditLogDOSegment.StoreEvent}`)) {
        return this.storeEvent(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${AuditLogDOSegment.Log}`)) {
        return this.storeEvent(request);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${AuditLogDOSegment.Query}`)) {
        return this.queryEvents(request);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('AuditLogDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async storeEvent(request: Request): Promise<Response> {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return this.json({ error: 'Invalid JSON' }, HttpStatus.BadRequest);
    }
    const parsed = AuditEventSchema.safeParse(body);
    if (!parsed.success) {
      return this.json({ error: 'Invalid event', issues: parsed.error.issues }, HttpStatus.BadRequest);
    }
    const eventInput = parsed.data;
    const eventId = eventInput.eventId;
    const existing = await this.ctx.storage.get<AuditEvent>(`${AuditLogDOStoragePrefix.Event}${eventId}`);
    if (existing) {
      return this.json({ logged: true, eventId });
    }
    const order = (await this.ctx.storage.get<string[]>(AuditLogDOStoragePrefix.Order)) ?? [];
    const lastHash = order.length > 0 ? (await this.ctx.storage.get<string>(`hash:${order[order.length - 1]}`)) ?? '0' : '0';
    const currentHash = await this.computeHash(eventInput, lastHash);
    const integrity: AuditIntegrity = {
      previousHash: lastHash,
      currentHash,
      chainId: `chain-${this.ctx.id.toString()}`,
    };
    const event: AuditEvent = {
      ...eventInput,
      integrity,
    };
    order.push(eventId);
    await this.ctx.storage.put(`${AuditLogDOStoragePrefix.Event}${eventId}`, event);
    await this.ctx.storage.put(`hash:${eventId}`, currentHash);
    await this.ctx.storage.put(AuditLogDOStoragePrefix.Order, order);
    const retention = eventInput.classification?.retention ?? '';
    if (retention === RETENTION_LONG && this.env.AUDIT_ARCHIVE) {
      await this.archiveToR2(event);
    }
    return this.json({ logged: true, eventId });
  }

  private async archiveToR2(event: AuditEvent): Promise<void> {
    const bucket = this.env.AUDIT_ARCHIVE;
    if (!bucket) return;
    const key = auditArchiveKey(event.actor.id, event.eventId, event.context.timestamp);
    await bucket.put(key, JSON.stringify(event), {
      httpMetadata: { contentType: HttpContentType.ApplicationJson },
    });
  }

  private async computeHash(event: Omit<AuditEvent, 'integrity'>, previousHash: string): Promise<string> {
    const data = JSON.stringify({
      eventId: event.eventId,
      eventType: event.eventType,
      actor: event.actor.id,
      target: event.target.id,
      action: event.action.type,
      timestamp: event.context.timestamp,
      previousHash,
    });
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async queryEvents(request: Request): Promise<Response> {
    let body: { filters?: unknown } = {};
    try {
      const raw = await request.text();
      if (raw) body = JSON.parse(raw) as { filters?: unknown };
    } catch {
      return this.json({ events: [], total: 0 });
    }
    const filtersResult = AuditQueryFiltersSchema.safeParse(body.filters ?? {});
    const filters = filtersResult.success ? filtersResult.data : {};
    const order = (await this.ctx.storage.get<string[]>(AuditLogDOStoragePrefix.Order)) ?? [];
    const events: AuditEvent[] = [];
    for (const eventId of order) {
      const event = await this.ctx.storage.get<AuditEvent>(`${AuditLogDOStoragePrefix.Event}${eventId}`);
      if (event) events.push(event);
    }
    let results = events;
    if (filters.actorId) results = results.filter((e) => e.actor.id === filters.actorId);
    if (filters.category) results = results.filter((e) => e.category === filters.category);
    if (filters.startTime != null) results = results.filter((e) => e.context.timestamp >= filters.startTime!);
    if (filters.endTime != null) results = results.filter((e) => e.context.timestamp <= filters.endTime!);
    if (filters.targetId) results = results.filter((e) => e.target.id === filters.targetId);
    results.sort((a, b) => a.context.timestamp - b.context.timestamp);
    const limit = Math.min(500, Math.max(1, filters.limit ?? 100));
    const cursorIndex = filters.cursor ? results.findIndex((e) => e.eventId === filters.cursor) + 1 : 0;
    const start = Math.max(0, cursorIndex);
    const page = results.slice(start, start + limit);
    return this.json({
      events: page,
      total: results.length,
      limit,
      nextCursor: page.length === limit && start + limit < results.length ? page[page.length - 1]?.eventId : undefined,
    });
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
