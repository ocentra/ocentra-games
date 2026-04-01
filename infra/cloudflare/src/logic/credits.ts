import { TransactionType, Currency, CreditLedgerSource } from '@ocentra/endpoint-domain/constants/credits';
import { CreditsDO } from '@ocentra/endpoint-domain/constants/cloudflare-do';
import { HttpMethod } from '@ocentra/endpoint-domain/constants/http';
import { MetadataField, type IdempotencyKey as IdempotencyKeyType } from '@ocentra/endpoint-domain/constants/idempotency';
import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import { fetchFromCreditsDO } from '@/utils/durable-object-request';
import { getCurrentContext } from '@/logging/request-context';
import { validateAndExtractIdempotencyKey } from '@ocentra/endpoint-domain/validators/idempotency-validators';
import { formatPurchasedACDescription } from '@ocentra/endpoint-domain/utils/credit-descriptions';

export interface CreditBalance {
  user_id: string;
  gp_balance: number;
  ac_balance: number;
  last_updated: string;
  total_gp_earned: number;
  total_ac_purchased: number;
  total_ac_spent: number;
}

export interface CreditTransaction {
  transaction_id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  currency: Currency;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CreditStorage {
  getBalance(userId: string): Promise<CreditBalance>;
  saveBalance(balance: CreditBalance): Promise<void>;
  getTransactions(userId: string, limit: number): Promise<CreditTransaction[]>;
  addTransaction(transaction: CreditTransaction): Promise<void>;
}

export async function getCreditBalanceLogic(
  userId: string,
  storage: CreditStorage
): Promise<CreditBalance> {
  return await storage.getBalance(userId);
}

export interface EarnGPInput {
  userId: string;
  gpAmount: number;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface EarnGPResult {
  success: boolean;
  already_processed?: boolean;
  transaction_id?: string;
  new_balance?: number;
  error?: string;
}

/**
 * @mutation
 * @mutation-reason Economic calculation that must verify balance never decreases incorrectly and credits are conserved
 * @mutation-invariant GP balance increases by exactly gpAmount
 * @mutation-invariant total_gp_earned increases by exactly gpAmount
 * @mutation-invariant GP amount must be greater than 0
 */
export async function earnGPLogic(
  input: EarnGPInput,
  env: { CREDITS_DO?: DurableObjectNamespace }
): Promise<EarnGPResult> {
  if (input.gpAmount <= 0) {
    return { success: false, error: 'GP amount must be greater than 0' };
  }

  if (!env.CREDITS_DO) {
    return { success: false, error: 'CREDITS_DO not configured' };
  }

  try {
    const providedKey = input.metadata?.[MetadataField.IdempotencyKey] as string | undefined;
    const keyValidation = validateAndExtractIdempotencyKey(providedKey);
    if (!keyValidation.valid) {
      return { success: false, error: keyValidation.error };
    }
    const awardId = keyValidation.key;
    const creditsId = env.CREDITS_DO.idFromName(input.userId);
    const creditsStub = env.CREDITS_DO.get(creditsId);
    const doBody = {
      awardId,
      amount: input.gpAmount,
      description: input.description,
      source: input.metadata?.source as CreditLedgerSource || CreditLedgerSource.Other,
      metadata: input.metadata,
    };

    const response = await fetchFromCreditsDO(creditsStub, CreditsDO.Award, {
      method: HttpMethod.Post,
      body: JSON.stringify(doBody),
      correlationId: getCurrentContext()?.correlationId,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return { success: false, error: `CreditsDO error: ${response.status} ${errorText}` };
    }

    const result = await response.json() as { success: boolean; already_processed?: boolean; new_balance?: number; transaction_id?: string; error?: string };
    return {
      success: result.success,
      already_processed: result.already_processed,
      transaction_id: result.transaction_id || awardId,
      new_balance: result.new_balance,
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export interface PurchaseCreditsInput {
  userId: string;
  acAmount: number;
  usdAmount?: number;
  paymentMethod?: string;
  idempotencyKey?: IdempotencyKeyType;
  source?: CreditLedgerSource;
  description?: string;
}

export interface PurchaseCreditsResult {
  success: boolean;
  transaction_id?: string;
  new_balance?: number;
  ac_added?: number;
  already_processed?: boolean;
  error?: string;
}

export async function purchaseCreditsLogic(
  input: PurchaseCreditsInput,
  env: { CREDITS_DO?: DurableObjectNamespace },
  storage?: CreditStorage
): Promise<PurchaseCreditsResult> {
  if (input.acAmount <= 0 || !Number.isInteger(input.acAmount)) {
    return { success: false, error: 'AC amount must be a positive integer greater than 0' };
  }

  if (!env.CREDITS_DO) {
    return { success: false, error: 'CREDITS_DO not configured' };
  }

  try {
    if (!input.idempotencyKey) {
      return { success: false, error: 'Idempotency key is required' };
    }

    const keyValidation = validateAndExtractIdempotencyKey(input.idempotencyKey);
    if (!keyValidation.valid) {
      return { success: false, error: keyValidation.error };
    }
    const purchaseId = keyValidation.key;
    const creditsId = env.CREDITS_DO.idFromName(input.userId);
    const creditsStub = env.CREDITS_DO.get(creditsId);
    const doBody = {
      purchaseId,
      amount: input.acAmount,
      description: input.description ?? formatPurchasedACDescription(input.acAmount),
      source: input.source ?? CreditLedgerSource.Purchase,
      metadata: {
        usd_amount: input.usdAmount,
        payment_method: input.paymentMethod,
        [MetadataField.IdempotencyKeySnake]: purchaseId,
      },
    };

    const response = await fetchFromCreditsDO(creditsStub, CreditsDO.Purchase, {
      method: HttpMethod.Post,
      body: JSON.stringify(doBody),
      correlationId: getCurrentContext()?.correlationId,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return { success: false, error: `CreditsDO error: ${response.status} ${errorText}` };
    }

    const result = await response.json() as { success: boolean; already_processed?: boolean; new_balance?: number; transaction_id?: string; error?: string };

    if (!result.success) {
      return { success: false, error: result.error || 'Purchase failed' };
    }

    const purchaseResult: PurchaseCreditsResult = {
      success: true,
      transaction_id: result.transaction_id || purchaseId,
      new_balance: result.new_balance,
      ac_added: input.acAmount,
      already_processed: result.already_processed,
    };

    if (storage) {
      const transaction: CreditTransaction = {
        transaction_id: purchaseResult.transaction_id!,
        user_id: input.userId,
        type: TransactionType.Purchase,
        amount: input.acAmount,
        currency: Currency.AC,
        description: formatPurchasedACDescription(input.acAmount),
        timestamp: new Date().toISOString(),
        metadata: {
          usd_amount: input.usdAmount,
          payment_method: input.paymentMethod,
        },
      };

      try {
        await storage.addTransaction(transaction);
      } catch {
        // Transaction archiving is non-critical; failure is silently ignored
        void 0;
      }
    }

    return purchaseResult;
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getTransactionsLogic(
  userId: string,
  limit: number,
  storage: CreditStorage
): Promise<CreditTransaction[]> {
  const effectiveLimit = Math.min(limit, 100);
  return await storage.getTransactions(userId, effectiveLimit);
}
