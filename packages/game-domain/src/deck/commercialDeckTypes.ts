export const COMMERCIAL_DECK_TYPE_VALUES = [
  "Rook 56",
  "Whot 54",
] as const;

export const COMMERCIAL_DECK_TYPE_SET = new Set<string>(COMMERCIAL_DECK_TYPE_VALUES);

export const COMMERCIAL_DECK_FAMILY_VALUES = [
  "Rook_colors",
  "Whot",
] as const;

export const COMMERCIAL_DECK_FAMILY_SET = new Set<string>(COMMERCIAL_DECK_FAMILY_VALUES);

export const COMMERCIAL_DECK_TRIPLES = [
  ["Rook 56", "Rook_colors", "Rook_1_14"],
  ["Whot 54", "Whot", "Whot"],
] as const;

export function isCommercialDeckType(deckType: string): boolean {
  return COMMERCIAL_DECK_TYPE_SET.has(deckType);
}

export function isCommercialDeckFamily(deckFamily: string): boolean {
  return COMMERCIAL_DECK_FAMILY_SET.has(deckFamily);
}
