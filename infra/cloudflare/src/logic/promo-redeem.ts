import type { KVNamespace } from '@cloudflare/workers-types';
import { CreditLedgerSource } from '@ocentra/endpoint-domain/constants/credits';
import { MetadataField, asIdempotencyKey } from '@ocentra/endpoint-domain/constants/idempotency';
import type { DurableObjectNamespace } from '@cloudflare/workers-types';
import { earnGPLogic } from '@/logic/credits';
import { purchaseCreditsLogic } from '@/logic/credits';

const PROMO_KEY_PREFIX = 'promo:';
const PROMO_REDEEMED_PREFIX = 'promo:redeemed:';

export interface PromoRecord {
  ac?: number;
  gp?: number;
  max_redemptions?: number;
}

export interface RedeemPromoInput {
  code: string;
  userId: string;
}

export interface PreloadedPromo {
  ac: number;
  gp: number;
}

export interface RedeemPromoResult {
  success: boolean;
  already_redeemed?: boolean;
  ac_added?: number;
  gp_added?: number;
  new_ac_balance?: number;
  new_gp_balance?: number;
  error?: string;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

function promoKey(code: string): string {
  return `${PROMO_KEY_PREFIX}${normalizeCode(code)}`;
}

function redeemedKey(code: string, userId: string): string {
  return `${PROMO_REDEEMED_PREFIX}${normalizeCode(code)}:${userId}`;
}

function idempotencyKey(code: string, userId: string): string {
  return `promo-${normalizeCode(code)}-${userId}`;
}

/**
 * @mutation
 * @mutation-reason Promo redemption is money-critical; duplicate redemption must return already_redeemed; ac/gp awarded exactly once per code per user
 * @mutation-invariant already_redeemed true only when redeemedKey already exists
 * @mutation-invariant ac_added + gp_added match promo amounts on first redeem
 * @mutation-invariant Invalid/empty code or missing env returns success: false with error
 */
export async function redeemPromoLogic(
  input: RedeemPromoInput,
  env: { PROMO_KV?: KVNamespace; CREDITS_DO?: DurableObjectNamespace },
  preloaded?: PreloadedPromo
): Promise<RedeemPromoResult> {
  const code = input.code?.trim();
  if (!code) {
    return { success: false, error: 'Code is required' };
  }
  if (!env.PROMO_KV) {
    return { success: false, error: 'PROMO_KV not configured' };
  }
  if (!env.CREDITS_DO) {
    return { success: false, error: 'CREDITS_DO not configured' };
  }

  let ac: number;
  let gp: number;

  if (preloaded !== undefined) {
    ac = Math.max(0, Math.floor(Number(preloaded.ac) || 0));
    gp = Math.max(0, Math.floor(Number(preloaded.gp) || 0));
  } else {
    const key = promoKey(code);
    const raw = await env.PROMO_KV.get(key);
    if (!raw) {
      return { success: false, error: 'Invalid or expired code' };
    }
    let promo: PromoRecord;
    try {
      promo = JSON.parse(raw) as PromoRecord;
    } catch {
      return { success: false, error: 'Invalid or expired code' };
    }
    ac = Math.max(0, Math.floor(Number(promo.ac) || 0));
    gp = Math.max(0, Math.floor(Number(promo.gp) || 0));
  }

  if (ac === 0 && gp === 0) {
    return { success: false, error: 'Invalid or expired code' };
  }

  const redeemedKeyStr = redeemedKey(code, input.userId);
  const existing = await env.PROMO_KV.get(redeemedKeyStr);
  if (existing) {
    return { success: true, already_redeemed: true };
  }

  await env.PROMO_KV.put(redeemedKeyStr, '1');

  const idemBase = idempotencyKey(code, input.userId);
  const idemGp = `${idemBase}-gp`;
  const idemAc = `${idemBase}-ac`;
  let newAcBalance: number | undefined;
  let newGpBalance: number | undefined;

  if (gp > 0) {
    const earnResult = await earnGPLogic(
      {
        userId: input.userId,
        gpAmount: gp,
        description: `Promo: ${normalizeCode(code)}`,
        metadata: {
          [MetadataField.IdempotencyKey]: idemGp,
          source: CreditLedgerSource.Promo,
        },
      },
      env
    );
    if (!earnResult.success && !earnResult.already_processed) {
      await env.PROMO_KV.delete(redeemedKeyStr);
      return { success: false, error: earnResult.error ?? 'Failed to award GP' };
    }
    newGpBalance = earnResult.new_balance;
  }

  if (ac > 0) {
    const purchaseResult = await purchaseCreditsLogic(
      {
        userId: input.userId,
        acAmount: ac,
        idempotencyKey: asIdempotencyKey(idemAc),
        source: CreditLedgerSource.Promo,
        description: `Promo: ${normalizeCode(code)}`,
      },
      env
    );
    if (!purchaseResult.success && !purchaseResult.already_processed) {
      return { success: false, error: purchaseResult.error ?? 'Failed to award AC', gp_added: gp > 0 ? gp : undefined, new_gp_balance: newGpBalance };
    }
    newAcBalance = purchaseResult.new_balance;
  }

  return {
    success: true,
    ac_added: ac > 0 ? ac : undefined,
    gp_added: gp > 0 ? gp : undefined,
    new_ac_balance: newAcBalance,
    new_gp_balance: newGpBalance,
  };
}
