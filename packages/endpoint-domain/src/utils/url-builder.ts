import type { ApiPath, DOPath } from '@/types/brands';
import { CreditAction } from '@/constants/credits';
import { ApiEndpoint } from '@/constants/cloudflare';
import { DOBaseUrl } from '@/constants/cloudflare-do';
import { HttpScheme } from '@/constants/http';
import { PathPlaceholder, PathSeparator } from '@/constants/paths';
import { ErrorMessage } from '@/constants/errors';

export type ApiURL = string & { readonly __brand: 'ApiURL' };
export type FullURL = string & { readonly __brand: 'FullURL' };
export type DORequestURL = string & { readonly __brand: 'DORequestURL' };

export interface URLBuilderOptions {
  origin?: string;
  baseUrl?: string;
}

function validateOrigin(origin: string): string {
  if (!origin) throw new Error(ErrorMessage.OriginCannotBeNull);
  if (typeof origin !== 'string') throw new Error(`${ErrorMessage.OriginMustBeString} ${typeof origin}`);
  const trimmed = origin.trim();
  if (!trimmed.startsWith(HttpScheme.Http) && !trimmed.startsWith(HttpScheme.Https)) {
    throw new Error(`${ErrorMessage.OriginMustStartWithHttp} "${origin}"`);
  }
  try {
    new URL(trimmed);
    return trimmed;
  } catch (error) {
    throw new Error(`${ErrorMessage.InvalidOriginFormat} "${origin}" - ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function extractOriginFromRequest(requestUrl: string): string {
  try {
    return new URL(requestUrl).origin;
  } catch (error) {
    throw new Error(`${ErrorMessage.FailedToExtractOrigin} "${requestUrl}" - ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function buildDOUrl(path: DOPath | string): DORequestURL {
  const url = new URL(DOBaseUrl);
  url.pathname = path;
  const fullUrl = url.toString();
  if (!fullUrl || fullUrl === DOBaseUrl) throw new Error(`${ErrorMessage.FailedToConstructDOUrl} "${path}"`);
  if (!fullUrl.startsWith(HttpScheme.Http) && !fullUrl.startsWith(HttpScheme.Https)) {
    throw new Error(`${ErrorMessage.ConstructedDOUrlInvalid} "${fullUrl}"`);
  }
  return fullUrl as DORequestURL;
}

export function buildApiUrl(endpoint: ApiPath | string, options?: URLBuilderOptions): ApiURL {
  if (options?.baseUrl) return `${validateOrigin(options.baseUrl)}${endpoint}` as ApiURL;
  if (options?.origin) return `${validateOrigin(options.origin)}${endpoint}` as ApiURL;
  throw new Error(ErrorMessage.BuildApiUrlRequiresOriginOrBaseUrl);
}

export function buildApiUrlFromRequest(endpoint: ApiPath | string, requestUrl: string): ApiURL {
  return buildApiUrl(endpoint, { origin: extractOriginFromRequest(requestUrl) });
}

export function buildLogsApiUrl(logsPath: string, options?: URLBuilderOptions): ApiURL {
  if (options?.baseUrl) return `${validateOrigin(options.baseUrl)}${logsPath}` as ApiURL;
  if (options?.origin) return `${validateOrigin(options.origin)}${logsPath}` as ApiURL;
  throw new Error(ErrorMessage.BuildLogsApiUrlRequiresOriginOrBaseUrl);
}

export function buildLogsApiUrlFromRequest(logsPath: string, requestUrl: string): ApiURL {
  return buildLogsApiUrl(logsPath, { origin: extractOriginFromRequest(requestUrl) });
}

export function buildFullUrl(path: string, options: URLBuilderOptions): FullURL {
  if (!path) throw new Error(ErrorMessage.PathCannotBeNull);
  if (typeof path !== 'string') throw new Error(`${ErrorMessage.PathMustBeString} ${typeof path}`);
  const trimmed = path.trim();
  const normalizedPath = trimmed.startsWith(PathSeparator.ForwardSlash) ? trimmed : `${PathSeparator.ForwardSlash}${trimmed}`;
  if (options.baseUrl) return `${validateOrigin(options.baseUrl)}${normalizedPath}` as FullURL;
  if (options.origin) return `${validateOrigin(options.origin)}${normalizedPath}` as FullURL;
  throw new Error(ErrorMessage.BuildFullUrlRequiresOriginOrBaseUrl);
}

export function buildFullUrlFromRequest(path: string, requestUrl: string): FullURL {
  return buildFullUrl(path, { origin: extractOriginFromRequest(requestUrl) });
}

export function buildApiUrlWithQueryParams(
  endpoint: ApiPath | string,
  queryParams: Record<string, string | number | boolean>,
  options?: URLBuilderOptions
): ApiURL {
  const baseUrl = options?.baseUrl || options?.origin;
  if (!baseUrl) throw new Error(ErrorMessage.BuildApiUrlWithQueryParamsRequiresOrigin);
  const url = new URL(`${validateOrigin(baseUrl)}${endpoint}`);
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString() as ApiURL;
}

export function buildApiUrlWithQueryParamsFromRequest(
  endpoint: ApiPath | string,
  queryParams: Record<string, string | number | boolean>,
  requestUrl: string
): ApiURL {
  return buildApiUrlWithQueryParams(endpoint, queryParams, { origin: extractOriginFromRequest(requestUrl) });
}

const CreditActionToPath: Record<CreditAction, (userId: string) => ApiPath> = {
  [CreditAction.Balance]: ApiEndpoint.Credits.Balance,
  [CreditAction.Purchase]: ApiEndpoint.Credits.Purchase,
  [CreditAction.Consume]: ApiEndpoint.Credits.Consume,
  [CreditAction.ConsumeGP]: ApiEndpoint.Credits.ConsumeGP,
  [CreditAction.Earn]: ApiEndpoint.Credits.Earn,
  [CreditAction.Redeem]: () => ApiEndpoint.Credits.Redeem,
  [CreditAction.Transactions]: ApiEndpoint.Credits.Transactions,
};

export function buildCreditsApiUrl(userId: string, action: CreditAction, options?: URLBuilderOptions): ApiURL {
  if (!userId || typeof userId !== 'string') throw new Error(ErrorMessage.UserIdMustBeNonEmptyString);
  if (!action || typeof action !== 'string') throw new Error(ErrorMessage.ActionMustBeNonEmptyString);
  const baseUrl = options?.baseUrl || options?.origin;
  if (!baseUrl) throw new Error(ErrorMessage.BuildCreditsApiUrlRequiresOrigin);
  const path = CreditActionToPath[action as CreditAction](userId);
  return new URL(`${validateOrigin(baseUrl)}${path}`).toString() as ApiURL;
}

export function buildCreditsApiUrlFromRequest(userId: string, action: CreditAction, requestUrl: string): ApiURL {
  return buildCreditsApiUrl(userId, action, { origin: extractOriginFromRequest(requestUrl) });
}

export function buildApiUrlWithPathParams(
  endpoint: ApiPath | string,
  pathParams: Record<string, string>,
  options?: URLBuilderOptions
): ApiURL {
  const baseUrl = options?.baseUrl || options?.origin;
  if (!baseUrl) throw new Error(ErrorMessage.BuildApiUrlWithPathParamsRequiresOrigin);
  let path = endpoint as string;
  Object.entries(pathParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      const placeholder = PathPlaceholder.wrap(key);
      const encoded = encodeURIComponent(String(value));
      const originalPath = path;
      path = path.replace(placeholder, encoded);
      if (path === originalPath && !path.includes(placeholder)) {
        path = path.endsWith(PathSeparator.ForwardSlash) ? `${path}${encoded}` : `${path}${PathSeparator.ForwardSlash}${encoded}`;
      }
    }
  });
  return new URL(`${validateOrigin(baseUrl)}${path}`).toString() as ApiURL;
}

export function buildApiUrlWithPathParamsFromRequest(
  endpoint: ApiPath | string,
  pathParams: Record<string, string>,
  requestUrl: string
): ApiURL {
  return buildApiUrlWithPathParams(endpoint, pathParams, { origin: extractOriginFromRequest(requestUrl) });
}

export function buildApiUrlWithPathAndQuery(
  endpoint: ApiPath | string,
  pathParams: Record<string, string>,
  queryParams: Record<string, string | number | boolean>,
  options?: URLBuilderOptions
): ApiURL {
  const baseUrl = options?.baseUrl || options?.origin;
  if (!baseUrl) throw new Error(ErrorMessage.BuildApiUrlWithPathAndQueryRequiresOrigin);
  let path = endpoint as string;
  Object.entries(pathParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      const placeholder = PathPlaceholder.wrap(key);
      const encoded = encodeURIComponent(String(value));
      const originalPath = path;
      path = path.replace(placeholder, encoded);
      if (path === originalPath && !path.includes(placeholder)) {
        path = path.endsWith(PathSeparator.ForwardSlash) ? `${path}${encoded}` : `${path}${PathSeparator.ForwardSlash}${encoded}`;
      }
    }
  });
  const url = new URL(`${validateOrigin(baseUrl)}${path}`);
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString() as ApiURL;
}

export function buildApiUrlWithPathAndQueryFromRequest(
  endpoint: ApiPath | string,
  pathParams: Record<string, string>,
  queryParams: Record<string, string | number | boolean>,
  requestUrl: string
): ApiURL {
  return buildApiUrlWithPathAndQuery(endpoint, pathParams, queryParams, { origin: extractOriginFromRequest(requestUrl) });
}
