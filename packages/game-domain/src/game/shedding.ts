export const SHEDDING_GOAL_VALUES = [
  "empty_hand_first",
  "empty_hand_last",
  "reduce_hand_size",
] as const;

export const VALID_PLAY_TYPE_VALUES = [
  "higher_single",
  "higher_pair",
  "higher_triple",
  "higher_sequence",
  "same_count_higher_rank",
  "any_combination",
  "specific_beats",
] as const;

export type SheddingGoal = (typeof SHEDDING_GOAL_VALUES)[number];
export type ValidPlayType = (typeof VALID_PLAY_TYPE_VALUES)[number];
