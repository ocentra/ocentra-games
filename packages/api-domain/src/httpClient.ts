import { buildApiUrl } from '@ocentra/endpoint-domain/utils/url-builder';
import { HttpAuthScheme, HttpContentType, HttpHeader, HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
log.register(import.meta.url);
const ADMIN_AUTH_TRACE_STORAGE_KEY = 'ocentra:debug:admin-auth';
const ADMIN_AUTH_TRACE_GLOBAL_KEY = '__OCENTRA_ADMIN_AUTH_TRACE';
const ADMIN_AUTH_TRACE_HEADER_VALUE = 'admin-auth-flow';

export type AuthMode = 'none' | 'optional' | 'required';

export interface CloudflareRequestOptions<TBody> {
  method?: string;
  body?: TBody;
  headers?: Record<string, string>;
  authMode?: AuthMode;
  baseUrl?: string;
}

export class CloudflareHttpError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(message: string, status: number, data: unknown) {
    super(message);
    this.name = 'CloudflareHttpError';
    this.status = status;
    this.data = data;
  }
}

export type GetAuthToken = () => Promise<string | null>;

let _getAuthToken: GetAuthToken | null = null;

export function initHttpClient(options: { getAuthToken: GetAuthToken }): void {
  _getAuthToken = options.getAuthToken;
}

export function isHttpClientInitialized(): boolean {
  return _getAuthToken !== null;
}

function isAdminAuthTraceEnabled(): boolean {
  const globalFlag = (globalThis as Record<string, unknown>)[ADMIN_AUTH_TRACE_GLOBAL_KEY];
  if (typeof globalFlag === 'boolean') {
    return globalFlag;
  }
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return false;
    }
    return window.localStorage.getItem(ADMIN_AUTH_TRACE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

async function resolveAuthToken(authMode: AuthMode): Promise<string | null> {
  if (authMode === 'none') return null;
  if (!_getAuthToken) throw new Error('API client not initialized: call initHttpClient({ getAuthToken }) at bootstrap');
  try {
    const token = await _getAuthToken();
    if (!token && authMode === 'required') throw new Error('Authentication required');
    return token ?? null;
  } catch (error) {
    log.logError('Failed to retrieve auth token', getStackTrace(), { data: error });
    if (authMode === 'required') throw new Error('Authentication required');
    return null;
  }
}

function getBaseUrl(baseUrl?: string): string {
  if (baseUrl && baseUrl.length > 0) return baseUrl;
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  throw new Error('Base URL unavailable');
}

function resolveErrorMessage(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'error' in data) {
    const value = (data as { error?: unknown }).error;
    if (typeof value === 'string' && value.length > 0) return value;
  }
  return `Request failed with status ${status}`;
}

export async function requestJson<TResponse, TBody = unknown>(
  endpoint: string,
  options?: CloudflareRequestOptions<TBody>
): Promise<TResponse> {
  const method = options?.method ?? HttpMethod.Get;
  const authMode = options?.authMode ?? 'optional';
  const headers = new Headers(options?.headers);
  const authTraceEnabled = authMode !== 'none' && isAdminAuthTraceEnabled();

  if (authTraceEnabled) {
    headers.set(HttpHeader.XEnableAbortDebug, ADMIN_AUTH_TRACE_HEADER_VALUE);
    log.logInfo(
      '[AdminAuthFlow:B] resolving auth token',
      getStackTrace(),
      { endpoint, method, authMode },
      true
    );
  }

  const token = await resolveAuthToken(authMode);
  if (authTraceEnabled) {
    log.logInfo(
      '[AdminAuthFlow:C] auth token resolved',
      getStackTrace(),
      { endpoint, method, authMode, hasToken: Boolean(token) },
      true
    );
  }
  if (token) {
    headers.set(HttpHeader.Authorization, `${HttpAuthScheme.Bearer} ${token}`);
    log.logInfo(
      '[AdminAuthFlow:D] auth header attached',
      getStackTrace(),
      { endpoint, method, authMode, hasToken: true },
      authTraceEnabled
    );
  } else {
    log.logWarn(
      '[AdminAuthFlow:D] request without auth token',
      getStackTrace(),
      { endpoint, method, authMode, hasToken: false },
      authTraceEnabled
    );
  }

  let body: string | undefined;
  if (options?.body !== undefined) {
    headers.set(HttpHeader.ContentType, HttpContentType.ApplicationJson);
    body = JSON.stringify(options.body);
  }

  const url = buildApiUrl(endpoint, { baseUrl: getBaseUrl(options?.baseUrl) });
  const response = await fetch(url, { method, headers, body });
  const contentType = response.headers.get(HttpHeader.ContentType) ?? '';
  const responseData = contentType.includes(HttpContentType.ApplicationJson)
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');

  if (authTraceEnabled) {
    log.logInfo(
      '[AdminAuthFlow:E] response received',
      getStackTrace(),
      { endpoint, method, status: response.status, ok: response.ok },
      true
    );
  }

  if (!response.ok) {
    const message = resolveErrorMessage(responseData, response.status);
    throw new CloudflareHttpError(message, response.status, responseData);
  }

  return responseData as TResponse;
}
