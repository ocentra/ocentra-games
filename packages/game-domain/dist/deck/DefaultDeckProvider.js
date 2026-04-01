import { Suit } from '../types/game.js';
export class DefaultDeckProvider {
    seed;
    originalSeed;
    constructor(seed) {
        this.seed = seed ?? Date.now();
        this.originalSeed = this.seed;
    }
    async createStandardDeck() {
        return this.createStandardDeckFallback();
    }
    createStandardDeckFallback() {
        const deck = [];
        const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
        const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
        for (const suit of suits) {
            for (const value of values) {
                deck.push({
                    suit,
                    value,
                    id: `${value}_of_${suit}`,
                });
            }
        }
        return deck;
    }
    shuffleDeck(deck) {
        const shuffled = [...deck];
        let currentIndex = shuffled.length;
        this.resetSeed();
        while (currentIndex !== 0) {
            const randomIndex = Math.floor(this.seededRandom() * currentIndex);
            currentIndex--;
            [shuffled[currentIndex], shuffled[randomIndex]] = [
                shuffled[randomIndex],
                shuffled[currentIndex],
            ];
        }
        return shuffled;
    }
    dealInitialHands(deck, playerCount, handSize) {
        const hands = Array.from({ length: playerCount }, () => []);
        const remainingDeck = [...deck];
        for (let cardIndex = 0; cardIndex < handSize; cardIndex++) {
            for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
                const card = remainingDeck.shift();
                if (card) {
                    hands[playerIndex].push(card);
                }
            }
        }
        return { hands, remainingDeck };
    }
    drawCard(deck) {
        const remainingDeck = [...deck];
        const card = remainingDeck.shift() ?? null;
        return { card, remainingDeck };
    }
    getSeed() {
        return this.seed;
    }
    setSeed(seed) {
        this.seed = seed;
    }
    seededRandom() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
    }
    resetSeed() {
        this.seed = this.originalSeed;
    }
}
