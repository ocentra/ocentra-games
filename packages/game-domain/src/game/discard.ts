export const DISCARD_TIMING_VALUES = [
  "after_draw",
  "after_play",
  "end_of_turn",
  "any_time",
] as const;

export const DISCARD_VISIBILITY_VALUES = ["face_up", "face_down"] as const;

export type DiscardTiming = (typeof DISCARD_TIMING_VALUES)[number];
export type DiscardVisibility = (typeof DISCARD_VISIBILITY_VALUES)[number];
