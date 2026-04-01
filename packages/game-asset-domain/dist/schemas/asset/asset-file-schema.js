import { z } from 'zod';
import { AssetSystemSchema } from '../shared/system-schema.js';
import { CardGameModeDataSchema } from './card-game-mode-data.schema.js';
import { StrategyDataSchema } from './strategy-data.schema.js';
import { ScoringDataSchema } from './scoring-data.schema.js';
import { RulesDataSchema } from './rules-data.schema.js';
import { GameInfoDataSchema } from './game-info-data.schema.js';
import { ImageCarouselDataSchema } from './image-carousel-data.schema.js';
import { LayoutDataSchema } from './layout-data.schema.js';
import { DeckDataSchema } from './deck-data.schema.js';
import { CardRankingDataSchema } from './card-ranking-data.schema.js';
import { CardDataSchema } from './card-data.schema.js';
import { DominoTileDataSchema } from './domino-tile-data.schema.js';
import { DominoRankingDataSchema } from './domino-ranking-data.schema.js';
import { DominoDeckDataSchema } from './domino-deck-data.schema.js';
import { HanafudaCardDataSchema } from './hanafuda-card-data.schema.js';
import { HanafudaRankingDataSchema } from './hanafuda-ranking-data.schema.js';
import { HanafudaDeckDataSchema } from './hanafuda-deck-data.schema.js';
import { MahjongTileDataSchema } from './mahjong-tile-data.schema.js';
import { MahjongRankingDataSchema } from './mahjong-ranking-data.schema.js';
import { MahjongDeckDataSchema } from './mahjong-deck-data.schema.js';
import { PlayingCardRankingDataSchema } from './playing-card-ranking-data.schema.js';
import { PlayingCardDataSchema } from './playing-card-data.schema.js';
import { PlayingCardDeckDataSchema } from './playing-card-deck-data.schema.js';
import { BonusRuleDataSchema } from './bonus-rule-data.schema.js';
import { ComingSoonDataSchema } from './coming-soon-data.schema.js';
import { AIModelListDataSchema } from './ai-model-list-data.schema.js';
import { CardGameMechanicsDataSchema } from './card-game-mechanics-data.schema.js';
// A registry mapping assetTypes to their corresponding data schema validation
const AssetTypeToDataSchema = {
    // Game Modes
    CardGameMode: CardGameModeDataSchema,
    CardGameMechanics: CardGameMechanicsDataSchema,
    // Game Logic
    Strategy: StrategyDataSchema,
    CardGameScoring: ScoringDataSchema,
    Scoring: ScoringDataSchema, // Base class, sometimes used directly
    CardGameRules: RulesDataSchema,
    GameRules: RulesDataSchema, // Base class
    // Content & Layout
    GameInfo: GameInfoDataSchema,
    ImageCarousel: ImageCarouselDataSchema,
    CardGameLayout: LayoutDataSchema,
    Layout: LayoutDataSchema,
    // Cards
    Deck: DeckDataSchema,
    CardRanking: CardRankingDataSchema,
    Card: CardDataSchema,
    // Dominoes
    DominoTile: DominoTileDataSchema,
    DominoRanking: DominoRankingDataSchema,
    DominoDeck: DominoDeckDataSchema,
    // Hanafuda
    HanafudaCard: HanafudaCardDataSchema,
    HanafudaRanking: HanafudaRankingDataSchema,
    HanafudaDeck: HanafudaDeckDataSchema,
    // Mahjong
    MahjongTile: MahjongTileDataSchema,
    MahjongRanking: MahjongRankingDataSchema,
    MahjongDeck: MahjongDeckDataSchema,
    // Generic playing cards (non-French / Tarot / custom enumerated)
    PlayingCardRanking: PlayingCardRankingDataSchema,
    PlayingCard: PlayingCardDataSchema,
    PlayingCardDeck: PlayingCardDeckDataSchema,
    // UI & Config
    ComingSoon: ComingSoonDataSchema,
    AIModelList: AIModelListDataSchema,
};
// Add all 15 BonusRule types to use the BonusRuleDataSchema
const bonusRuleTypes = [
    'BaseBonusRule', 'PairRule', 'Flush', 'FourOfAKind', 'FullHouse',
    'HighCard', 'MultipleFourOfAKind', 'MultiplePairs', 'MultipleTriplets',
    'RoyalFlush', 'SameColorsSequence', 'StraightFlush', 'ThreeOfAKind',
    'TrumpOfAKind', 'FiveOfAKind', 'DifferentColorsSequence'
];
bonusRuleTypes.forEach(type => {
    AssetTypeToDataSchema[type] = BonusRuleDataSchema;
});
// Create the composed schema using a discriminated union on system.assetType
export const AssetFileSchema = z.object({
    system: AssetSystemSchema,
    data: z.any() // We will validate this manually below for better error messages
}).passthrough();
/**
 * Validates a complete .asset file JSON structure.
 * @param json The parsed JSON object of the .asset file
 * @returns Zod validation result
 */
export function validateAssetFile(json) {
    // First validate the base structure (envelope)
    const baseResult = AssetFileSchema.safeParse(json);
    if (!baseResult.success) {
        return baseResult; // Fails envelope validation
    }
    const assetType = baseResult.data.system.assetType;
    const dataSchema = AssetTypeToDataSchema[assetType];
    if (dataSchema) {
        // Determine if data block exists. It might be optional or empty for some types,
        // but the data schema itself handles that validation.
        const dataBlock = baseResult.data.data || {};
        // Validate the data block against the specific schema
        const dataResult = dataSchema.safeParse(dataBlock);
        if (!dataResult.success) {
            // Remap the errors to specifically state they occur inside the data block
            const formattedIssues = dataResult.error.issues.map((issue) => ({
                ...issue,
                path: ['data', ...issue.path]
            }));
            return { success: false, error: new z.ZodError(formattedIssues) };
        }
    }
    // If no specific data schema is registered, we just return the successful envelope parse
    // Meaning we at least validated the system block.
    return baseResult;
}
