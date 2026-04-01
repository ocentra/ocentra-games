import { CardRanking, CardSuitEntry, CardRankingEntry } from '../../card/cardRanking/CardRanking';
import { DeckType } from '../../deck/DeckType';
export interface CreateCardRankingOptions {
    deckType: DeckType;
    displayName?: string;
    includesJokers?: boolean;
    backCardCount?: number;
    customSuits?: CardSuitEntry[];
    customRankings?: CardRankingEntry[];
}
export declare class CardRankingFactory {
    static createStandard52(): CardRanking;
    static createStandard52PlusJokers(): CardRanking;
    static createExtended54(): CardRanking;
    static createCustom(options: CreateCardRankingOptions): CardRanking;
    static create(options: CreateCardRankingOptions): CardRanking;
}
