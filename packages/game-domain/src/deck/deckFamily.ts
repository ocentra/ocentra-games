import { ALLOWED_TRIPLES } from './deckCompatibility';
import { DECK_FAMILY_FRENCH, DECK_FAMILY_TAROT } from './cardIdentity';

const families = new Set<string>([DECK_FAMILY_FRENCH, DECK_FAMILY_TAROT]);
for (const [, suitSet] of ALLOWED_TRIPLES) {
  families.add(suitSet);
}
export const DECK_FAMILY_VALUES = Object.freeze(Array.from(families).sort());
export type DeckFamily = string;

const map = new Map<string, DeckFamily>();
for (const [deckType, suitSet] of ALLOWED_TRIPLES) {
  if (!map.has(deckType)) {
    map.set(deckType, suitSet);
  }
}

export const DECK_TYPE_TO_FAMILY: Readonly<Record<string, DeckFamily>> = Object.freeze(
  Object.fromEntries(map)
);

export function deckTypeToFamily(deckType: string): DeckFamily | null {
  return map.get(deckType) ?? null;
}
