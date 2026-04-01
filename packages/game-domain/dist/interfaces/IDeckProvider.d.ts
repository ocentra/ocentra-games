import type { Card } from '../types/game';
export interface IDeckProvider {
    createStandardDeck(): Promise<Card[]>;
    shuffleDeck(deck: Card[]): Card[];
    dealInitialHands(deck: Card[], playerCount: number, handSize: number): {
        hands: Card[][];
        remainingDeck: Card[];
    };
    drawCard(deck: Card[]): {
        card: Card | null;
        remainingDeck: Card[];
    };
    getSeed(): number;
    setSeed(seed: number): void;
}
