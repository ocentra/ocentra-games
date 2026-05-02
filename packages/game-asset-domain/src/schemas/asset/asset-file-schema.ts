import { schema } from '@ocentra/schema-domain/effect-builder';
import { AssetSystemSchema } from '../shared/system-schema';
import { CardGameModeDataSchema } from './card-game-mode-data.schema';
import { StrategyDataSchema } from './strategy-data.schema';
import { ScoringDataSchema } from './scoring-data.schema';
import { RulesDataSchema } from './rules-data.schema';
import { GameInfoDataSchema } from './game-info-data.schema';
import { ImageCarouselDataSchema } from './image-carousel-data.schema';
import { LayoutDataSchema } from './layout-data.schema';
import { decodeDeckData, decodeDeckRankingData } from './deck-effect.schema';
import { CardDataSchema } from './card-data.schema';
import { DominoTileDataSchema } from './domino-tile-data.schema';
import { HanafudaCardDataSchema } from './hanafuda-card-data.schema';
import { MahjongTileDataSchema } from './mahjong-tile-data.schema';
import { PlayingCardDataSchema } from './playing-card-data.schema';
import { BonusRuleDataSchema } from './bonus-rule-data.schema';
import { ComingSoonDataSchema } from './coming-soon-data.schema';
import { AIModelListDataSchema } from './ai-model-list-data.schema';
import { decodeCardGameMechanicsData } from './card-game-mechanics-data.schema';
import { decodeMechanicsModelAssetForAssetType } from '@ocentra/game-domain/schema/mechanics-model';

interface AssetDataValidationIssue {
    path: (string | number)[];
    message: string;
}

type AssetDataValidationResult =
    | { success: true; data: unknown }
    | { success: false; issues: AssetDataValidationIssue[] };

interface AssetDataValidator {
    validate(data: unknown, assetType: string): AssetDataValidationResult;
}

function schemaAssetValidator(schema: schema.SchemaTypeAny): AssetDataValidator {
    return {
        validate(data: unknown): AssetDataValidationResult {
            const result = schema.safeParse(data);
            return result.success
                ? { success: true, data: result.data }
                : { success: false, issues: result.error.issues.map((issue) => ({ path: issue.path, message: issue.message })) };
        },
    };
}

function effectAssetValidator<T>(decode: (data: unknown, assetType: string) => T): AssetDataValidator {
    return {
        validate(data: unknown, assetType: string): AssetDataValidationResult {
            try {
                return { success: true, data: decode(data, assetType) };
            } catch (error) {
                return {
                    success: false,
                    issues: [{
                        path: extractEffectIssuePath(error),
                        message: error instanceof Error ? error.message : String(error),
                    }],
                };
            }
        },
    };
}

function retiredAssetTypeValidator(replacement: string): AssetDataValidator {
    return {
        validate(_data: unknown, assetType: string): AssetDataValidationResult {
            return {
                success: false,
                issues: [{
                    path: [],
                    message: `${assetType} is retired as a persisted asset type; migrate it to ${replacement}`,
                }],
            };
        },
    };
}

