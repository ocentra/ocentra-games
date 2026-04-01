/**
 * Cloudflare Worker internal API client.
 *
 * Used by Cloudflare Worker to make internal requests to Durable Objects.
 * Lightweight client without browser-specific features.
 */

import { BaseClient } from './baseClient';
import type { ClientConfig, ApiResponse } from './types';
import type { DOPath } from '@/types/brands';
import { MatchCoordinatorDO, CreditsDO } from '@/constants/cloudflare-do';
import { HttpHeader } from '@/constants/http';

/**
 * Cloudflare Worker internal API client.
 *
 * Provides typed methods for internal DO communication.
 */
export class CloudflareApiClient extends BaseClient {
  constructor(config: ClientConfig) {
    // Cloudflare Worker uses the same-origin or internal routing
    // No auth provider needed for internal calls
    super(config);
  }

  // ============================================================================
  // MatchCoordinatorDO
  // ============================================================================

  /**
   * Get match state from DO.
   */
  async getMatchState(matchId: string): Promise<ApiResponse<unknown>> {
    return this.get<unknown>(MatchCoordinatorDO.State(matchId) as unknown as import('@/types/brands').ApiPath);
  }

  /**
   * Create match in DO.
   */
  async createMatch(matchId: string, body: unknown): Promise<ApiResponse<unknown>> {
    return this.post<unknown>(MatchCoordinatorDO.Create(matchId) as unknown as import('@/types/brands').ApiPath, { body });
  }

  /**
   * Join match in DO.
   */
  async joinMatch(matchId: string, body: unknown): Promise<ApiResponse<unknown>> {
    return this.post<unknown>(MatchCoordinatorDO.Join(matchId) as unknown as import('@/types/brands').ApiPath, { body });
  }

  // ============================================================================
  // CreditsDO
  // ============================================================================

  /**
   * Get credit balance from DO.
   */
  async getCreditsBalance(body: { userId: string }): Promise<ApiResponse<unknown>> {
    return this.post<unknown>(CreditsDO.Balance as unknown as import('@/types/brands').ApiPath, { body });
  }

  /**
   * Get transactions from DO.
   */
  async getCreditsTransactions(body: { userId: string; limit?: number; cursor?: string }): Promise<ApiResponse<unknown>> {
    return this.post<unknown>(CreditsDO.Transactions as unknown as import('@/types/brands').ApiPath, { body });
  }

  /**
   * Award credits via DO.
   */
  async awardCredits(body: { userId: string; amount: number; currency: 'GP'; reason: string }): Promise<ApiResponse<unknown>> {
    return this.post<unknown>(CreditsDO.Award as unknown as import('@/types/brands').ApiPath, { body });
  }

  /**
   * Purchase credits via DO.
   */
  async purchaseCredits(body: { userId: string; amount: number; currency: 'AC'; paymentMethod: string; paymentToken: string }): Promise<ApiResponse<unknown>> {
    return this.post<unknown>(CreditsDO.Purchase as unknown as import('@/types/brands').ApiPath, { body });
  }

  /**
   * Consume credits via DO.
   */
  async consumeCredits(body: { userId: string; amount: number; currency: 'GP' | 'AC'; reason: string }): Promise<ApiResponse<unknown>> {
    return this.post<unknown>(CreditsDO.Consume as unknown as import('@/types/brands').ApiPath, { body });
  }

  // ============================================================================
  // Internal Request Helpers
  // ============================================================================

  /**
   * Make request to Durable Object.
   *
   * This is the primary method for DO communication.
   * Takes a DO stub and path, returns the response.
   */
  async fetchFromDO<T>(
    stub: { fetch: typeof fetch },
    path: DOPath,
    init?: RequestInit
  ): Promise<ApiResponse<T>> {
    const requestInit: RequestInit = {
      ...init,
      headers: {
        [HttpHeader.ContentType]: 'application/json',
        ...init?.headers,
      },
    };

    const response = await stub.fetch(path, requestInit);

    let data: T;
    const contentType = response.headers.get(HttpHeader.ContentType) ?? '';

    if (contentType.includes('application/json')) {
      data = await response.json() as T;
    } else if (response.status === 204) {
      data = undefined as T;
    } else {
      data = await response.text() as unknown as T;
    }

    return {
      data,
      status: response.status,
      headers: response.headers,
    };
  }
}

// Re-export types for convenience
export type { ClientConfig, ApiResponse, ApiError } from './types';
