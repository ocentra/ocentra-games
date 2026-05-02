import type { ApiPath, DOPath } from '@/types/brands';
import { Schema } from '@ocentra/schema-domain/effect';
import { CreditAction } from '@/constants/credits';
import { ApiEndpoint } from '@/constants/cloudflare';
import { DOBaseUrl } from '@/constants/cloudflare-do';
import { HttpScheme } from '@/constants/http';
import { PathPlaceholder, PathSeparator } from '@/constants/paths';
import { ErrorMessage } from '@/constants/errors';

const UrlString = Schema.String.pipe(
  Schema.minLength(1),
  Schema.filter((value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return 'Expected an absolute URL';
    }
  }),
);

export const ApiURLSchema = UrlString.pipe(Schema.brand('ApiURL'));
export type ApiURL = typeof ApiURLSchema.Type;
export const decodeApiURL = Schema.decodeUnknownSync(ApiURLSchema);

export const FullURLSchema = UrlString.pipe(Schema.brand('FullURL'));
export type FullURL = typeof FullURLSchema.Type;
export const decodeFullURL = Schema.decodeUnknownSync(FullURLSchema);

export const DORequestURLSchema = UrlString.pipe(Schema.brand('DORequestURL'));
export type DORequestURL = typeof DORequestURLSchema.Type;
export const decodeDORequestURL = Schema.decodeUnknownSync(DORequestURLSchema);

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
  return decodeDORequestURL(fullUrl);
}

export function buildApiUrl(endpoint: ApiPath | string, options?: URLBuilderOptions): ApiURL {
  if (options?.baseUrl) return decodeApiURL(`${validateOrigin(options.baseUrl)}${endpoint}`);
  if (options?.origin) return decodeApiURL(`${validateOrigin(options.origin)}${endpoint}`);
  throw new Error(ErrorMessage.BuildApiUrlRequiresOriginOrBaseUrl);
}

export function buildApiUrlFromRequest(endpoint: ApiPath | string, requestUrl: string): ApiURL {
  return buildApiUrl(endpoint, { origin: extractOriginFromRequest(requestUrl) });
}

export function buildLogsApiUrl(logsPath: string, options?: URLBuilderOptions): ApiURL {
  if (options?.baseUrl) return decodeApiURL(`${validateOrigin(options.baseUrl)}${logsPath}`);
  if (options?.origin) return decodeApiURL(`${validateOrigin(options.origin)}${logsPath}`);
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
  if (options.baseUrl) return decodeFullURL(`${validateOrigin(options.baseUrl)}${normalizedPath}`);
  if (options.origin) return decodeFullURL(`${validateOrigin(options.origin)}${normalizedPath}`);
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
  return decodeApiURL(url.toString());
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
  return decodeApiURL(new URL(`${validateOrigin(baseUrl)}${path}`).toString());
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
  return decodeApiURL(new URL(`${validateOrigin(baseUrl)}${path}`).toString());
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
  return decodeApiURL(url.toString());
}

export function buildApiUrlWithPathAndQueryFromRequest(
  endpoint: ApiPath | string,
  pathParams: Record<string, string>,
  queryParams: Record<string, string | number | boolean>,
  requestUrl: string
): ApiURL {
  return buildApiUrlWithPathAndQuery(endpoint, pathParams, queryParams, { origin: extractOriginFromRequest(requestUrl) });
}
