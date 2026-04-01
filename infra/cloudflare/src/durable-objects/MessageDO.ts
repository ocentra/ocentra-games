import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { MessageDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { BucketPath } from '@ocentra/boundary-domain/constants/bucket-paths';

import { MessageDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
const MAX_MESSAGES = 1000;

interface StoredMessage {
  messageId: string;
  senderId: string;
  content: string;
  timestamp: number;
}

export class MessageDO implements DurableObject {
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

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${MessageDOSegment.Send}`)) {
        const body = (await request.json().catch(() => ({}))) as { senderId?: string; content?: string };
        const result = await this.send(body.senderId ?? '', body.content ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ sent: true, messageId: result.messageId });
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${MessageDOSegment.List}`)) {
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
        const before = url.searchParams.get('before') ?? undefined;
        const result = await this.list(limit, before);
        return this.json({ messages: result.messages, nextCursor: result.nextCursor });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${MessageDOSegment.ReadReceipt}`)) {
        const body = (await request.json().catch(() => ({}))) as { messageIds?: string[] };
        await this.markRead(body.messageIds ?? []);
        return this.json({ read: true });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('MessageDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getMessages(): Promise<StoredMessage[]> {
    const stored = await this.ctx.storage.get<StoredMessage[]>(MessageDOStoragePrefix.Messages);
    return stored ?? [];
  }

  private async send(senderId: string, content: string): Promise<{ error?: string; status?: number; messageId?: string }> {
    if (!senderId || typeof content !== 'string') {
      return { error: 'Missing senderId or content', status: HttpStatus.BadRequest };
    }
    const trimmed = content.slice(0, 4096);
    const messages = await this.getMessages();
    const message: StoredMessage = {
      messageId: crypto.randomUUID(),
      senderId: senderId.slice(0, 128),
      content: trimmed,
      timestamp: Date.now(),
    };
    messages.push(message);
    if (messages.length > MAX_MESSAGES) {
      const toRemove = messages.length - MAX_MESSAGES;
      const toArchive = messages.splice(0, toRemove);
      await this.archiveMessages(toArchive);
      await this.ctx.storage.put(MessageDOStoragePrefix.Messages, messages);
    } else {
      await this.ctx.storage.put(MessageDOStoragePrefix.Messages, messages);
    }
    return { messageId: message.messageId };
  }

  private async archiveMessages(batch: StoredMessage[]): Promise<void> {
    const bucket = this.env.MESSAGE_ARCHIVE_BUCKET;
    if (!bucket) return;
    const conversationId = String((this.ctx.id as { name?: string }).name ?? 'default').replace(/:/g, '-');
    const byMonth = new Map<string, StoredMessage[]>();
    for (const m of batch) {
      const d = new Date(m.timestamp);
      const key = `${d.getUTCFullYear()}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      if (!byMonth.has(key)) byMonth.set(key, []);
      byMonth.get(key)!.push(m);
    }
    for (const [ym, msgs] of byMonth) {
      const r2Key = `${BucketPath.MessageArchive}${conversationId}/${ym}.json`;
      let existing: StoredMessage[] = [];
      try {
        const obj = await bucket.get(r2Key);
        if (obj?.body) {
          const text = await obj.text();
          existing = JSON.parse(text) as StoredMessage[];
        }
      } catch {
        //
      }
      const merged = [...existing, ...msgs].sort((a, b) => a.timestamp - b.timestamp);
      await bucket.put(r2Key, JSON.stringify(merged), {
        httpMetadata: { contentType: HttpContentType.ApplicationJson },
      });
    }
  }

  private async list(
    limit: number,
    before?: string
  ): Promise<{ messages: StoredMessage[]; nextCursor?: string }> {
    const messages = await this.getMessages();
    let start = messages.length;
    if (before) {
      const idx = messages.findIndex((m) => m.messageId === before);
      if (idx !== -1) start = idx;
    }
    const slice = messages.slice(Math.max(0, start - limit), start).reverse();
    const nextCursor = start - limit > 0 ? messages[start - limit - 1]?.messageId : undefined;
    return { messages: slice, nextCursor };
  }

  private async markRead(messageIds: string[]): Promise<void> {
    const stored = await this.ctx.storage.get<string[]>(MessageDOStoragePrefix.Read);
    const read = new Set<string>(stored ?? []);
    for (const id of messageIds) read.add(String(id));
    await this.ctx.storage.put(MessageDOStoragePrefix.Read, Array.from(read));
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
