import { Deck } from '../card/deck/Deck';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
export interface CreateGameModeOptions {
    gameId: string;
    displayName: string;
    category: string;
    copyFromTemplate?: Record<string, unknown>;
    assetDataOverrides?: Partial<Record<'rules' | 'strategy' | 'scoring' | 'gameInfo' | 'layout' | 'deck' | 'carousel' | 'mechanics' | 'cardGame', Record<string, unknown>>>;
    linkedDeckAsset?: AssetResourceEntry<Deck>;
}
interface CreateResult {
    success: boolean;
    gameModePath: string;
    createdAssets: string[];
    error?: string;
}
export declare class GameModeCreator {
    createGameModeAssetsFromProcessedGame(processedGamePath: string, category?: string): Promise<CreateResult>;
    createGameModeAssets(options: CreateGameModeOptions): Promise<CreateResult>;
    private planAssetWrite;
    private getGameFolder;
    private registerGuid;
    private refreshGameRegistry;
    private applyTemplateToCardGame;
}
export declare class GameModeAssetFactory {
    private static instance;
    static getInstance(): GameModeCreator;
}
export {};
