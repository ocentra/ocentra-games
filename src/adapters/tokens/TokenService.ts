/**
 * TokenService - Manages Game Points (GP) and AI Credits (AC) operations.
 * Per spec Section 20: Economic model - token system.
 * 
 * Note: Token balances are stored in database (source of truth), not on-chain.
 * On-chain UserAccount stores aggregates for leaderboards/verification.
 */

import { GameClient } from '@ocentra/solana-domain/GameClient';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

export interface TokenBalance {
  userId: string;
  gpBalance: number;
  acBalance: number;
  lastSyncedSlot?: number;
  pendingTransactions?: string[];
}

export interface DailyLoginResult {
  success: boolean;
  gpEarned: number;
  multiplier: number;
  nextClaimTime: number;
  error?: string;
}

export interface AdRewardResult {
  success: boolean;
  gpEarned: number;
  nextAdTime: number;
  error?: string;
}

export interface GamePaymentResult {
  success: boolean;
  gpSpent: number;
  error?: string;
}

export interface AICreditConsumptionResult {
  success: boolean;
  acSpent: number;
  error?: string;
}

/**
 * TokenService handles all token operations.
 * Database is source of truth for balances; on-chain is for verification.
 */
export class TokenService {
  static {
    log.register(import.meta.url);
  }

  private apiBaseUrl: string;

  constructor(_gameClient: GameClient, apiBaseUrl?: string) {
    // gameClient reserved for future on-chain operations
    this.apiBaseUrl = apiBaseUrl || '/api';
  }

  /**
   * Gets token balance for a user from database.
   * Per spec Section 20.1.1: Database is source of truth.
   */
  async getBalance(userId: string): Promise<TokenBalance | null> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/tokens/balance/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // User not found
        }
        throw new Error(`Failed to get balance: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logError('Failed to get balance:', { data: error });
      throw error;
    }
  }

  /**
   * Claims daily login reward (GP).
   * Per spec Section 20.1.2: Daily login system with 24-hour cooldown.
   */
  async claimDailyLogin(userId: string): Promise<DailyLoginResult> {
    try {
      // 1. Update database (source of truth)
      const response = await fetch(`${this.apiBaseUrl}/tokens/daily-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          gpEarned: 0,
          multiplier: 1,
          nextClaimTime: 0,
          error: error.message || 'Failed to claim daily login',
        };
      }

      const result = await response.json();

      // 2. Submit to Solana (async, non-blocking)
      // The API endpoint handles this, but we can also do it here if needed
      if (result.solanaTxSignature) {
        // Transaction submitted, will be confirmed asynchronously
        logInfo('Daily login transaction submitted:', { data: result.solanaTxSignature });
      }

      return {
        success: true,
        gpEarned: result.gpEarned,
        multiplier: result.multiplier,
        nextClaimTime: result.nextClaimTime,
      };
    } catch (error) {
      logError('Failed to claim daily login:', { data: error });
      return {
        success: false,
        gpEarned: 0,
        multiplier: 1,
        nextClaimTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Claims ad reward (GP).
   * Per spec Section 20.1.4: Ad reward system with cooldown.
   */
  async claimAdReward(userId: string, adVerificationSignature: Uint8Array): Promise<AdRewardResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/tokens/ad-reward`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          adVerificationSignature: Array.from(adVerificationSignature),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          gpEarned: 0,
          nextAdTime: 0,
          error: error.message || 'Failed to claim ad reward',
        };
      }

      const result = await response.json();

      return {
        success: true,
        gpEarned: result.gpEarned,
        nextAdTime: result.nextAdTime,
      };
    } catch (error) {
      logError('Failed to claim ad reward:', { data: error });
      return {
        success: false,
        gpEarned: 0,
        nextAdTime: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Records game payment (GP cost).
   * Per spec Section 20.1.3: Game payment flow.
   * Note: GP balance check happens in database before calling this.
   */
  async payForGame(userId: string, matchId: string): Promise<GamePaymentResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/tokens/game-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, matchId }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          gpSpent: 0,
          error: error.message || 'Failed to pay for game',
        };
      }

      const result = await response.json();

      return {
        success: true,
        gpSpent: result.gpSpent,
      };
    } catch (error) {
      logError('Failed to pay for game:', { data: error });
      return {
        success: false,
        gpSpent: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Records AI credit consumption.
   * Per spec Section 20.1.6: AI credit consumption for API calls.
   * Note: AC balance check happens in database before calling this.
   */
  async consumeAICredits(
    userId: string,
    modelId: number,
    tokensUsed: number
  ): Promise<AICreditConsumptionResult> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/tokens/ai-credits/consume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          modelId,
          tokensUsed,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          acSpent: 0,
          error: error.message || 'Failed to consume AI credits',
        };
      }

      const result = await response.json();

      return {
        success: true,
        acSpent: result.acSpent,
      };
    } catch (error) {
      logError('Failed to consume AI credits:', { data: error });
      return {
        success: false,
        acSpent: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

