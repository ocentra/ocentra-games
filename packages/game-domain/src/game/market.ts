export const REFILL_FROM_VALUES = ["stock", "discard", "none"] as const;
export const REFILL_TIMING_VALUES = [
  "immediately_after_purchase",
  "end_of_round",
  "start_of_round",
] as const;
export const MARKET_VISIBILITY_VALUES = ["face_up", "face_down"] as const;

export type RefillFrom = (typeof REFILL_FROM_VALUES)[number];
export type RefillTiming = (typeof REFILL_TIMING_VALUES)[number];
export type MarketVisibility = (typeof MARKET_VISIBILITY_VALUES)[number];
