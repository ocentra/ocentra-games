export const HAND_RANK_HIGH_VALUES = [
  "standard_poker",
  "deuce_to_seven",
  "badugi",
  "chinese_poker_front",
  "NA",
  "Unknown",
] as const;

export const HAND_RANK_LOW_VALUES = [
  "ace_to_five",
  "ace_to_five_8_or_better",
  "deuce_to_seven",
  "ace_to_six",
  "NA",
  "Unknown",
] as const;

export type HandRankHigh = (typeof HAND_RANK_HIGH_VALUES)[number] | null;
export type HandRankLow = (typeof HAND_RANK_LOW_VALUES)[number] | null;
