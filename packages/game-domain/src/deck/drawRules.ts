export const DRAW_SOURCE_VALUES = [
  "stock",
  "discard_top",
  "discard_any",
  "market",
  "hand_of_player",
  "talon",
  "kitty",
  "widow",
] as const;

export const DRAW_VISIBILITY_VALUES = ["face_up", "face_down"] as const;

export const DRAW_TIMING_VALUES = [
  "start_of_turn",
  "end_of_turn",
  "after_discard",
  "before_discard",
  "any_time",
  "phase_specific",
] as const;

export type DrawSource = (typeof DRAW_SOURCE_VALUES)[number];
export type DrawVisibility = (typeof DRAW_VISIBILITY_VALUES)[number];
export type DrawTiming = (typeof DRAW_TIMING_VALUES)[number];
