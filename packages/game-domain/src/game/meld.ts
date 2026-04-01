export const MELD_TYPE_VALUES = [
  "set",
  "run",
  "flush",
  "pair",
  "triplet",
  "quartet",
  "canasta",
  "special",
] as const;

export const MELD_TIMING_VALUES = [
  "any_time_in_turn",
  "after_draw_before_discard",
  "at_any_time",
  "end_of_round_only",
] as const;

export type MeldType = (typeof MELD_TYPE_VALUES)[number];
export type MeldTiming = (typeof MELD_TIMING_VALUES)[number];
