import type { Card, CardValue, RuntimePiece } from '@/types/game';
import { Suit } from '@/types/game';
import type { IDeckProvider } from '@/interfaces/IDeckProvider';
import {
  createRuntimeCard,
  dealRuntimePieces,
  drawRuntimePiece,
  materializeRuntimePieces,
  runtimePiecesToCards,
  shuffleRuntimePieces,
} from '@/deck/runtimeDeck';

export class DefaultDeckProvider implements IDeckProvider {
  private seed: number;
  private originalSeed: number;

  constructor(seed?: number) {
    this.seed = seed ?? Date.now();
    this.originalSeed = this.seed;
  }

  async createStandardDeck(): Promise<Card[]> {
    return runtimePiecesToCards(await this.createDeck());
  }

  async createDeck(): Promise<RuntimePiece[]> {
    return materializeRuntimePieces(this.createStandardDeckFallback());
  }

  private createStandardDeckFallback(): Card[] {
    const deck: Card[] = [];
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as CardValue[];

    for (const suit of suits) {
      for (const value of values) {
        deck.push({
          ...createRuntimeCard({
            suit,
            value,
            id: `${value}_of_${suit}`,
          }),
        });
      }
    }

    return deck;
  }

  shuffleDeck(deck: RuntimePiece[]): RuntimePiece[] {
    this.resetSeed();
    return shuffleRuntimePieces(deck, this.seed);
  }

  dealInitialHands(
    deck: RuntimePiece[],
    playerCount: number,
    handSize: number
  ): { hands: RuntimePiece[][]; remainingDeck: RuntimePiece[] } {
    return dealRuntimePieces(deck, playerCount, handSize);
  }

  drawPiece(deck: RuntimePiece[]): { piece: RuntimePiece | null; remainingDeck: RuntimePiece[] } {
    return drawRuntimePiece(deck);
  }

  drawCard(deck: RuntimePiece[]): { card: RuntimePiece | null; remainingDeck: RuntimePiece[] } {
    const { piece, remainingDeck } = this.drawPiece(deck);
    return { card: piece, remainingDeck };
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
  }

  private resetSeed(): void {
    this.seed = this.originalSeed;
  }
}
