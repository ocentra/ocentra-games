export const CAN_SUBSTITUTE_FOR_VALUES = [
  "any_card",
  "any_rank",
  "any_suit",
  "specific_cards",
] as const;

export const ACTION_CARD_ACTION_VALUES = [
  "skip_next_player",
  "reverse_direction",
  "draw_2",
  "draw_4",
  "wild_suit_change",
  "penalty",
  "bonus_points",
  "extra_turn",
  "steal_card",
  "force_swap_hand",
  "expose_hand",
  "block_draw",
] as const;

export const TARGET_PLAYER_VALUES = [
  "next_player",
  "previous_player",
  "all_others",
  "chosen_player",
  "self",
] as const;

export type CanSubstituteFor = (typeof CAN_SUBSTITUTE_FOR_VALUES)[number];
export type ActionCardAction = (typeof ACTION_CARD_ACTION_VALUES)[number];
export type TargetPlayer = (typeof TARGET_PLAYER_VALUES)[number];
