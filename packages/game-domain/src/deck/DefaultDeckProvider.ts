import type { Card, CardValue } from '@/types/game';
import { Suit } from '@/types/game';
import type { IDeckProvider } from '@/interfaces/IDeckProvider';

export class DefaultDeckProvider implements IDeckProvider {
  private seed: number;
  private originalSeed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
    this.originalSeed = this.seed;
  }

  async createStandardDeck(): Promise<Card[]> {
    return this.createStandardDeckFallback();
  }

  private createStandardDeckFallback(): Card[] {
    const deck: Card[] = [];
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as CardValue[];

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

  shuffleDeck(deck: Card[]): Card[] {
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

  dealInitialHands(
    deck: Card[],
    playerCount: number,
    handSize: number
  ): { hands: Card[][]; remainingDeck: Card[] } {
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);
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

  drawCard(deck: Card[]): { card: Card | null; remainingDeck: Card[] } {
    const remainingDeck = [...deck];
    const card = remainingDeck.shift() ?? null;
    return { card, remainingDeck };
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private resetSeed(): void {
    this.seed = this.originalSeed;
  }
}
