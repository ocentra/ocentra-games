import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { Card } from '../../card/cardBase/Card';
import { Suit } from '@ocentra/game-domain/types/game';
import type { CardValue } from '@ocentra/game-domain/types/game';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import type { AssetCreationContext, CreatedAsset } from '../../AssetCreation';
import { CardRanking } from '../../card/cardRanking/CardRanking';
export declare class SupportedDeckTripleRecord {
    deckType: string;
    suitSet: string;
    rankSet: string;
}
export declare class DeckCardMemberRecord {
    cardTemplate: AssetResourceEntry<Card>;
    copies: number;
}
export declare class Deck extends ScriptableObject {
    static schemaVersion: 1;
    static readonly requiresInspector = true;
    static category: "Game";
    static createTemplate(): Record<string, unknown>;
    name: string;
    supportedTriples: SupportedDeckTripleRecord[];
    cardTemplates: AssetResourceEntry<Card>[];
    cardComposition: DeckCardMemberRecord[];
    backCardHash: ImageHash;
    imageSourceFolderPath: string;
    cardOutputPath: string;
    backCardSourceFolderPath: string;
    cardRankingAsset: AssetResourceEntry<CardRanking>;
    constructor();
    supportsTriple(deckType: string, suitSet: string, rankSet: string): boolean;
    getExpandedCardTemplateRefs(): AssetResourceEntry<Card>[];
    getDistinctCardTemplateRefs(): AssetResourceEntry<Card>[];
    getCard(suit: Suit, rank: CardValue): Promise<Card | null>;
    getAllCards(): Promise<Card[]>;
    getCardRanking(): Promise<CardRanking>;
    getSuitOrder(): Promise<string[]>;
    getRankOrder(): Promise<CardValue[]>;
    getExpectedCards(): Promise<Array<{
        suit: string;
        rank: CardValue;
    }>>;
    getDeckPath(): Promise<string | null>;
    getCardFolderPath(): Promise<string>;
    checkCardExists(cardId: string): Promise<Card | null>;
    quickValidateCards(): Promise<{
        isValid: boolean;
        missingCount: number;
        expectedCount: number;
    }>;
    ensureAllCardAssetsExist(onProgress?: (current: number, total: number, cardId: string, stage: 'checking' | 'creating' | 'updating') => void): Promise<{
        created: number;
        total: number;
    }>;
    private getSuitFromName;
    private getRankFromId;
    buildHashMapFromUpload(files: File[]): Promise<Map<string, ImageHash>>;
    populateFromTreeData(items: Array<{
        name: string;
        hash?: string;
    }>, isBackCards?: boolean): Promise<{
        updated: number;
        warnings: string[];
    }>;
    populateFromFolder(files: File[], _isBackCards?: boolean): Promise<{
        updated: number;
        warnings: string[];
    }>;
    private buildSmartHashMap;
    mapImagesToCards(hashMap: Map<string, ImageHash>): Promise<{
        updated: number;
        warnings: string[];
    }>;
    refreshCardTemplates(): Promise<void>;
    static create(context: AssetCreationContext): Promise<CreatedAsset>;
}
