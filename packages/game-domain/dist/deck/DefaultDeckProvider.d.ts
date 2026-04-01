import type { Card } from '../types/game';
import type { IDeckProvider } from '../interfaces/IDeckProvider';
export declare class DefaultDeckProvider implements IDeckProvider {
    private seed;
    private originalSeed;
    constructor(seed?: number);
    createStandardDeck(): Promise<Card[]>;
    private createStandardDeckFallback;
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
    private seededRandom;
    private resetSeed;
}
