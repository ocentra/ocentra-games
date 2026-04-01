export const ACTION_ID_VALUES = [
  "ante",
  "deal",
  "reveal_market",
  "buy_market",
  "buy_stock",
  "fold",
  "check",
  "call",
  "bet",
  "raise",
  "declare",
  "reveal_hand",
  "award_pot",
  "play_card",
  "draw",
  "discard",
  "pass",
  "bid",
  "meld",
  "go_out",
] as const;

export type ActionId = (typeof ACTION_ID_VALUES)[number];
