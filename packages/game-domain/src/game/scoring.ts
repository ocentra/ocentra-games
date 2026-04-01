export const SCORING_DIRECTION_VALUES = [
  "high_wins",
  "low_wins",
  "closest_to_target",
] as const;

export const TARGET_SCORE_NA_VALUES = [
  "NA",
  "not applicable",
  "Unknown",
] as const;

export type ScoringDirection =
  | (typeof SCORING_DIRECTION_VALUES)[number]
  | null;
export type TargetScoreNA = (typeof TARGET_SCORE_NA_VALUES)[number];
