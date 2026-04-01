export const ROUND_END_CONDITION_VALUES = [
  "player_goes_out",
  "stock_exhausted",
  "tricks_complete",
  "target_score_reached",
  "fixed_rounds",
  "all_cards_played",
] as const;

export const GAME_END_CONDITION_VALUES = [
  "target_score_reached",
  "fixed_rounds_complete",
  "elimination",
  "last_player_standing",
  "agreed_session",
] as const;

export type RoundEndCondition =
  (typeof ROUND_END_CONDITION_VALUES)[number];
export type GameEndCondition = (typeof GAME_END_CONDITION_VALUES)[number];
