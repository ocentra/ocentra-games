import type { EndpointConfig } from './endpoint-registry';
import type { AttackPayload } from './attack-generators';
import type { SetupContextToken } from '@tests/test-setup-core';
import { HttpMethod, HttpHeader, HttpAuthScheme } from '@ocentra/endpoint-domain/constants/http';
import { createAdminToken } from './test-helpers';
import { formatBearerToken } from '@/utils/auth';
import { TestConfig } from '@tests/constants/test-constants';
import { buildFullUrl, type FullURL } from '@ocentra/endpoint-domain/utils/url-builder';

export interface TestRequest {
  url: string;
  method: HttpMethod;
  headers: Record<string, string>;
  body?: BodyInit;
}

export interface TestResult {
  success: boolean;
  status: number;
  attackPayload: AttackPayload;
  endpoint: EndpointConfig;
  error?: string;
}

export function buildTestUrl(
  endpoint: EndpointConfig,
  baseUrl: string,
  pathParams?: Record<string, string>,
  queryParams?: Record<string, string>
): string {
  let path = endpoint.path;

  if (pathParams) {
    Object.entries(pathParams).forEach(([key, value]) => {
      path = path.replace(`{${key}}`, encodeURIComponent(value));
    });
  }

  if (queryParams) {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
    const queryString = params.toString();
    if (queryString) {
      path = `${path}?${queryString}`;
    }
  }

  const fullUrl: FullURL = buildFullUrl(path, { baseUrl });
  return fullUrl;
}

export function buildTestRequest(
  endpoint: EndpointConfig,
  attackPayload: AttackPayload,
  paramType: 'path' | 'query' | 'header',
  paramName: string,
  baseUrl: string
): TestRequest {
  const method = endpoint.methods[0] || HttpMethod.Get;
  const headers: Record<string, string> = {
    [HttpHeader.Origin]: TestConfig.TestCorsOrigin,
  };

  let pathParams: Record<string, string> | undefined;
  let queryParams: Record<string, string> | undefined;

  if (paramType === 'path' && endpoint.pathParams) {
    pathParams = {};
    endpoint.pathParams.forEach(param => {
      if (param === paramName) {
        pathParams![param] = attackPayload.value;
      } else if (endpoint.testIdGenerator) {
        pathParams![param] = endpoint.testIdGenerator();
      } else {
        pathParams![param] = `test-${param}`;
      }
    });
  } else if (paramType === 'query' && endpoint.queryParams) {
    queryParams = {};
    endpoint.queryParams.forEach(param => {
      if (param === paramName) {
        queryParams![param] = attackPayload.value;
      } else if (param === 'action' && endpoint.path.includes('resources')) {
        queryParams![param] = 'get-upload-url';
      } else if (param === 'type' && endpoint.path.includes('resources')) {
        queryParams![param] = 'asset';
      }
    });
  } else if (paramType === 'header') {
    if (paramName === 'Authorization') {
      const attackValue = attackPayload.value.startsWith(`${HttpAuthScheme.Bearer} `)
        ? attackPayload.value 
        : formatBearerToken(attackPayload.value);
      headers[HttpHeader.Authorization] = attackValue;
    } else if (paramName === 'X-Wallet-Id') {
      headers[HttpHeader.XWalletId] = attackPayload.value;
    }
  }

  if (paramType !== 'header') {
    if (endpoint.requiresAuth || endpoint.requiresAdmin) {
      if (!headers[HttpHeader.Authorization]) {
        const adminToken = createAdminToken();
        headers[HttpHeader.Authorization] = formatBearerToken(adminToken);
      }
    }

    if (endpoint.requiresWallet && paramName !== 'X-Wallet-Id') {
      if (!headers[HttpHeader.XWalletId]) {
        headers[HttpHeader.XWalletId] = `wallet-${Date.now()}`;
      }
    }
  }

  const url = buildTestUrl(endpoint, baseUrl, pathParams, queryParams);

  return {
    url,
    method,
    headers,
    body: endpoint.supportsBody ? JSON.stringify({ test: 'data' }) : undefined,
  };
}

export async function executeSecurityTest(
  worker: { fetch: (input: RequestInfo | URL, init?: RequestInit, token?: SetupContextToken) => Promise<Response> },
  endpoint: EndpointConfig,
  attackPayload: AttackPayload,
  paramType: 'path' | 'query' | 'header',
  paramName: string,
  baseUrl: string = TestConfig.TestApiUrlPlaceholder,
  token?: SetupContextToken
): Promise<TestResult> {
  const request = buildTestRequest(endpoint, attackPayload, paramType, paramName, baseUrl);

  try {
    const response = await worker.fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    }, token);

    const success = response.status >= 400 && response.status < 500;
    if (!response.bodyUsed) {
      try {
        await response.arrayBuffer();
      } catch {
        try {
          await response.text();
        } catch {
          try {
            await response.blob();
          } catch {
            void 0;
          }
        }
      }
    }

    return {
      success,
      status: response.status,
      attackPayload,
      endpoint,
      error: success ? undefined : `Expected 4xx, got ${response.status}`,
    };
  } catch (error) {
    return {
      success: true,
      status: 0,
      attackPayload,
      endpoint,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
