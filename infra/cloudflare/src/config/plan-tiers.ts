
import type { PlanTierId } from '@ocentra/endpoint-domain/constants/credits';

export interface PlanTierConfig {
  name: string;
  monthlyTokenAllowance: number;
  overageRatePer1k: number;
  adsEnabled: boolean;
  leaderboardAccess: boolean;
  postMatchAnalysis: boolean;
  deepCoaching: boolean;
  badgesEnabled: boolean;
  earlyAccess: boolean;
  stripePriceId?: string;
}

export const DEFAULT_PLAN_TIERS: Record<PlanTierId, PlanTierConfig> = {
  // Free: ad-supported, minimal AI allowance, no premium features
  free: {
    name: 'Free',
    monthlyTokenAllowance: 10_000,   // ~20 move hints/mo with Haiku
    overageRatePer1k: 0.02,
    adsEnabled: true,
    leaderboardAccess: false,
    postMatchAnalysis: false,
    deepCoaching: false,
    badgesEnabled: false,
    earlyAccess: false,
  },
  // Arena Pass: $9.99/mo â€” no ads, full analysis, leaderboard
  pro: {
    name: 'Arena Pass',
    monthlyTokenAllowance: 100_000,  // ~200 move hints or ~5 full analyses/mo
    overageRatePer1k: 0.015,
    adsEnabled: false,
    leaderboardAccess: true,
    postMatchAnalysis: true,
    deepCoaching: false,
    badgesEnabled: true,
    earlyAccess: false,
    stripePriceId: '',               // Fill after Stripe product created
  },
  // Champion's Pass: $19.99/mo â€” everything + deep coaching + early access
  champion: {
    name: "Champion's Pass",
    monthlyTokenAllowance: 500_000,  // ~1000 move hints or ~25 full analyses/mo
    overageRatePer1k: 0.01,
    adsEnabled: false,
    leaderboardAccess: true,
    postMatchAnalysis: true,
    deepCoaching: true,
    badgesEnabled: true,
    earlyAccess: true,
    stripePriceId: '',               // Fill after Stripe product created
  },
  // Founder: one-time $149 â€” Champion's features, permanent, limited to 500 slots
  founder: {
    name: 'Founder',
    monthlyTokenAllowance: 500_000,  // Same allowance as Champion's
    overageRatePer1k: 0.01,
    adsEnabled: false,
    leaderboardAccess: true,
    postMatchAnalysis: true,
    deepCoaching: true,
    badgesEnabled: true,
    earlyAccess: true,
    stripePriceId: '',               // One-time Stripe payment, not subscription
  },
};

export type { PlanTierId };

export interface UserPlanState {
  tier: PlanTierId;
  periodStart: number;
  tokensUsedThisPeriod: number;
}

const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * @mutation
 * @mutation-reason Period boundary is used for allowance reset; wrong comparison would leak or withhold allowance
 * @mutation-invariant true only when (now - periodStart) >= PERIOD_MS
 */
export function isPeriodExpired(periodStart: number, now: number): boolean {
  return now - periodStart >= PERIOD_MS;
}

/**
 * @mutation
 * @mutation-reason Allowance remaining is money-critical for escrow; must be non-negative and reset when period expired
 * @mutation-invariant return >= 0
 * @mutation-invariant when period expired, return === tierConfig.monthlyTokenAllowance
 * @mutation-invariant when not expired, return === max(0, allowance - tokensUsedThisPeriod)
 */
export function getAllowanceRemaining(state: UserPlanState, tierConfig: PlanTierConfig, now: number): number {
  if (isPeriodExpired(state.periodStart, now)) return tierConfig.monthlyTokenAllowance;
  const used = state.tokensUsedThisPeriod;
  return Math.max(0, tierConfig.monthlyTokenAllowance - used);
}
