import { type Game } from '@ocentra/card-games/schema/zod/game-schema';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import type { Deck } from '../card/deck/Deck';
import type { CreateGameModeOptions } from '../factories/GameModeAssetFactory';
interface AssetEnvelope {
    system: {
        guid?: string;
        assetType?: string;
        displayName?: string;
        category?: string;
    };
    data: Record<string, unknown>;
}
export interface BuildProcessedGameOptions {
    processedGamePath: string;
    category?: string;
}
export declare function getCardRankingReference(deckEnvelope: AssetEnvelope): Record<string, unknown>;
export declare function resolveDeckAssetByTriple(deckType: string, suitSet: string, rankSet: string): {
    linkedDeckAsset: AssetResourceEntry<Deck>;
    deckEnvelope: AssetEnvelope;
};
export declare function loadProcessedGame(processedGamePath: string): Game;
export declare function buildCreateGameModeOptionsFromProcessedGame(options: BuildProcessedGameOptions): CreateGameModeOptions;
export {};
