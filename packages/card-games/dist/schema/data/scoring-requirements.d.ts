import type { Category } from "@ocentra/game-domain/game/categories";
export type ScoringFieldRequirement = "required" | "n_a_with_reason";
export interface ScoringRequirements {
    cardValues: ScoringFieldRequirement;
    targetScore: ScoringFieldRequirement;
    scoringDirection: ScoringFieldRequirement;
}
export declare const SCORING_FIELD_REQUIRED: ScoringFieldRequirement;
export declare const SCORING_FIELD_NA: ScoringFieldRequirement;
/**
 * Category → scoring field requirements.
 * "required" = field must be filled (non-empty/non-null).
 * "n_a_with_reason" = field can be empty/null, but nullReasons.[field] required (min 15 chars).
 */
export declare const CATEGORY_SCORING_REQUIREMENTS: Readonly<Record<Category, ScoringRequirements>>;
export declare function getScoringRequirements(category: Category): ScoringRequirements;
