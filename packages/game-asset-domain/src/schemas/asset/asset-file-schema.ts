import { z } from 'zod';
import { AssetSystemSchema } from '../shared/system-schema';
import { CardGameModeDataSchema } from './card-game-mode-data.schema';
import { StrategyDataSchema } from './strategy-data.schema';
import { ScoringDataSchema } from './scoring-data.schema';
import { RulesDataSchema } from './rules-data.schema';
import { GameInfoDataSchema } from './game-info-data.schema';
import { ImageCarouselDataSchema } from './image-carousel-data.schema';
import { LayoutDataSchema } from './layout-data.schema';
import { DeckDataSchema } from './deck-data.schema';
import { CardRankingDataSchema } from './card-ranking-data.schema';
import { CardDataSchema } from './card-data.schema';
import { DominoTileDataSchema } from './domino-tile-data.schema';
import { DominoRankingDataSchema } from './domino-ranking-data.schema';
import { DominoDeckDataSchema } from './domino-deck-data.schema';
import { HanafudaCardDataSchema } from './hanafuda-card-data.schema';
import { HanafudaRankingDataSchema } from './hanafuda-ranking-data.schema';
import { HanafudaDeckDataSchema } from './hanafuda-deck-data.schema';
import { MahjongTileDataSchema } from './mahjong-tile-data.schema';
import { MahjongRankingDataSchema } from './mahjong-ranking-data.schema';
import { MahjongDeckDataSchema } from './mahjong-deck-data.schema';
import { PlayingCardRankingDataSchema } from './playing-card-ranking-data.schema';
import { PlayingCardDataSchema } from './playing-card-data.schema';
import { PlayingCardDeckDataSchema } from './playing-card-deck-data.schema';
import { BonusRuleDataSchema } from './bonus-rule-data.schema';
import { ComingSoonDataSchema } from './coming-soon-data.schema';
import { AIModelListDataSchema } from './ai-model-list-data.schema';
import { CardGameMechanicsDataSchema } from './card-game-mechanics-data.schema';

// A registry mapping assetTypes to their corresponding data schema validation
const AssetTypeToDataSchema: Record<string, z.ZodTypeAny> = {
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
export function validateAssetFile(json: unknown) {
    // First validate the base structure (envelope)
    const baseResult = AssetFileSchema.safeParse(json);

    if (!baseResult.success) {
        return baseResult; // Fails envelope validation
    }

    const assetType = baseResult.data.system.assetType as string;
    const dataSchema = AssetTypeToDataSchema[assetType];

    if (dataSchema) {
        // Determine if data block exists. It might be optional or empty for some types,
        // but the data schema itself handles that validation.
        const dataBlock = baseResult.data.data || {};

        // Validate the data block against the specific schema
        const dataResult = dataSchema.safeParse(dataBlock);

        if (!dataResult.success) {
            // Remap the errors to specifically state they occur inside the data block
            const formattedIssues = dataResult.error.issues.map((issue: z.ZodIssue) => ({
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
