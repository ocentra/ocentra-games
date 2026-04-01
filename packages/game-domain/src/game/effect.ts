export const EFFECT_TYPE_VALUES = [
  "draw",
  "play",
  "discard",
  "buy",
  "bet",
  "raise",
  "deal",
  "reveal",
  "declare",
  "award",
  "pass",
  "meld",
  "bid",
  "fold",
  "ante",
  "custom",
  "NA",
  "not applicable",
  "Unknown",
] as const;

export const COST_VALUES = [
  "0",
  "NA",
  "match_current_bet",
  "min_raise",
  "min_bet",
  "byRank",
  "pot_limit",
] as const;

export const COST_TYPE_FLAT = "flat" as const;
export const COST_TYPE_MATCH_CURRENT_BET = "match_current_bet" as const;
export const COST_TYPE_MIN_BET = "min_bet" as const;
export const COST_TYPE_MIN_RAISE = "min_raise" as const;
export const COST_TYPE_POT_LIMIT = "pot_limit" as const;
export const COST_TYPE_BY_RANK = "byRank" as const;

export const LIMIT_TYPE_VALUES = [
  "fixed",
  "pot_limit",
  "no_limit",
  "spread_limit",
] as const;

export const COST_SOURCE_VALUES = ["byRank", "flat", "market", "stock"] as const;

export type EffectType = (typeof EFFECT_TYPE_VALUES)[number];
export type Cost = (typeof COST_VALUES)[number];
export type LimitType = (typeof LIMIT_TYPE_VALUES)[number];
export type CostSource = (typeof COST_SOURCE_VALUES)[number];
