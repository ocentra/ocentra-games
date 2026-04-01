export const TURN_DIRECTION_VALUES = [
  "clockwise",
  "counterclockwise",
  "variable",
] as const;

export const TURN_STARTS_WITH_VALUES = [
  "left_of_dealer",
  "right_of_dealer",
  "dealer",
  "eldest_hand",
  "fixed_player",
  "winner_of_previous",
] as const;

export type TurnDirection = (typeof TURN_DIRECTION_VALUES)[number];
export type TurnStartsWith = (typeof TURN_STARTS_WITH_VALUES)[number];
