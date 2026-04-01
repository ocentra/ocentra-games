import { describe, it, expect } from "vitest";
import { DECK_TYPE_VALUES } from "./deckTypes";
import { ALLOWED_TRIPLES } from "./deckCompatibility";

describe("deck-compatibility", () => {
  it("every deckType in game-domain deck has at least one valid triple", () => {
    const deckTypesWithTriples = new Set(ALLOWED_TRIPLES.map(([d]) => d));
    for (const deckType of DECK_TYPE_VALUES) {
      expect(
        deckTypesWithTriples.has(deckType),
        `deckType "${deckType}" has no valid triple in compatibility matrix`
      ).toBe(true);
    }
  });
});
