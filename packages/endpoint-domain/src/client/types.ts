/**
 * Client configuration types.
 */

import type { ApiPath } from '@/types/brands';

/**
 * Base configuration for API clients.
 */
export interface ClientConfig {
  /**
   * Base URL for API requests.
   * Example: 'https://api.ocentra.com' or 'http://localhost:8787'
   */
  baseUrl: string;

  /**
   * Optional custom fetch implementation.
   * Defaults to global fetch.
   */
  fetch?: typeof fetch;

  /**
   * Request timeout in milliseconds.
   * Default: 30000 (30 seconds)
   */
  timeoutMs?: number;

  /**
   * Maximum number of retry attempts for failed requests.
   * Default: 3
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds.
   * Default: 1000
   */
  retryDelayMs?: number;
}

/**
 * HTTP request options.
 */
export interface RequestOptions {
  /**
   * HTTP method.
   */
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

  /**
   * Request headers.
   */
  headers?: Record<string, string>;

  /**
   * Request body (will be JSON stringified).
   */
  body?: unknown;

  /**
   * Query parameters.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query?: Record<string, any>;

  /**
   * Request timeout override in milliseconds.
   */
  timeoutMs?: number;

  /**
   * Skip retry logic for this request.
   */
  skipRetry?: boolean;
}

/**
 * API response wrapper.
 */
export interface ApiResponse<T> {
  /**
   * Response data (parsed JSON).
   */
  data: T;

  /**
   * HTTP status code.
   */
  status: number;

  /**
   * Response headers.
   */
  headers: Headers;
}

/**
 * API error response.
 */
export interface ApiError {
  /**
   * Error code.
   */
  code: string;

  /**
   * Human-readable error message.
   */
  message: string;

  /**
   * HTTP status code.
   */
  status: number;

  /**
   * Additional error details.
   */
  details?: Record<string, string[]>;

  /**
   * Request ID for tracing.
   */
  requestId?: string;
}

/**
 * Auth provider interface.
 * Consumers implement this to provide authentication.
 */
export interface AuthProvider {
  /**
   * Get authentication headers for requests.
   * Called before each request to get fresh tokens.
   */
  getAuthHeaders(): Promise<Record<string, string>> | Record<string, string>;
}

/**
 * Rate limit information from response headers.
 */
export interface RateLimitInfo {
  /**
   * Maximum number of requests allowed.
   */
  limit: number;

  /**
   * Remaining requests in current window.
   */
  remaining: number;

  /**
   * Unix timestamp when the rate limit resets.
   */
  resetAt: number;
}

/**
 * Request context for logging/debugging.
 */
export interface RequestContext {
  /**
   * Unique request ID.
   */
  requestId: string;

  /**
   * Endpoint path.
   */
  path: ApiPath;

  /**
   * HTTP method.
   */
  method: string;

  /**
   * Start time (for latency calculation).
   */
  startTime: number;
}

/**
 * Client middleware for request/response interception.
 */
export interface ClientMiddleware {
  /**
   * Called before request is sent.
   * Can modify request options.
   */
  beforeRequest?(options: RequestOptions, context: RequestContext): Promise<void> | void;

  /**
   * Called after response is received.
   * Can modify response or handle errors.
   */
  afterResponse?<T>(response: ApiResponse<T>, context: RequestContext): Promise<ApiResponse<T>> | ApiResponse<T>;

  /**
   * Called when request fails.
   * Can handle errors or retry.
   */
  onError?(error: ApiError, context: RequestContext): Promise<void> | void;
}
