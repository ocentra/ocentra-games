import type { SetupContextToken } from '@tests/test-setup-core';
import { TestTokenPrefix } from '@ocentra/endpoint-domain/constants/auth';
import { HttpHeader, HttpMethod, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import type { ApiPath } from '@ocentra/endpoint-domain/types/brands';
import { ApiEndpoint } from '@ocentra/endpoint-domain/constants/cloudflare';
import { CreditAction } from '@ocentra/endpoint-domain/constants/credits';
import { TestConfig, TestEnvVar, TestEnvValue, TestValues } from '@tests/constants/test-constants';
import { Logger, getStackTrace } from '@/logging/domain-logger-init';
import { computeContentChecksum } from '@/utils/content-validation';
import { buildFullUrl, buildCreditsApiUrl as buildCreditsApiUrlCore, buildApiUrl, buildApiUrlWithQueryParams, buildApiUrlWithPathParams, type FullURL, type ApiURL } from '@ocentra/endpoint-domain/utils/url-builder';

import { formatBearerToken } from '@/utils/auth';
import { asMatchId } from '@ocentra/endpoint-domain/constants/match';
import type { MatchId } from '@ocentra/endpoint-domain/constants/match';

export function createTestToken(userId: string = TestConfig.TestUserId, isAdmin: boolean = false): string {
  return `${TestTokenPrefix.Test}${userId}${isAdmin ? ':admin' : ''}`;
}

export function createAdminToken(userId: string = TestConfig.TestAdminUserId): string {
  return createTestToken(userId, true);
}

export function createForgedToken(): string {
  return `${TestTokenPrefix.Forged}admin`;
}

export function createExpiredToken(): string {
  return `${TestTokenPrefix.Expired}${TestConfig.TestUserId}`;
}

export function createTokenWithInvalidIssuer(): string {
  return `${TestTokenPrefix.InvalidIssuer}${TestConfig.TestUserId}`;
}

export function createTokenWithInvalidAudience(): string {
  return `${TestTokenPrefix.InvalidAudience}${TestConfig.TestUserId}`;
}

export function getAuthHeaders(userId: string = TestConfig.TestUserId, isAdmin: boolean = false): Record<string, string> {
  const token = createTestToken(userId, isAdmin);
  return {
    [HttpHeader.Authorization]: formatBearerToken(token)
  };
}

export function getAdminAuthHeaders(userId: string = TestConfig.TestAdminUserId): Record<string, string> {
  return getAuthHeaders(userId, true);
}

const WORKER_LOGS_API_KEY = '__WORKER_LOGS_API_KEY__';

function isRealWorkerMode(): boolean {
  const mode = process.env[TestEnvVar.TestMode];
  return mode === TestEnvValue.Real || mode === TestEnvValue.Cloud;
}

export function getDefaultTestOrigin(): string {
  return isRealWorkerMode() ? TestConfig.TestCorsOrigin : TestConfig.LocalhostOrigin;
}

export function getLogsApiKey(): string {
  if (isRealWorkerMode()) {
    return process.env[TestEnvVar.LogsApiKey] || process.env[TestEnvVar.ViteLogsApiKey] || '';
  }
  const g = globalThis as typeof globalThis & { [key: string]: string | undefined };
  return g[WORKER_LOGS_API_KEY] ?? process.env[TestEnvVar.LogsApiKey] ?? process.env[TestEnvVar.ViteLogsApiKey] ?? TestConfig.TestLogsApiKey;
}

export function setWorkerLogsApiKeyForTests(key: string): void {
  (globalThis as typeof globalThis & { [key: string]: string }).__WORKER_LOGS_API_KEY__ = key;
}

export function getLogsApiAuthHeaders(): Record<string, string> {
  return {
    [HttpHeader.Authorization]: formatBearerToken(getLogsApiKey())
  };
}

export async function computeContentHash(data: ArrayBuffer | Uint8Array | string): Promise<string> {
  return await computeContentChecksum(data);
}

export function generateSyntheticHash(prefix: string = 'a'): string {
  const timestamp = Date.now().toString(16).padStart(12, '0');
  const random = Math.random().toString(16).substring(2);
  const prefixHex = Array.from(prefix).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  const combined = `${prefixHex}${timestamp}${random}`;
  return combined.padEnd(64, '0').substring(0, 64);
}

export function generateValidHash(prefix: string = 'a'): string {
  return generateSyntheticHash(prefix);
}

export function generateValidGuid(): string {
  const hex = '0123456789abcdef';
  const variantChars = '89ab';
  const parts = [
    Array.from({ length: 8 }, () => hex[Math.floor(Math.random() * 16)]).join(''),
    Array.from({ length: 4 }, () => hex[Math.floor(Math.random() * 16)]).join(''),
    '4' + Array.from({ length: 3 }, () => hex[Math.floor(Math.random() * 16)]).join(''),
    variantChars[Math.floor(Math.random() * 4)] + Array.from({ length: 3 }, () => hex[Math.floor(Math.random() * 16)]).join(''),
    Array.from({ length: 12 }, () => hex[Math.floor(Math.random() * 16)]).join('')
  ];
  return parts.join('-');
}

export function generateTestMatchId(_prefix: string = 'test'): MatchId {
  const uuid = generateValidGuid();
  return asMatchId(uuid);
}

export function getValidOriginHeaders(): Record<string, string>;
export function getValidOriginHeaders(origin: string): Record<string, string>;
export function getValidOriginHeaders(origin?: string): Record<string, string> {
  return {
    [HttpHeader.Origin]: origin ?? getDefaultTestOrigin()
  };
}

export function getValidRequestHeaders(): Record<string, string>;
export function getValidRequestHeaders(userId: string): Record<string, string>;
export function getValidRequestHeaders(userId: string, isAdmin: boolean): Record<string, string>;
export function getValidRequestHeaders(userId: string, isAdmin: boolean, origin: string): Record<string, string>;
export function getValidRequestHeaders(
  userId: string = TestConfig.TestUserId,
  isAdmin?: boolean,
  origin?: string
): Record<string, string> {
  const effectiveAdmin = isAdmin ?? false;
  const effectiveOrigin = origin ?? getDefaultTestOrigin();
  return {
    ...getAuthHeaders(userId, effectiveAdmin),
    ...getValidOriginHeaders(effectiveOrigin)
  };
}

export function getValidAdminRequestHeaders(userId: string = TestConfig.TestAdminUserId): Record<string, string> {
  return getValidRequestHeaders(userId, true);
}

export function buildTestApiUrl(path: string, baseUrl: string = TestConfig.TestApiUrlPlaceholder): FullURL {
  return buildFullUrl(path, { baseUrl });
}

export function buildTestApiUrlForEndpoint(
  endpoint: ApiPath | string,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder
): ApiURL {
  return buildApiUrl(endpoint, { baseUrl });
}

export function buildTestApiUrlWithQuery(
  endpoint: ApiPath | string,
  queryParams: Record<string, string | number | boolean>,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder
): ApiURL {
  return buildApiUrlWithQueryParams(endpoint, queryParams, { baseUrl });
}

export function buildTestApiUrlWithPath(
  endpoint: ApiPath | string,
  pathParams: Record<string, string>,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder
): ApiURL {
  return buildApiUrlWithPathParams(endpoint, pathParams, { baseUrl });
}

export function buildTestApiUrlForEndpointWithPath(
  endpoint: ApiPath | string,
  resourceId: MatchId | string,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder
): ApiURL {
  const resourceIdString = typeof resourceId === 'string' ? resourceId : String(resourceId);
  return buildApiUrlWithPathParams(endpoint, { id: resourceIdString }, { baseUrl });
}

export function buildTestMatchApiUrl(
  matchId: MatchId,
  path: string,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder
): ApiURL {
  const matchPath = `${ApiEndpoint.Matches.Base}/${encodeURIComponent(matchId)}${path}`;
  return buildFullUrl(matchPath, { baseUrl }) as unknown as ApiURL;
}

export function buildTestBadgesApiUrl(
  userId: string,
  action?: string,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder
): ApiURL {
  const basePath = ApiEndpoint.Badges.Base;
  const path = action 
    ? `${basePath}/${encodeURIComponent(userId)}/${encodeURIComponent(action)}`
    : `${basePath}/${encodeURIComponent(userId)}`;
  return buildFullUrl(path, { baseUrl }) as unknown as ApiURL;
}

export function buildTestPlayersApiUrl(
  userId: string,
  action?: string,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder
): ApiURL {
  const basePath = ApiEndpoint.Players.Base;
  const path = action 
    ? `${basePath}/${encodeURIComponent(userId)}/${encodeURIComponent(action)}`
    : `${basePath}/${encodeURIComponent(userId)}`;
  return buildFullUrl(path, { baseUrl }) as unknown as ApiURL;
}

export function buildTestLeaderboardApiUrl(
  gameType: string | number,
  action?: string,
  userId?: string,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder
): ApiURL {
  const basePath = ApiEndpoint.Leaderboard.Base;
  let path = `${basePath}/${encodeURIComponent(String(gameType))}`;
  if (action) {
    path = `${path}/${encodeURIComponent(action)}`;
    if (userId) {
      path = `${path}/${encodeURIComponent(userId)}`;
    }
  }
  return buildFullUrl(path, { baseUrl }) as unknown as ApiURL;
}

export function buildCreditsApiUrl(
  userId: string,
  action: CreditAction,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder
): ApiURL {
  return buildCreditsApiUrlCore(userId, action, { baseUrl });
}

export function buildTestDisputesEvidenceApiUrl(
  disputeId: string,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder
): ApiURL {
  const path = ApiEndpoint.Disputes.Evidence(disputeId);
  return buildFullUrl(path, { baseUrl }) as unknown as ApiURL;
}

export function generateTestUserId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefix}-${timestamp}-${random}`;
}

export function validateRequestPrerequisites(
  url: string | URL | Request,
  init?: RequestInit
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  let urlString: string;
  if (typeof url === 'string') {
    urlString = url;
  } else if (url instanceof URL) {
    urlString = url.toString();
  } else if (url instanceof Request) {
    urlString = url.url;
  } else {
    errors.push('URL is not a string, URL, or Request object');
    return { valid: false, errors };
  }

  if (!urlString || urlString.trim().length === 0) {
    errors.push('URL is empty or whitespace-only');
  }

  if (urlString && !urlString.startsWith('http://') && !urlString.startsWith('https://') && !urlString.startsWith('/')) {
    errors.push(`URL must start with http://, https://, or /. Got: ${urlString.substring(0, 50)}`);
  }

  if (urlString) {
    try {
      if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
        new URL(urlString);
      } else if (urlString.startsWith('/')) {
        new URL(urlString, 'http://localhost');
      }
    } catch (urlError) {
      errors.push(`Invalid URL format: ${urlError instanceof Error ? urlError.message : String(urlError)}`);
    }
  }

  if (init?.method && ['POST', 'PUT', 'PATCH'].includes(init.method)) {
    if (init.body) {
      const headers = init.headers instanceof Headers ? init.headers : new Headers(init.headers || {});
      const isFormData = init.body instanceof FormData;
      const contentType = headers.get(HttpHeader.ContentType);
      const allowMissingContentType = headers.get('X-Test-Allow-Missing-Content-Type') === 'true';
      
      if (!contentType && !allowMissingContentType && !isFormData) {
        errors.push(`${init.method} request with body is missing Content-Type header. This may cause serialization issues.`);
      }
      
      if (typeof init.body === 'string' && init.body.length === 0) {
        errors.push(`${init.method} request has empty string body`);
      }
      
      if (isFormData && init.body instanceof FormData) {
        try {
          let hasEntries = false;
          for (const _ of init.body.entries()) {
            void _;
            hasEntries = true;
            break;
          }
          if (!hasEntries) {
            errors.push('FormData body is empty');
          }
        } catch (formDataError) {
          errors.push(`FormData body is invalid or already consumed: ${formDataError instanceof Error ? formDataError.message : String(formDataError)}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

export function failFastOnInvalidRequest(
  url: string | URL | Request,
  init?: RequestInit,
  context?: string
): void {
  const validation = validateRequestPrerequisites(url, init);
  if (!validation.valid) {
    const contextMsg = context ? ` [${context}]` : '';
    throw new Error(`[FAIL-FAST] Request prerequisites validation failed${contextMsg}: ${validation.errors.join('; ')}. This would cause a timeout. Fix the request before calling worker.fetch().`);
  }
}

const _seedLog = Logger.instance;
_seedLog.register(import.meta.url);

export async function seedTestManifest(
  worker: { fetch: (input: RequestInfo | URL, init?: RequestInit, token?: SetupContextToken) => Promise<Response> },
  manifestContent: string | ArrayBuffer,
  token?: SetupContextToken
): Promise<void> {
  const startTime = Date.now();
  const url = buildTestApiUrlForEndpointWithPath(ApiEndpoint.Assets.Base, TestValues.ManifestGuid);
  const validation = validateRequestPrerequisites(url, {
    method: HttpMethod.Put,
    headers: {
      ...getAdminAuthHeaders(),
      [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
      [HttpHeader.Origin]: TestConfig.LocalhostOrigin
    },
    body: typeof manifestContent === 'string' ? manifestContent : manifestContent
  });

  if (!validation.valid) {
    throw new Error(`[FAIL-FAST] Request prerequisites validation failed: ${validation.errors.join('; ')}`);
  }

  const response = await worker.fetch(
    url,
    {
      method: HttpMethod.Put,
      headers: {
        ...getAdminAuthHeaders(),
        [HttpHeader.ContentType]: HttpContentType.ApplicationJson,
        [HttpHeader.Origin]: TestConfig.LocalhostOrigin
      },
      body: typeof manifestContent === 'string' ? manifestContent : manifestContent
    },
    token
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to seed test manifest: ${response.status} ${errorText}`);
  }

  // Consume response body to release the connection (prevents request queuing)
  try { await response.text(); } catch { /* body may already be consumed */ }

  const duration = Date.now() - startTime;
  _seedLog.logInfo('[TEST] Manifest seeded successfully', getStackTrace(), { duration }, true);
}

/**
 * Loads a binary test fixture from tests/fixtures/assets/.
 *
 * In vitest-pool-workers (pool mode), uses FIXTURE_LOADER service binding when env is provided.
 * In threads mode (Node.js), reads directly from tests/fixtures/assets/ on disk.
 *
 * @param filename - The filename relative to tests/fixtures/assets/
 * @param env - Optional env from cloudflare:test (pool mode). Omit for threads mode (reads from disk).
 * @returns Promise that resolves to a Uint8Array containing the binary data
 * @throws Error if the file is not found
 */
export async function loadBinaryFixture(
  filename: string,
  env?: { FIXTURE_LOADER?: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> } }
): Promise<Uint8Array> {
  if (env?.FIXTURE_LOADER) {
    const response = await env.FIXTURE_LOADER.fetch(`http://fixture/${filename}`);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load binary fixture '${filename}': ${response.status} - ${errorText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }

  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const fixturesBase = join(__dirname, '..', 'fixtures', 'assets');
  const filePath = join(fixturesBase, filename);

  try {
    return new Uint8Array(readFileSync(filePath));
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      throw new Error(`Failed to load binary fixture '${filename}': File not found at ${filePath}`);
    }
    throw new Error(`Failed to load binary fixture '${filename}': ${error.message}`);
  }
}

/**
 * Loads a text test fixture using the FIXTURE_LOADER service binding.
 *
 * @param filename - The filename relative to tests/fixtures/assets/
 * @param env - The env object from cloudflare:test containing FIXTURE_LOADER
 * @returns Promise that resolves to the file contents as a string
 */
export async function loadTextFixture(
  filename: string,
  env?: { FIXTURE_LOADER?: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> } }
): Promise<string> {
  let fixtureEnv = env;

  if (!fixtureEnv) {
    try {
      const cloudflareTest = await import('cloudflare:test');
      if (cloudflareTest.env?.FIXTURE_LOADER) {
        fixtureEnv = cloudflareTest.env as { FIXTURE_LOADER: { fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> } };
      }
    } catch {
      fixtureEnv = undefined;
    }
  }

  if (fixtureEnv?.FIXTURE_LOADER) {
    const response = await fixtureEnv.FIXTURE_LOADER.fetch(`http://fixture/${filename}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to load text fixture '${filename}': ${response.status} - ${errorText}`);
    }

    return await response.text();
  }

  const { readFileSync } = await import('node:fs');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const fixturesBase = join(__dirname, '..', 'fixtures', 'assets');
  const filePath = join(fixturesBase, filename);

  try {
    return readFileSync(filePath, 'utf-8');
  } catch (err) {
    const error = err as NodeJS.ErrnoException;
    if (error.code === 'ENOENT') {
      throw new Error(`Failed to load text fixture '${filename}': File not found at ${filePath}`);
    }
    throw new Error(`Failed to load text fixture '${filename}': ${error.message}`);
  }
}
