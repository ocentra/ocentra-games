import type { Card, RuntimePiece } from '@/types/game';
import type { RuntimeDeckProvider } from '@/deck/runtimeDeck';

export interface IDeckProvider extends RuntimeDeckProvider {
  createDeck(): Promise<RuntimePiece[]>;
  createStandardDeck(): Promise<Card[]>;
  shuffleDeck(deck: RuntimePiece[]): RuntimePiece[];
  dealInitialHands(
    deck: RuntimePiece[],
    playerCount: number,
    handSize: number
  ): { hands: RuntimePiece[][]; remainingDeck: RuntimePiece[] };
  drawPiece(deck: RuntimePiece[]): { piece: RuntimePiece | null; remainingDeck: RuntimePiece[] };
  drawCard(deck: RuntimePiece[]): { card: RuntimePiece | null; remainingDeck: RuntimePiece[] };
  getSeed(): number;
  setSeed(seed: number): void;
}
