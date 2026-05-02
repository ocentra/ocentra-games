import { Suit, type Card, type CardValue, type RuntimePiece } from '@ocentra/game-domain/types/game';
import { createRuntimeCard, runtimePiecesToCards } from '@ocentra/game-domain/deck/runtimeDeck';
import type { IDeckProvider } from '@ocentra/game-domain/interfaces/IDeckProvider';

class SeededDeckProvider implements IDeckProvider {
  private seed: number;
  private originalSeed: number;
  private readonly deckFactory: () => Card[];

  constructor(deckFactory: () => Card[], seed = 1) {
    this.deckFactory = deckFactory;
    this.seed = seed;
    this.originalSeed = seed;
  }

  async createStandardDeck(): Promise<Card[]> {
    return this.deckFactory();
  }

  async createDeck(): Promise<Card[]> {
    return this.createStandardDeck();
  }

  shuffleDeck(deck: RuntimePiece[]): Card[] {
    const shuffled = runtimePiecesToCards(deck);
    let currentIndex = shuffled.length;
    this.resetSeed();

    while (currentIndex !== 0) {
      const randomIndex = Math.floor(this.seededRandom() * currentIndex);
      currentIndex -= 1;
      [shuffled[currentIndex], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[currentIndex]];
    }

    return shuffled;
  }

  dealInitialHands(deck: RuntimePiece[], playerCount: number, handSize: number): { hands: Card[][]; remainingDeck: Card[] } {
    const hands: Card[][] = Array.from({ length: playerCount }, () => []);
    const remainingDeck = runtimePiecesToCards(deck);

    for (let cardIndex = 0; cardIndex < handSize; cardIndex += 1) {
      for (let playerIndex = 0; playerIndex < playerCount; playerIndex += 1) {
        const card = remainingDeck.shift();
        if (card) {
          hands[playerIndex].push(card);
        }
      }
    }

    return { hands, remainingDeck };
  }

  drawPiece(deck: RuntimePiece[]): { piece: Card | null; remainingDeck: Card[] } {
    const result = this.drawCard(deck);
    return {
      piece: result.card,
      remainingDeck: result.remainingDeck,
    };
  }

  drawCard(deck: RuntimePiece[]): { card: Card | null; remainingDeck: Card[] } {
    const remainingDeck = runtimePiecesToCards(deck);
    const card = remainingDeck.shift() ?? null;
    return { card, remainingDeck };
  }

  getSeed(): number {
    return this.seed;
  }

  setSeed(seed: number): void {
    this.seed = seed;
    this.originalSeed = seed;
  }

  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  private resetSeed(): void {
    this.seed = this.originalSeed;
  }
}

function createDeck(values: CardValue[]): Card[] {
  return [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS].flatMap((suit) =>
    values.map((value) => createRuntimeCard({
      suit,
      value,
      id: `${value}_of_${suit}`,
    })),
  );
}

export function createFrench52DeckProvider(seed = 1): IDeckProvider {
  return new SeededDeckProvider(() => createDeck([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]), seed);
}

export function createItalian40DeckProvider(seed = 1): IDeckProvider {
  return new SeededDeckProvider(() => createDeck([2, 3, 4, 5, 6, 7, 11, 12, 13, 14]), seed);
}
