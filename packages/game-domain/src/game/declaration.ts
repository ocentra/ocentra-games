export const DECLARATION_TYPE_VALUES = [
  "chips_in_fist",
  "verbal",
  "card_select",
  "token",
  "none",
] as const;

export const DECLARATION_ENCODING_VALUES = [
  "low",
  "high",
  "both",
  "neutral",
  "pass",
  "NA",
  "Unknown",
] as const;

export const REVEAL_TIMING_VALUES = [
  "simultaneous",
  "clockwise",
  "after_showdown",
] as const;

export const PIG_PENALTY_VALUES = [
  "forfeit_entire_pot",
  "forfeit_one_half",
  "points_penalty",
  "NA",
  "Unknown",
] as const;

export type DeclarationType = (typeof DECLARATION_TYPE_VALUES)[number];
export type DeclarationEncoding = (typeof DECLARATION_ENCODING_VALUES)[number];
export type RevealTiming = (typeof REVEAL_TIMING_VALUES)[number];
export type PigPenalty = (typeof PIG_PENALTY_VALUES)[number] | null;
