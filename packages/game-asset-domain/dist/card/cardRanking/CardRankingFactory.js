import { CardRanking } from '../../card/cardRanking/CardRanking.js';
import { SuitColor } from '../../card/cardRanking/SuitColor.js';
import { DeckType } from '../../deck/DeckType.js';
export class CardRankingFactory {
    static createStandard52() {
        const instance = new CardRanking();
        instance.deckType = DeckType.Standard52;
        instance.includesJokers = false;
        instance.backCardCount = 1;
        const suits = [
            { SuitName: 'spades', SuitSymbol: '♠', SuitColor: SuitColor.Black, DisplayOrder: 0 },
            { SuitName: 'hearts', SuitSymbol: '♥', SuitColor: SuitColor.Red, DisplayOrder: 1 },
            { SuitName: 'diamonds', SuitSymbol: '♦', SuitColor: SuitColor.Red, DisplayOrder: 2 },
            { SuitName: 'clubs', SuitSymbol: '♣', SuitColor: SuitColor.Black, DisplayOrder: 3 },
        ];
        const rankings = [
            { CardName: 'Ace', Value: 14, CardSymbol: 'A', DisplayOrder: 0 },
            { CardName: 'King', Value: 13, CardSymbol: 'K', DisplayOrder: 1 },
            { CardName: 'Queen', Value: 12, CardSymbol: 'Q', DisplayOrder: 2 },
            { CardName: 'Jack', Value: 11, CardSymbol: 'J', DisplayOrder: 3 },
            { CardName: '10', Value: 10, CardSymbol: '10', DisplayOrder: 4 },
            { CardName: '9', Value: 9, CardSymbol: '9', DisplayOrder: 5 },
            { CardName: '8', Value: 8, CardSymbol: '8', DisplayOrder: 6 },
            { CardName: '7', Value: 7, CardSymbol: '7', DisplayOrder: 7 },
            { CardName: '6', Value: 6, CardSymbol: '6', DisplayOrder: 8 },
            { CardName: '5', Value: 5, CardSymbol: '5', DisplayOrder: 9 },
            { CardName: '4', Value: 4, CardSymbol: '4', DisplayOrder: 10 },
            { CardName: '3', Value: 3, CardSymbol: '3', DisplayOrder: 11 },
            { CardName: '2', Value: 2, CardSymbol: '2', DisplayOrder: 12 },
        ];
        instance.familyPayload = { french: { suits, rankings } };
        instance.updateExpectedCardCount();
        return instance;
    }
    static createStandard52PlusJokers() {
        const instance = this.createStandard52();
        instance.deckType = DeckType.Standard52PlusJokers;
        instance.includesJokers = true;
        return instance;
    }
    static createExtended54() {
        const instance = this.createStandard52();
        instance.deckType = DeckType.Extended54;
        instance.includesJokers = true;
        return instance;
    }
    static createCustom(options) {
        const instance = new CardRanking();
        instance.deckType = options.deckType;
        instance.includesJokers = options.includesJokers ?? false;
        instance.backCardCount = options.backCardCount ?? 1;
        const suits = options.customSuits ?? [];
        const rankings = options.customRankings ?? [];
        instance.familyPayload = { french: { suits, rankings } };
        instance.updateExpectedCardCount();
        return instance;
    }
    static create(options) {
        switch (options.deckType) {
            case DeckType.Standard52:
                return this.createStandard52();
            case DeckType.Standard52PlusJokers:
                return this.createStandard52PlusJokers();
            case DeckType.Extended54:
                return this.createExtended54();
            case DeckType.Custom:
            default:
                return this.createCustom(options);
        }
    }
}
