export const BETTING_LIMITS_VALUES = [
  "No Limit",
  "Fixed Limit",
  "Pot Limit",
  "Spread Limit",
  "None",
  "NA",
  "Unknown",
] as const;

export type BettingLimits = (typeof BETTING_LIMITS_VALUES)[number];
