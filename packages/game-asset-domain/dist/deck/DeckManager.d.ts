import 'reflect-metadata';
import { ReactBehaviour } from '@ocentra/behaviour-domain/ReactBehaviour';
import { Deck } from '../card/deck/Deck';
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry';
import { DeckType } from '../deck/DeckType';
import type { Card } from '@ocentra/game-domain/types/game';
export declare class DeckManager extends ReactBehaviour {
    static executionOrder: number;
    deckEntries: AssetResourceEntry<Deck>[];
    private deckCache;
    private seed;
    private originalSeed;
    private static instance;
    private static loadingPromise;
    constructor(seed?: number);
    protected awake(): void;
    static getOrCreateInstance(): Promise<DeckManager>;
    private syncFromAssetRegistry;
    getDefaultDeck(): Promise<Deck | null>;
    private loadDeckFromEntry;
    getDeck(deckType: DeckType, suitSet?: string, rankSet?: string): Promise<Deck | null>;
    getDeckByTriple(deckType: DeckType, suitSet: string, rankSet: string): Promise<Deck | null>;
    findDeckEntry(deckType: DeckType): AssetResourceEntry<Deck> | null;
    registerDeck(entry: AssetResourceEntry<Deck>): void;
    getAllDecks(): Promise<Deck[]>;
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
    clearCache(): void;
}
