import { z } from 'zod';
import { AssetRefSchema } from '../shared/asset-ref-schema';

export const CardGameModeDataSchema = z.object({
    scoringAsset: AssetRefSchema.refine(v => v.assetType === 'CardGameScoring', { message: 'scoringAsset must be a CardGameScoring' }),
    gameRulesAsset: AssetRefSchema.refine(v => v.assetType === 'CardGameRules', { message: 'gameRulesAsset must be a CardGameRules' }),
    strategyAsset: AssetRefSchema.refine(v => v.assetType === 'Strategy', { message: 'strategyAsset must be a Strategy' }),
    cardRankingAsset: AssetRefSchema.refine(v => v.assetType === 'CardRanking', { message: 'cardRankingAsset must be a CardRanking' }).optional(),
    layoutAsset: AssetRefSchema.refine(v => v.assetType === 'CardGameLayout' || v.assetType === 'Layout', { message: 'layoutAsset must be a Layout or CardGameLayout' }),
    gameInfoAsset: AssetRefSchema.refine(v => v.assetType === 'GameInfo', { message: 'gameInfoAsset must be a GameInfo' }),
    deckAsset: AssetRefSchema.refine(v => v.assetType === 'Deck', { message: 'deckAsset must be a Deck' }),
    carouselImagesAsset: AssetRefSchema.refine(v => v.assetType === 'ImageCarousel', { message: 'carouselImagesAsset must be an ImageCarousel' }).optional(),
    mechanicsAsset: AssetRefSchema.refine(v => v.assetType === 'CardGameMechanics', { message: 'mechanicsAsset must be a CardGameMechanics' }).optional(),
    minPlayers: z.number().int().min(1).max(20),
    maxPlayers: z.number().int().min(1).max(20),
    minHumanPlayers: z.number().int().min(1).max(20).optional(),
    maxHumanPlayers: z.number().int().min(1).max(20).optional(),
    supportsAI: z.boolean().optional(),
    aiCountsAsPlayer: z.boolean().optional(),
    baseBet: z.number().min(0).optional(),
    defaultDealerIsSelf: z.boolean().optional(),
    initialNumberOfCards: z.number().int().min(0).optional(),
    released: z.boolean().optional(),
    releaseStatus: z.enum(['Alpha', 'Beta', 'Available', 'ComingSoon', 'InternalOnly']).optional(),
    gameModeCategory: z.string().optional(),
    bannerImage: z.string().optional(),
    gameIcon: z.string().optional(),
    listImageHash: z.string().optional(),
    boxImageHash: z.string().optional(),
    tableImageHash: z.string().optional(),
    mobileTableImageHash: z.string().optional(),
}).passthrough()
    .refine((data) => data.maxPlayers >= data.minPlayers, { message: 'maxPlayers cannot be less than minPlayers' })
    .refine((data) => {
        if (data.minHumanPlayers !== undefined && data.maxHumanPlayers !== undefined) {
            return data.maxHumanPlayers >= data.minHumanPlayers;
        }
        return true;
    }, { message: 'maxHumanPlayers cannot be less than minHumanPlayers' })
    .refine((data) => {
        if (data.minHumanPlayers !== undefined) {
            return data.minHumanPlayers <= data.minPlayers;
        }
        return true;
    }, { message: 'minHumanPlayers cannot be greater than minPlayers' })
    .refine((data) => {
        if (data.maxHumanPlayers !== undefined) {
            return data.maxHumanPlayers <= data.maxPlayers;
        }
        return true;
    }, { message: 'maxHumanPlayers cannot be greater than maxPlayers' })
    .refine((data) => {
        const { minRounds, maxRounds } = data as { minRounds?: unknown; maxRounds?: unknown };
        if (typeof minRounds === 'number' && typeof maxRounds === 'number') {
            return maxRounds >= minRounds;
        }
        return true;
    }, { message: 'maxRounds cannot be less than minRounds' });
