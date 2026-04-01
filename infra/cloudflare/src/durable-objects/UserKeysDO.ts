import type { Env } from '@/constants/env';
import { HttpStatus, HttpHeader, HttpContentType, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { UserKeysDO as UserKeysDOEndpoints } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { UserKeysDOStoragePrefix } from '@ocentra/boundary-domain/constants/do-storage-prefixes';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import type { StackTrace } from '@ocentra/logging-domain/core/stackTrace';

interface StoredKey {
  ciphertext: string;
  iv: string;
  updatedAt: number;
  baseUrl?: string;
}

export class UserKeysDO implements DurableObject {
  private readonly log = Logger.instance;

  constructor(
    private ctx: DurableObjectState,
    private env: Env
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

      if (request.method === HttpMethod.Post && url.pathname === UserKeysDOEndpoints.Store) {
        return await this.handleStore(request);
      }
      if (request.method === HttpMethod.Post && url.pathname === UserKeysDOEndpoints.Get) {
        return await this.handleGet(request);
      }
      if (request.method === HttpMethod.Post && url.pathname === UserKeysDOEndpoints.Delete) {
        return await this.handleDelete(request);
      }
      if (request.method === HttpMethod.Get && url.pathname === UserKeysDOEndpoints.List) {
        return await this.handleList();
      }

      return new Response('Not Found', { status: HttpStatus.NotFound });
    } catch (error) {
      this.log.logError('UserKeysDO fetch error', getStackTrace(), {
        error,
        method: request.method,
        url: request.url,
      });
      return new Response(
        JSON.stringify({ success: false, error: 'Internal Server Error' }),
        {
          status: HttpStatus.InternalServerError,
          headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
        }
      );
    }
  }

  private async handleStore(request: Request): Promise<Response> {
    const body = (await request.json()) as {
      providerId?: string;
      ciphertext?: string;
      iv?: string;
      baseUrl?: string;
    };
    const providerId = body?.providerId;
    const ciphertext = body?.ciphertext;
    const iv = body?.iv;
    const baseUrl = typeof body?.baseUrl === 'string' ? body.baseUrl : undefined;
    if (!providerId || !ciphertext || !iv) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing providerId, ciphertext, or iv' }),
        { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } }
      );
    }
    const key = `${UserKeysDOStoragePrefix.Provider}${providerId}`;
    const stored: StoredKey = {
      ciphertext,
      iv,
      updatedAt: Date.now(),
      ...(baseUrl !== undefined && baseUrl !== '' ? { baseUrl } : {}),
    };
    await this.ctx.storage.put(key, JSON.stringify(stored));
    return new Response(JSON.stringify({ success: true }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleGet(request: Request): Promise<Response> {
    const body = (await request.json()) as { providerId?: string };
    const providerId = body?.providerId;
    if (!providerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing providerId' }),
        { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } }
      );
    }
    const key = `${UserKeysDOStoragePrefix.Provider}${providerId}`;
    const raw = await this.ctx.storage.get<string>(key);
    if (!raw) {
      return new Response(JSON.stringify({ success: false, found: false }), {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      });
    }
    const stored = JSON.parse(raw as string) as StoredKey;
    return new Response(
      JSON.stringify({
        success: true,
        found: true,
        ciphertext: stored.ciphertext,
        iv: stored.iv,
        ...(stored.baseUrl != null ? { baseUrl: stored.baseUrl } : {}),
      }),
      {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      }
    );
  }

  private async handleDelete(request: Request): Promise<Response> {
    const body = (await request.json()) as { providerId?: string };
    const providerId = body?.providerId;
    if (!providerId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing providerId' }),
        { status: HttpStatus.BadRequest, headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson } }
      );
    }
    const key = `${UserKeysDOStoragePrefix.Provider}${providerId}`;
    await this.ctx.storage.delete(key);
    return new Response(JSON.stringify({ success: true }), {
      status: HttpStatus.Ok,
      headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
    });
  }

  private async handleList(): Promise<Response> {
    const list = await this.ctx.storage.list({ prefix: UserKeysDOStoragePrefix.Provider });
    const providers = Array.from(list.keys()).map((k) => k.replace(UserKeysDOStoragePrefix.Provider, ''));
    return new Response(
      JSON.stringify({ success: true, providers }),
      {
        status: HttpStatus.Ok,
        headers: { [HttpHeader.ContentType]: HttpContentType.ApplicationJson },
      }
    );
  }
}
