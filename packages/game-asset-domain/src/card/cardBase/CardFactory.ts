import { Card } from '@/card/cardBase/Card';
import { Suit } from '@ocentra/game-domain/types/game';
import type { CardValue } from '@ocentra/game-domain/types/game';
import { frenchCardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import type { ImageHash } from '@ocentra/asset-domain/types/assetIdentifier';
import { CardRanking } from '@/card/cardRanking/CardRanking';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';

export interface CreateCardOptions {
  suit: Suit;
  rank: CardValue;
  imageHash?: ImageHash;
  variant?: string | null;
  cardRanking: AssetResourceEntry<CardRanking>;
}

export class CardFactory {
  static create(options: CreateCardOptions): Card {
    const card = new Card();
    card.cardIdentity = frenchCardIdentity(options.suit, options.rank);
    card.imageHash = (options.imageHash || '') as ImageHash;
    card.cardRankingAsset = options.cardRanking;

    let computedCardId: string;
    if (options.variant) {
      computedCardId = options.variant;
    } else {
      computedCardId = `${options.rank}_of_${options.suit}`;
    }
    card.cardId = computedCardId;
    card.displayName = card.cardId;
    card.variant = card.cardId;

    return card;
  }

  static async createFromCardId(cardId: string, cardRankingAsset: AssetResourceEntry<CardRanking>, imageHash?: ImageHash): Promise<Card | null> {
    const cardRanking = await cardRankingAsset.load(CardRanking);
    if (!cardRanking) {
      return null;
    }

    const match = cardId.match(/^(\d+|ace|jack|queen|king)_of_(spades|hearts|diamonds|clubs)$/i);
    if (!match) {
      return null;
    }

    const rankStr = match[1].toLowerCase();
    const suitStr = match[2].toLowerCase();

    const rankEntry = cardRanking.getRankingsArray().find((r: { CardName: string; CardSymbol: string; Value: number }) =>
      r.CardName.toLowerCase() === rankStr ||
      r.CardSymbol.toLowerCase() === rankStr ||
      r.Value.toString() === rankStr
    );

    const suitEntry = cardRanking.getSuitsArray().find((s: { SuitName: string }) =>
      s.SuitName.toLowerCase() === suitStr
    );

    if (!rankEntry || !suitEntry) {
      return null;
    }

    return CardFactory.create({
      suit: suitEntry.SuitName as Suit,
      rank: rankEntry.Value as CardValue,
      imageHash,
      variant: cardId,
      cardRanking: cardRankingAsset,
    });
  }
}

