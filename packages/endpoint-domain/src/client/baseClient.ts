/**
 * Abstract base HTTP client.
 *
 * Provides common functionality for all API clients.
 * Platform-specific implementations (browser, cloudflare) extend this.
 */

import type {
  ClientConfig,
  RequestOptions,
  ApiResponse,
  ApiError,
  AuthProvider,
  ClientMiddleware,
  RequestContext,
} from './types';
import type { ApiPath } from '@/types/brands';
import { HttpHeader, ContentType } from '@/constants/http';

/**
 * Default client configuration.
 */
const DEFAULT_CONFIG: Required<Omit<ClientConfig, 'baseUrl' | 'fetch' | 'authProvider'>> = {
  timeoutMs: 30000,
  maxRetries: 3,
  retryDelayMs: 1000,
};

/**
 * Generate a unique request ID.
 */
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Build URL with query parameters.
 */
function buildUrl(baseUrl: string, path: ApiPath, query?: Record<string, unknown>): string {
  const url = new URL(path, baseUrl);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

/**
 * Abstract base HTTP client.
 */
export abstract class BaseClient {
  protected config: Required<ClientConfig> & { fetch: typeof fetch };
  protected authProvider?: AuthProvider;
  protected middleware: ClientMiddleware[] = [];

  constructor(config: ClientConfig, authProvider?: AuthProvider) {
    this.config = {
      ...DEFAULT_CONFIG,
      fetch: globalThis.fetch.bind(globalThis),
      ...config,
    };
    this.authProvider = authProvider;
  }

  /**
   * Add middleware to the client.
   */
  addMiddleware(middleware: ClientMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Remove middleware from the client.
   */
  removeMiddleware(middleware: ClientMiddleware): void {
    const index = this.middleware.indexOf(middleware);
    if (index > -1) {
      this.middleware.splice(index, 1);
    }
  }

  /**
   * Make an HTTP request.
   */
  async request<T>(path: ApiPath, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const requestId = generateRequestId();
    const context: RequestContext = {
      requestId,
      path,
      method: options.method ?? 'GET',
      startTime: Date.now(),
    };

    // Apply beforeRequest middleware
    for (const mw of this.middleware) {
      if (mw.beforeRequest) {
        await mw.beforeRequest(options, context);
      }
    }

    try {
      const response = await this.executeRequest<T>(path, options, context);

      // Apply afterResponse middleware
      let result = response;
      for (const mw of this.middleware) {
        if (mw.afterResponse) {
          result = await mw.afterResponse(result, context);
        }
      }

      return result;
    } catch (error) {
      // Apply onError middleware
      for (const mw of this.middleware) {
        if (mw.onError) {
          await mw.onError(error as ApiError, context);
        }
      }
      throw error;
    }
  }

  /**
   * Execute the HTTP request with retry logic.
   */
  private async executeRequest<T>(
    path: ApiPath,
    options: RequestOptions,
    context: RequestContext,
    attempt: number = 0
  ): Promise<ApiResponse<T>> {
    const { baseUrl, fetch, timeoutMs, maxRetries, retryDelayMs } = this.config;
    const { method = 'GET', headers = {}, body, query, skipRetry } = options;

    // Build URL with query parameters
    const url = buildUrl(baseUrl, path, query);

    // Prepare request init
    const requestInit: RequestInit = {
      method,
      headers: {
        [HttpHeader.Accept]: ContentType.ApplicationJson,
        ...headers,
      },
    };

    // Add auth headers if available
    if (this.authProvider) {
      const authHeaders = await this.authProvider.getAuthHeaders();
      Object.assign(requestInit.headers as Record<string, string>, authHeaders);
    }

    // Add body for non-GET requests
    if (body !== undefined && method !== 'GET') {
      (requestInit.headers as Record<string, string>)[HttpHeader.ContentType] = ContentType.ApplicationJson;
      requestInit.body = JSON.stringify(body);
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    requestInit.signal = controller.signal;

    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? timeoutMs);

    try {
      const response = await fetch(url, requestInit);
      clearTimeout(timeoutId);

      // Parse response body
      let data: T;
      const contentType = response.headers.get(HttpHeader.ContentType) ?? '';

      if (contentType.includes(ContentType.ApplicationJson)) {
        data = await response.json() as T;
      } else if (response.status === 204) {
        data = undefined as T;
      } else {
        data = await response.text() as unknown as T;
      }

      // Handle error responses
      if (!response.ok) {
        const error = this.createApiError(response, data);

        // Retry on certain status codes
        if (!skipRetry && this.shouldRetry(response.status) && attempt < maxRetries) {
          await this.delay(retryDelayMs * (attempt + 1));
          return this.executeRequest(path, options, context, attempt + 1);
        }

        throw error;
      }

      return {
        data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle timeout
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError: ApiError = {
          code: 'TIMEOUT',
          message: `Request timeout after ${options.timeoutMs ?? timeoutMs}ms`,
          status: 0,
          requestId: context.requestId,
        };

        if (!skipRetry && attempt < maxRetries) {
          await this.delay(retryDelayMs * (attempt + 1));
          return this.executeRequest(path, options, context, attempt + 1);
        }

        throw timeoutError;
      }

      // Re-throw API errors
      if (this.isApiError(error)) {
        throw error;
      }

      // Wrap unknown errors
      const wrappedError: ApiError = {
        code: 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 0,
        requestId: context.requestId,
      };

      throw wrappedError;
    }
  }

  /**
   * Create an ApiError from response.
   */
  private createApiError(response: Response, data: unknown): ApiError {
    const errorData = data as Record<string, unknown> | undefined;

    return {
      code: (errorData?.code as string) || `HTTP_${response.status}`,
      message: (errorData?.message as string) || response.statusText,
      status: response.status,
      details: errorData?.details as Record<string, string[]> | undefined,
      requestId: response.headers.get('X-Request-Id') || undefined,
    };
  }

  /**
   * Check if error is an ApiError.
   */
  private isApiError(error: unknown): error is ApiError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'status' in error
    );
  }

  /**
   * Determine if a request should be retried.
   */
  private shouldRetry(status: number): boolean {
    // Retry on rate limit (429) and server errors (5xx)
    return status === 429 || (status >= 500 && status < 600);
  }

  /**
   * Delay for retry.
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request.
   */
  get<T>(path: ApiPath, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  /**
   * POST request.
   */
  post<T>(path: ApiPath, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'POST' });
  }

  /**
   * PUT request.
   */
  put<T>(path: ApiPath, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PUT' });
  }

  /**
   * PATCH request.
   */
  patch<T>(path: ApiPath, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'PATCH' });
  }

  /**
   * DELETE request.
   */
  delete<T>(path: ApiPath, options?: Omit<RequestOptions, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}