// A registry mapping assetTypes to their corresponding data schema validation
const AssetTypeToDataSchema: Record<string, AssetDataValidator> = {
    // Game Modes
    CardGameMode: schemaAssetValidator(CardGameModeDataSchema),
    CardGameMechanics: effectAssetValidator((data) => decodeCardGameMechanicsData(data)),
    GameMechanics: effectAssetValidator((data) => decodeCardGameMechanicsData(data)),
    TurnBasedGameMechanics: effectAssetValidator((data) => decodeCardGameMechanicsData(data)),
    GamePlayerModel: effectAssetValidator(decodeMechanicsModelAssetForAssetType),
    GameSessionModel: effectAssetValidator(decodeMechanicsModelAssetForAssetType),
    CardGameDeckModel: effectAssetValidator(decodeMechanicsModelAssetForAssetType),
    GameZoneModel: effectAssetValidator(decodeMechanicsModelAssetForAssetType),
    GamePhaseFlowModel: effectAssetValidator(decodeMechanicsModelAssetForAssetType),
    GameActionSet: effectAssetValidator(decodeMechanicsModelAssetForAssetType),
    GameStateEventModel: effectAssetValidator(decodeMechanicsModelAssetForAssetType),
    GameValidationFixtures: effectAssetValidator(decodeMechanicsModelAssetForAssetType),

    // Game Logic
    Strategy: schemaAssetValidator(StrategyDataSchema),
    CardGameScoring: schemaAssetValidator(ScoringDataSchema),
    Scoring: schemaAssetValidator(ScoringDataSchema), // Base class, sometimes used directly
    CardGameRules: schemaAssetValidator(RulesDataSchema),
    GameRules: schemaAssetValidator(RulesDataSchema), // Base class

    // Content & Layout
    GameInfo: schemaAssetValidator(GameInfoDataSchema),
    ImageCarousel: schemaAssetValidator(ImageCarouselDataSchema),
    CardGameLayout: schemaAssetValidator(LayoutDataSchema),
    Layout: schemaAssetValidator(LayoutDataSchema),

    // Cards
    Deck: effectAssetValidator((data) => decodeDeckData(data)),
    DeckRanking: effectAssetValidator((data) => decodeDeckRankingData(data)),
    CardRanking: retiredAssetTypeValidator('DeckRanking'),
    Card: schemaAssetValidator(CardDataSchema),

    // Dominoes
    DominoTile: schemaAssetValidator(DominoTileDataSchema),
    DominoRanking: retiredAssetTypeValidator('DeckRanking'),
    DominoDeck: retiredAssetTypeValidator('Deck'),

    // Hanafuda
    HanafudaCard: schemaAssetValidator(HanafudaCardDataSchema),
    HanafudaRanking: retiredAssetTypeValidator('DeckRanking'),
    HanafudaDeck: retiredAssetTypeValidator('Deck'),

    // Mahjong
    MahjongTile: schemaAssetValidator(MahjongTileDataSchema),
    MahjongRanking: retiredAssetTypeValidator('DeckRanking'),
    MahjongDeck: retiredAssetTypeValidator('Deck'),

    // Generic playing cards (non-French / Tarot / custom enumerated)
    PlayingCardRanking: retiredAssetTypeValidator('DeckRanking'),
    PlayingCard: schemaAssetValidator(PlayingCardDataSchema),
    PlayingCardDeck: retiredAssetTypeValidator('Deck'),

    // UI & Config
    ComingSoon: schemaAssetValidator(ComingSoonDataSchema),
    AIModelList: schemaAssetValidator(AIModelListDataSchema),
};

// Add all 15 BonusRule types to use the BonusRuleDataSchema
const bonusRuleTypes = [
    'BaseBonusRule', 'PairRule', 'Flush', 'FourOfAKind', 'FullHouse',
    'HighCard', 'MultipleFourOfAKind', 'MultiplePairs', 'MultipleTriplets',
    'RoyalFlush', 'SameColorsSequence', 'StraightFlush', 'ThreeOfAKind',
    'TrumpOfAKind', 'FiveOfAKind', 'DifferentColorsSequence'
];

bonusRuleTypes.forEach(type => {
    AssetTypeToDataSchema[type] = schemaAssetValidator(BonusRuleDataSchema);
});

// Create the composed schema using a discriminated union on system.assetType
export const AssetFileSchema = schema.object({
    system: AssetSystemSchema,
    data: schema.any() // We will validate this manually below for better error messages
}).passthrough();

/**
 * Validates a complete .asset file JSON structure.
 * @param json The parsed JSON object of the .asset file
 * @returns Effect validation result
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
        const dataResult = dataSchema.validate(dataBlock, assetType);

        if (!dataResult.success) {
            // Remap the errors to specifically state they occur inside the data block
            const formattedIssues = dataResult.issues.map((issue) => ({
                code: schema.IssueCode.custom,
                message: issue.message,
                path: ['data', ...issue.path]
            }));

            return { success: false, error: new schema.SchemaError(formattedIssues) };
        }
    }

    // If no specific data schema is registered, we just return the successful envelope parse
    // Meaning we at least validated the system block.
    return baseResult;
}

function extractEffectIssuePath(error: unknown): (string | number)[] {
    const message = error instanceof Error ? error.message : String(error);
    const assetPath = /Asset schema violation: ([^:]+):/.exec(message)?.[1];
    if (assetPath) {
        return assetPath.split('.').map((part) => {
            const numeric = Number(part);
            return Number.isInteger(numeric) && String(numeric) === part ? numeric : part;
        });
    }

    const consistencyPath = /Invalid mechanics manifest: ([^:]+):/.exec(message)?.[1];
    if (consistencyPath) {
        return consistencyPath.split('.').map((part) => {
            const numeric = Number(part);
            return Number.isInteger(numeric) && String(numeric) === part ? numeric : part;
        });
    }

    const matches = Array.from(message.matchAll(/\["([^"]+)"\]|\[(\d+)\]/g));
    if (matches.length === 0) {
        return [];
    }

    return matches.map((match) => {
        const value = match[1] ?? match[2] ?? '';
        const numeric = Number(value);
        return Number.isInteger(numeric) && String(numeric) === value ? numeric : value;
    });
}
