export const INITIAL_DEAL_VALUES = ["face_up", "face_down", "mixed"] as const;
export const MARKET_CARDS_VALUES = ["face_up", "face_down", "mixed"] as const;
export const STOCK_PURCHASE_VALUES = ["face_up", "face_down"] as const;
export const DISCARD_TOP_VALUES = [
  "face_up",
  "face_down",
  "NA",
  "Unknown",
] as const;
export const HAND_DEFAULT_VALUES = ["face_up", "face_down", "mixed"] as const;
export const TABLEAU_CARDS_VALUES = [
  "face_up",
  "face_down",
  "mixed",
  "NA",
  "Unknown",
] as const;

export type InitialDeal = (typeof INITIAL_DEAL_VALUES)[number];
export type MarketCards = (typeof MARKET_CARDS_VALUES)[number] | null;
export type StockPurchase = (typeof STOCK_PURCHASE_VALUES)[number] | null;
export type DiscardTop = (typeof DISCARD_TOP_VALUES)[number] | null;
export type HandDefault = (typeof HAND_DEFAULT_VALUES)[number];
export type TableauCards = (typeof TABLEAU_CARDS_VALUES)[number] | null;
