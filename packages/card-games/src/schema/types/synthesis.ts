export const UI_THEMES_VALUES = [
  "classic",
  "noir",
  "neon",
  "traditional",
  "arabic",
  "asian",
  "minimal",
  "luxury",
  "cartoon",
  "retro",
] as const;

export const UI_ZONE_VALUES = [
  "stock",
  "market_row",
  "player_hand",
  "pot",
  "declaration_area",
  "discard",
  "tableau",
  "foundation",
  "trick_area",
  "meld_area",
  "score_area",
  "widow",
  "kitty",
] as const;

export const MARKET_POSITION_VALUES = [
  "center",
  "center_top",
  "center_bottom",
  "left",
  "right",
] as const;

export const STOCK_POSITION_VALUES = [
  "center",
  "center_right",
  "center_left",
  "top_right",
  "top_left",
] as const;

export const DISCARD_POSITION_VALUES = [
  "center",
  "center_left",
  "center_right",
  "adjacent_stock",
  "NA",
  "Unknown",
] as const;

export const PLAYER_HAND_LAYOUT_VALUES = [
  "arc",
  "row",
  "grid",
  "stacked",
] as const;

export const POT_POSITION_VALUES = [
  "center",
  "top_center",
  "bottom_center",
] as const;

export type UiTheme = (typeof UI_THEMES_VALUES)[number];
export type UiZone = (typeof UI_ZONE_VALUES)[number];
export type MarketPosition = (typeof MARKET_POSITION_VALUES)[number] | null;
export type StockPosition = (typeof STOCK_POSITION_VALUES)[number] | null;
export type DiscardPosition = (typeof DISCARD_POSITION_VALUES)[number] | null;
export type PlayerHandLayout = (typeof PLAYER_HAND_LAYOUT_VALUES)[number];
export type PotPosition = (typeof POT_POSITION_VALUES)[number] | null;
