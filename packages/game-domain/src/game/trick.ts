export const TRICK_WIN_CONDITION_VALUES = [
  "highest_of_led_suit",
  "highest_trump_if_played_else_highest_led",
  "lowest_card_wins",
  "specific_card_wins",
] as const;

export const BIDDING_SYSTEM_VALUES = [
  "auction",
  "pass_or_bid",
  "fixed_contract",
  "german_style",
  "solo_bidding",
] as const;

export type TrickWinCondition = (typeof TRICK_WIN_CONDITION_VALUES)[number];
export type BiddingSystem = (typeof BIDDING_SYSTEM_VALUES)[number];
