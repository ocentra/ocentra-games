export const CAPTURE_METHOD_VALUES = [
  "matching_rank",
  "sum_equals_target",
  "sum_or_match",
  "rank_beats_rank",
] as const;

export type CaptureMethod = (typeof CAPTURE_METHOD_VALUES)[number];
