import 'reflect-metadata';
import { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject';
import type { CardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { CardRanking } from '../../card/cardRanking/CardRanking';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { PieceKind } from '../../pieces/PieceKind';
import type { CardPieceId } from '../../pieces/piece-id';
export declare class Card extends ScriptableObject {
    static schemaVersion: number;
    static readonly requiresInspector = true;
    static category: "Game";
    static parentPathForSave: string | null;
    static createTemplate(): Record<string, unknown>;
    constructor();
    cardIdentity: CardIdentity;
    imageHash: ImageHash;
    cardId: string;
    cardRankingAsset: AssetResourceEntry<CardRanking>;
    get pieceKind(): PieceKind;
    get pieceId(): CardPieceId;
    getCardId(cardRanking?: CardRanking): string;
    private computeCardId;
    protected onLoad(): void;
    protected onBeforeSave(): void;
    private syncCardId;
    serialize(): string;
}
