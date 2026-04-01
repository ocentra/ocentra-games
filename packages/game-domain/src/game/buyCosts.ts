export const BUY_CURRENCY_VALUES = [
  "chips",
  "points",
  "money",
  "tokens",
  "NA",
  "Unknown",
] as const;

export const BY_RANK_KEYS = [
  "2-5",
  "6-K",
  "A",
  "2-10",
  "J",
  "Q",
  "K",
  "2-7",
  "8-K",
  "low",
  "mid",
  "high",
  "2-4",
  "2-6",
  "2-9",
  "3-7",
  "4-9",
  "10-A",
  "2-A",
  "7-A",
] as const;

export const NA_UNKNOWN_VALUES = [
  "NA",
  "not applicable",
  "Unknown",
] as const;

export const NA_OR_NOT_APPLICABLE_VALUES = ["NA", "not applicable"] as const;

export type BuyCurrency = (typeof BUY_CURRENCY_VALUES)[number];
export type ByRankKey = (typeof BY_RANK_KEYS)[number];
