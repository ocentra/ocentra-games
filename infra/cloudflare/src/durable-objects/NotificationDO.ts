import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { NotificationDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

import { NotificationType } from '@ocentra/endpoint-domain/constants/game';
import { NotificationDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
const MAX_NOTIFICATIONS = 200;

interface StoredNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: number;
}

export class NotificationDO implements DurableObject {
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

      if (request.method === HttpMethod.Post && pathname.endsWith(`/${NotificationDOSegment.Push}`)) {
        const body = (await request.json().catch(() => ({}))) as { type?: string; title?: string; body?: string };
        const result = await this.push(body.type ?? NotificationType.Info, body.title ?? '', body.body ?? '');
        return result.error
          ? this.json({ error: result.error }, result.status)
          : this.json({ sent: true, id: result.id });
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${NotificationDOSegment.List}`)) {
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') ?? '50', 10)));
        const unreadOnly = url.searchParams.get('unreadOnly') === 'true';
        const result = await this.list(limit, unreadOnly);
        return this.json({ notifications: result.notifications, nextCursor: result.nextCursor });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${NotificationDOSegment.MarkRead}`)) {
        const body = (await request.json().catch(() => ({}))) as { ids?: string[]; notificationId?: string };
        await this.markRead([
          ...(body.ids ?? []),
          ...(body.notificationId ? [body.notificationId] : []),
        ]);
        return this.json({ read: true });
      }
      if (request.method === HttpMethod.Get && pathname.endsWith(`/${NotificationDOSegment.Preferences}`)) {
        const prefs = await this.getPreferences();
        return this.json(prefs);
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${NotificationDOSegment.Preferences}`)) {
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const prefs = await this.updatePreferences(body);
        return this.json(prefs);
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('NotificationDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getNotifications(): Promise<StoredNotification[]> {
    const stored = await this.ctx.storage.get<StoredNotification[]>(NotificationDOStoragePrefix.Notifications);
    return stored ?? [];
  }

  private async push(
    type: string,
    title: string,
    body: string
  ): Promise<{ error?: string; status?: number; id?: string }> {
    const notifications = await this.getNotifications();
    const notification: StoredNotification = {
      id: crypto.randomUUID(),
      type: type.slice(0, 64),
      title: title.slice(0, 256),
      body: body.slice(0, 2048),
      read: false,
      createdAt: Date.now(),
    };
    notifications.push(notification);
    if (notifications.length > MAX_NOTIFICATIONS) notifications.splice(0, notifications.length - MAX_NOTIFICATIONS);
    await this.ctx.storage.put(NotificationDOStoragePrefix.Notifications, notifications);
    await this.deliverPushAndEmail(title, body);
    return { id: notification.id };
  }

  private async deliverPushAndEmail(title: string, body: string): Promise<void> {
    const prefs = await this.getPreferences();
    const channels = (prefs.channels as { inApp?: boolean; push?: boolean; email?: boolean } | undefined) ?? {};
    const pushTokens = (prefs.pushTokens as string[] | undefined) ?? [];
    const email = typeof prefs.email === 'string' ? prefs.email.trim() : '';
    if (channels.push && pushTokens.length > 0 && this.env.PUSH_SERVICE_KEY) {
      for (const token of pushTokens.slice(0, 10)) {
        try {
          const res = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: HttpMethod.Post,
            headers: {
              [HttpHeader.Authorization]: `key=${this.env.PUSH_SERVICE_KEY}`,
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            },
            body: JSON.stringify({
              to: token,
              notification: { title: title.slice(0, 128), body: body.slice(0, 256) },
            }),
          });
          await res.text().catch(() => undefined);
          if (!res.ok) this.log.logWarn('FCM send failed', getStackTrace(), { status: res.status });
        } catch (e) {
          this.log.logWarn('FCM send error', getStackTrace(), { error: e });
        }
      }
    }
    if (channels.email && email && this.env.EMAIL_API_KEY && this.env.EMAIL_FROM) {
      try {
        const from = this.env.EMAIL_FROM;
        const provider = this.env.EMAIL_PROVIDER ?? 'sendgrid';
        if (provider === 'resend') {
          const res = await fetch('https://api.resend.com/emails', {
            method: HttpMethod.Post,
            headers: {
              [HttpHeader.Authorization]: `Bearer ${this.env.EMAIL_API_KEY}`,
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            },
            body: JSON.stringify({
              from,
              to: [email],
              subject: title.slice(0, 128),
              text: body.slice(0, 4096),
            }),
          });
          await res.text().catch(() => undefined);
          if (!res.ok) this.log.logWarn('Resend send failed', getStackTrace(), { status: res.status });
        } else {
          const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
            method: HttpMethod.Post,
            headers: {
              [HttpHeader.Authorization]: `Bearer ${this.env.EMAIL_API_KEY}`,
              [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
            },
            body: JSON.stringify({
              personalizations: [{ to: [{ email }] }],
              from: (() => {
                const angle = from.indexOf('<');
                if (angle >= 0) {
                  const name = from.slice(0, angle).trim();
                  const addr = from.slice(angle + 1).replace('>', '').trim();
                  return { email: addr, name: name || 'Ocentra' };
                }
                return { email: from, name: 'Ocentra' };
              })(),
              subject: title.slice(0, 128),
              content: [{ type: HttpContentType.TextPlain, value: body.slice(0, 4096) }],
            }),
          });
          await res.text().catch(() => undefined);
          if (!res.ok) this.log.logWarn('SendGrid send failed', getStackTrace(), { status: res.status });
        }
      } catch (e) {
        this.log.logWarn('Email send error', getStackTrace(), { error: e });
      }
    }
  }

  private async list(
    limit: number,
    unreadOnly: boolean
  ): Promise<{ notifications: StoredNotification[]; nextCursor?: string }> {
    let notifications = await this.getNotifications();
    if (unreadOnly) notifications = notifications.filter((n) => !n.read);
    const slice = notifications.slice(-limit).reverse();
    const nextCursor =
      notifications.length > limit ? notifications[notifications.length - limit - 1]?.id : undefined;
    return { notifications: slice, nextCursor };
  }

  private async markRead(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    const set = new Set(ids);
    const notifications = await this.getNotifications();
    let changed = false;
    for (const n of notifications) {
      if (set.has(n.id) && !n.read) {
        n.read = true;
        changed = true;
      }
    }
    if (changed) await this.ctx.storage.put(NotificationDOStoragePrefix.Notifications, notifications);
  }

  private async getPreferences(): Promise<Record<string, unknown>> {
    const stored = await this.ctx.storage.get<Record<string, unknown>>(NotificationDOStoragePrefix.Preferences);
    return stored ?? { channels: { inApp: true, push: true, email: false }, muted: {}, pushTokens: [] };
  }

  private async updatePreferences(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
    const current = await this.getPreferences();
    const next = { ...current, ...patch, updatedAt: Date.now() };
    await this.ctx.storage.put(NotificationDOStoragePrefix.Preferences, next);
    return next;
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
