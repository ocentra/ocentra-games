import { Card } from '../../card/cardBase/Card.js';
import { frenchCardIdentity } from '@ocentra/game-domain/deck/cardIdentity';
import { CardRanking } from '../../card/cardRanking/CardRanking.js';
export class CardFactory {
    static create(options) {
        const card = new Card();
        card.cardIdentity = frenchCardIdentity(options.suit, options.rank);
        card.imageHash = (options.imageHash || '');
        card.cardRankingAsset = options.cardRanking;
        let computedCardId;
        if (options.variant) {
            computedCardId = options.variant;
        }
        else {
            computedCardId = `${options.rank}_of_${options.suit}`;
        }
        card.cardId = computedCardId;
        card.displayName = card.cardId;
        card.variant = card.cardId;
        return card;
    }
    static async createFromCardId(cardId, cardRankingAsset, imageHash) {
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
        const rankEntry = cardRanking.getRankingsArray().find((r) => r.CardName.toLowerCase() === rankStr ||
            r.CardSymbol.toLowerCase() === rankStr ||
            r.Value.toString() === rankStr);
        const suitEntry = cardRanking.getSuitsArray().find((s) => s.SuitName.toLowerCase() === suitStr);
        if (!rankEntry || !suitEntry) {
            return null;
        }
        return CardFactory.create({
            suit: suitEntry.SuitName,
            rank: rankEntry.Value,
            imageHash,
            variant: cardId,
            cardRanking: cardRankingAsset,
        });
    }
}
