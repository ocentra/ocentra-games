import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { Card } from '@ocentra/game-domain/types/game';
import type { DeckFamily } from '@ocentra/game-domain/deck/deckFamily';
import { CardRankingType } from '../../card/cardRanking/CardRankingType';
import { SuitColor } from '../../card/cardRanking/SuitColor';
import { DeckType } from '../../deck/DeckType';
import type { AssetCreationContext, CreatedAsset } from '../../AssetCreation';
import type { CardPieceId } from '../../pieces/piece-id';
export declare class CardSuitEntry {
    SuitName: string;
    SuitSymbol: string;
    SuitColor: SuitColor;
    DisplayOrder: number;
}
export declare class CardRankingEntry {
    CardName: string;
    Value: number;
    CardSymbol: string;
    DisplayOrder: number;
}
export declare class CardRankingExplicitEntry {
    id: string;
    copies: number;
    suit?: string | null;
    rank?: string | number | null;
    label?: string | null;
    order?: number | null;
    points?: number | null;
    kind?: string | null;
}
export declare class CardRanking extends ScriptableObject {
    static readonly requiresInspector = true;
    static createTemplate(): Record<string, unknown>;
    constructor();
    deckType: DeckType;
    expectedCardCount: number;
    includesJokers: boolean;
    backCardCount: number;
    deckFamily: DeckFamily;
    cardEntries: CardRankingExplicitEntry[];
    familyPayload?: {
        french?: {
            suits: CardSuitEntry[];
            rankings: CardRankingEntry[];
        };
    };
    cardIdentities: string[];
    getSuitsArray(): CardSuitEntry[];
    getRankingsArray(): CardRankingEntry[];
    getSuitOrder(): string[];
    getRankOrder(): number[];
    getCanonicalCardPieceIds(): CardPieceId[];
    getSuitSymbol(suitName: string): string | undefined;
    getSuitColor(suitName: string): SuitColor;
    getRankSymbol(rankValue: number): string | undefined;
    getRankName(rankValue: number): string;
    getAllSuits(): string[];
    getAllRanks(): number[];
    getCardSymbol(suitName: string, rankValue: number, coloured?: boolean): string;
    getCardFromSymbol(symbol: string): Card | null;
    getRandomSuit(): string;
    getRandomRank(min?: number, max?: number): number;
    getRankSymbolToValue(): Record<string, number>;
    getSuitSymbolToName(): Record<string, string>;
    calculateExpectedCardCount(): number;
    updateExpectedCardCount(): void;
    static getDefault(): Promise<CardRanking>;
    static getCardRanking(type: CardRankingType): Promise<CardRanking | null>;
    static create(context: AssetCreationContext, deckType?: DeckType): Promise<CreatedAsset>;
}
