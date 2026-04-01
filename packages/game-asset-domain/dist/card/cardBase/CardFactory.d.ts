import { Card } from '../../card/cardBase/Card';
import { Suit } from '@ocentra/game-domain/types/game';
import type { CardValue } from '@ocentra/game-domain/types/game';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { CardRanking } from '../../card/cardRanking/CardRanking';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
export interface CreateCardOptions {
    suit: Suit;
    rank: CardValue;
    imageHash?: ImageHash;
    variant?: string | null;
    cardRanking: AssetResourceEntry<CardRanking>;
}
export declare class CardFactory {
    static create(options: CreateCardOptions): Card;
    static createFromCardId(cardId: string, cardRankingAsset: AssetResourceEntry<CardRanking>, imageHash?: ImageHash): Promise<Card | null>;
}
