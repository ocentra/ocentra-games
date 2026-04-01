import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { SettingsDOSegment } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

import { SettingsDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';

interface UserSettings {
  theme?: 'light' | 'dark' | 'auto';
  notifications?: boolean;
  soundEnabled?: boolean;
  language?: string;
  [key: string]: unknown;
}

export class SettingsDO implements DurableObject {
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

      if (request.method === HttpMethod.Get && pathname.endsWith(`/${SettingsDOSegment.Get}`)) {
        const settings = await this.getSettings();
        return this.json({ settings });
      }
      if (request.method === HttpMethod.Post && pathname.endsWith(`/${SettingsDOSegment.Update}`)) {
        const body = await request.json().catch(() => ({})) as Partial<UserSettings>;
        const updated = await this.updateSettings(body);
        return this.json({ updated: true, settings: updated });
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('SettingsDO fetch error', getStackTrace(), { error, url: request.url });
      return this.json({ error: 'Internal Server Error' }, HttpStatus.InternalServerError);
    }
  }

  private async getSettings(): Promise<UserSettings> {
    const stored = await this.ctx.storage.get<UserSettings>(SettingsDOStoragePrefix.Settings);
    return stored ?? {};
  }

  private async updateSettings(patch: Partial<UserSettings>): Promise<UserSettings> {
    const current = await this.getSettings();
    const allowed: (keyof UserSettings)[] = ['theme', 'notifications', 'soundEnabled', 'language'];
    const next: UserSettings = { ...current };
    for (const key of allowed) {
      if (patch[key] !== undefined) {
        next[key] = patch[key] as UserSettings[string];
      }
    }
    await this.ctx.storage.put(SettingsDOStoragePrefix.Settings, next);
    return next;
  }

  private json(data: unknown, status: number = HttpStatus.Ok): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }
}
