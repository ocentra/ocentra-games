import type { Category } from "@ocentra/game-domain/game/categories";

export type ScoringFieldRequirement = "required" | "n_a_with_reason";

export interface ScoringRequirements {
  cardValues: ScoringFieldRequirement;
  targetScore: ScoringFieldRequirement;
  scoringDirection: ScoringFieldRequirement;
}

export const SCORING_FIELD_REQUIRED: ScoringFieldRequirement = "required";
export const SCORING_FIELD_NA: ScoringFieldRequirement = "n_a_with_reason";

/**
 * Category → scoring field requirements.
 * "required" = field must be filled (non-empty/non-null).
 * "n_a_with_reason" = field can be empty/null, but nullReasons.[field] required (min 15 chars).
 */
export const CATEGORY_SCORING_REQUIREMENTS: Readonly<
  Record<Category, ScoringRequirements>
> = {
  "Abstract strategy": {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Accumulation: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Banking: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Climbing: {
    cardValues: SCORING_FIELD_REQUIRED,
    targetScore: SCORING_FIELD_REQUIRED,
    scoringDirection: SCORING_FIELD_REQUIRED,
  },
  Domino: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Fishing: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Gambling: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Matching: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Miscellaneous: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Other: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Patience: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Poker: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Race: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Rummy: {
    cardValues: SCORING_FIELD_REQUIRED,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_REQUIRED,
  },
  Shedding: {
    cardValues: SCORING_FIELD_REQUIRED,
    targetScore: SCORING_FIELD_REQUIRED,
    scoringDirection: SCORING_FIELD_REQUIRED,
  },
  Social: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Tile: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  "Trick-taking": {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Unknown: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  Vying: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
  War: {
    cardValues: SCORING_FIELD_NA,
    targetScore: SCORING_FIELD_NA,
    scoringDirection: SCORING_FIELD_NA,
  },
} as const;

export function getScoringRequirements(category: Category): ScoringRequirements {
  return CATEGORY_SCORING_REQUIREMENTS[category] ?? CATEGORY_SCORING_REQUIREMENTS.Other;
}
