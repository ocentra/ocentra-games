import { type Card } from '@ocentra/game-domain/types/game';
export declare class GameSessionDeckManager {
    private seed;
    private originalSeed;
    private static readonly DECK_LOOKUP_TIMEOUT_MS;
    constructor(seed?: number);
    private waitForDeferred;
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
