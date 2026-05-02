import { HttpMethod, HttpHeader, HttpContentType } from '@ocentra/endpoint-domain/constants/http';
import type { DurableObjectStub } from '@cloudflare/workers-types';
import { decodeDORequestURL, type DORequestURL } from '@ocentra/endpoint-domain/utils/url-builder';
import { decodeDOPath, type DOPath } from '@ocentra/endpoint-domain/types/brands';

const DO_BASE_URL = 'http://dummy';

export interface DORequestOptions {
  method: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  correlationId?: string;
}

function createDOPath(path: string): DOPath {
  if (!path) {
    throw new Error('DO path cannot be null or undefined');
  }
  
  if (typeof path !== 'string') {
    throw new Error(`DO path must be a string, got ${typeof path}`);
  }
  
  const trimmedPath = path.trim();
  
  if (!trimmedPath.startsWith('/')) {
    throw new Error(`DO path must start with '/', got: "${path}"`);
  }

  return decodeDOPath(trimmedPath);
}

function createDORequestURL(path: DOPath): DORequestURL {
  const url = new URL(DO_BASE_URL);
  const pathWithoutQuery = path.split('?')[0];
  const queryString = path.includes('?') ? path.split('?')[1] : '';
  url.pathname = pathWithoutQuery;
  if (queryString) {
    url.search = queryString;
  }
  return decodeDORequestURL(url.toString());
}

export function createDORequest(
  path: string,
  options: DORequestOptions
): Request {
  const validatedPath = createDOPath(path);
  const requestUrl = createDORequestURL(validatedPath);

  const headers = new Headers(options.headers);
  if (options.body && !headers.has(HttpHeader.ContentType)) {
    headers.set(HttpHeader.ContentType, HttpContentType.ApplicationJson);
  }
  if (options.correlationId) {
    headers.set(HttpHeader.XCorrelationId, options.correlationId);
  }

  return new Request(requestUrl, {
    method: options.method,
    headers,
    body: options.body,
  });
}

export async function fetchFromDO(
  stub: { fetch: DurableObjectStub['fetch'] },
  path: string,
  options: DORequestOptions
): Promise<Response> {
  if (!stub) {
    throw new Error('Durable Object stub is null or undefined - DO binding not properly configured');
  }

  if (typeof stub.fetch !== 'function') {
    throw new Error('Durable Object stub.fetch is not a function - invalid stub object');
  }

  const request = createDORequest(path, options);
  
  try {
    return await stub.fetch(request);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('cannot load') || errorMessage.includes('Failed to fetch')) {
      throw new Error(`DO fetch failed for path "${path}": ${errorMessage}. Check DO binding configuration.`);
    }
    throw error;
  }
}

export async function fetchFromCreditsDO(
  stub: DurableObjectStub,
  path: string,
  options: DORequestOptions
): Promise<Response> {
  return fetchFromDO(stub, path, options);
}
