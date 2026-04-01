import type { Category } from './categories';
import { DOMINO_DECK_TYPE_SET, TILE_DECK_TYPE_SET } from '../deck/deckTypes';

export type EngineConfigKey =
  | "roundConfig"
  | "fishingConfig"
  | "meldConfig"
  | "patienceConfig"
  | "bankingConfig"
  | "shedding"
  | "trickConfig";

export type DeckFamilyKey = "domino" | "tile";

export interface CategoryMechanics {
  deckFamily?: DeckFamilyKey;
  configs?: readonly EngineConfigKey[];
  trickOrTrump?: boolean;
}

export function getDeckFamilySet(family: DeckFamilyKey): Set<string> {
  return family === "domino" ? DOMINO_DECK_TYPE_SET : TILE_DECK_TYPE_SET;
}

export const CATEGORY_REQUIRED_MECHANICS: Readonly<Record<Category, CategoryMechanics | null>> = {
  "Abstract strategy": null,
  Accumulation: { configs: ["roundConfig"] },
  Banking: { configs: ["bankingConfig"] },
  Climbing: { configs: ["shedding"] },
  Domino: { deckFamily: "domino", configs: ["roundConfig"] },
  Fishing: { configs: ["fishingConfig"] },
  Gambling: { configs: ["bankingConfig"] },
  Matching: null,
  Miscellaneous: null,
  Other: null,
  Patience: { configs: ["patienceConfig"] },
  Poker: null,
  Race: null,
  Rummy: { configs: ["meldConfig"] },
  Shedding: { configs: ["shedding"] },
  Social: null,
  Tile: { deckFamily: "tile", configs: ["roundConfig"] },
  "Trick-taking": { trickOrTrump: true },
  Unknown: null,
  Vying: null,
  War: null,
} as const;
