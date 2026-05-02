import { schema } from '@ocentra/schema-domain/effect-builder';
import { AssetRefSchema } from '../shared/asset-ref-schema';

export const ScoringDataSchema = schema.object({
    rankingAsset: AssetRefSchema
        .refine(v => (v.assetType || v.type) === 'DeckRanking', { message: 'rankingAsset must be a DeckRanking' })
        .nullable()
        .optional(),
    cardRankingAsset: AssetRefSchema
        .refine(v => (v.assetType || v.type) === 'CardRanking', { message: 'cardRankingAsset must be a CardRanking' })
        .nullable()
        .optional(),
    scoringType: schema.string().optional(),
    scoringFormula: schema.string().optional(),
    scoringRules: schema.record(schema.unknown()).nullable().optional(),
    description: schema.string().optional(),
    patternMultipliers: schema.record(schema.number()).nullable().optional(),
    priorityOrder: schema.array(schema.string()).optional(),
    winCondition: schema.string().optional(),
    cardValues: schema.record(schema.number()).optional(),
    penalties: schema.string().optional(),
    targetScore: schema.union([schema.number(), schema.null()]).optional(),
    scoringDirection: schema.union([schema.string(), schema.null()]).optional(),
}).passthrough();
