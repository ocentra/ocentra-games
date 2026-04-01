import { z } from 'zod';
import { AssetRefSchema } from '../shared/asset-ref-schema';

export const ScoringDataSchema = z.object({
    cardRankingAsset: AssetRefSchema
        .refine(v => (v.assetType || v.type) === 'CardRanking', { message: 'cardRankingAsset must be a CardRanking' })
        .nullable()
        .optional(),
    scoringType: z.string().optional(),
    scoringFormula: z.string().optional(),
    scoringRules: z.record(z.unknown()).nullable().optional(),
    description: z.string().optional(),
    patternMultipliers: z.record(z.number()).nullable().optional(),
    priorityOrder: z.array(z.string()).optional(),
    winCondition: z.string().optional(),
    cardValues: z.record(z.number()).optional(),
    penalties: z.string().optional(),
    targetScore: z.union([z.number(), z.null()]).optional(),
    scoringDirection: z.union([z.string(), z.null()]).optional(),
}).passthrough();
