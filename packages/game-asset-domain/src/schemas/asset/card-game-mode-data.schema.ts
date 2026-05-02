import { schema } from '@ocentra/schema-domain/effect-builder';
import { AssetRefSchema } from '../shared/asset-ref-schema';

export const CardGameModeDataSchema = schema.object({
    scoringAsset: AssetRefSchema.refine(v => v.assetType === 'CardGameScoring', { message: 'scoringAsset must be a CardGameScoring' }),
    gameRulesAsset: AssetRefSchema.refine(v => v.assetType === 'CardGameRules', { message: 'gameRulesAsset must be a CardGameRules' }),
    strategyAsset: AssetRefSchema.refine(v => v.assetType === 'Strategy', { message: 'strategyAsset must be a Strategy' }),
    rankingAsset: AssetRefSchema.refine(v => v.assetType === 'DeckRanking', { message: 'rankingAsset must be a DeckRanking' }).optional(),
    cardRankingAsset: AssetRefSchema.refine(v => v.assetType === 'CardRanking', { message: 'cardRankingAsset must be a CardRanking' }).optional(),
    layoutAsset: AssetRefSchema.refine(v => v.assetType === 'CardGameLayout' || v.assetType === 'Layout', { message: 'layoutAsset must be a Layout or CardGameLayout' }),
    gameInfoAsset: AssetRefSchema.refine(v => v.assetType === 'GameInfo', { message: 'gameInfoAsset must be a GameInfo' }),
    deckAsset: AssetRefSchema.refine(v => v.assetType === 'Deck', { message: 'deckAsset must be a Deck' }),
    carouselImagesAsset: AssetRefSchema.refine(v => v.assetType === 'ImageCarousel', { message: 'carouselImagesAsset must be an ImageCarousel' }).optional(),
    mechanicsAsset: AssetRefSchema.refine(v => v.assetType === 'CardGameMechanics', { message: 'mechanicsAsset must be a CardGameMechanics' }).optional(),
    minPlayers: schema.number().int().min(1).max(20),
    maxPlayers: schema.number().int().min(1).max(20),
    minHumanPlayers: schema.number().int().min(1).max(20).optional(),
    maxHumanPlayers: schema.number().int().min(1).max(20).optional(),
    supportsAI: schema.boolean().optional(),
    aiCountsAsPlayer: schema.boolean().optional(),
    baseBet: schema.number().min(0).optional(),
    defaultDealerIsSelf: schema.boolean().optional(),
    initialNumberOfCards: schema.number().int().min(0).optional(),
    released: schema.boolean().optional(),
    releaseStatus: schema.enum(['Alpha', 'Beta', 'Available', 'ComingSoon', 'InternalOnly']).optional(),
    gameModeCategory: schema.string().optional(),
    bannerImage: schema.string().optional(),
    gameIcon: schema.string().optional(),
    listImageHash: schema.string().optional(),
    boxImageHash: schema.string().optional(),
    tableImageHash: schema.string().optional(),
    mobileTableImageHash: schema.string().optional(),
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
