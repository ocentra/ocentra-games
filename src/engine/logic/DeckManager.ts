import { type Card, Suit } from '@/types'

export class DeckManager {
  private seed: number
  private originalSeed: number

  constructor(seed?: number) {
    this.seed = seed ?? Date.now()
    this.originalSeed = this.seed
  }

  /**
   * Creates a standard 52-card deck
   */
  createStandardDeck(): Card[] {
    const deck: Card[] = []
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS]
    const values = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14] as const

    for (const suit of suits) {
      for (const value of values) {
        deck.push({
          suit,
          value,
          id: `${value}_of_${suit}`,
        })
      }
    }

    return deck
  }

  /**
   * Shuffles a deck using deterministic random based on seed
   * Uses Fisher-Yates shuffle algorithm with seeded random
   */
  shuffleDeck(deck: Card[]): Card[] {
    const shuffled = [...deck]
    let currentIndex = shuffled.length

    // Reset random seed for deterministic shuffling
    this.resetSeed()

    while (currentIndex !== 0) {
      const randomIndex = Math.floor(this.seededRandom() * currentIndex)
      currentIndex--

      // Swap elements
      ;[shuffled[currentIndex], shuffled[randomIndex]] = [
        shuffled[randomIndex],
        shuffled[currentIndex],
      ]
    }

    return shuffled
  }

  /**
   * Deals initial hands to players
   */
  dealInitialHands(deck: Card[], playerCount: number, handSize: number): {
    hands: Card[][]
    remainingDeck: Card[]
  } {
    const hands: Card[][] = Array.from({ length: playerCount }, () => [])
    const remainingDeck = [...deck]

    // Deal cards round-robin style
    for (let cardIndex = 0; cardIndex < handSize; cardIndex++) {
      for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
        const card = remainingDeck.shift()
        if (card) {
          hands[playerIndex].push(card)
        }
      }
    }

    return { hands, remainingDeck }
  }

  /**
   * Draws the next card from the deck (for floor card)
   */
  drawCard(deck: Card[]): { card: Card | null; remainingDeck: Card[] } {
    const remainingDeck = [...deck]
    const card = remainingDeck.shift() || null
    return { card, remainingDeck }
  }

  /**
   * Gets the current seed for synchronization across peers
   */
  getSeed(): number {
    return this.seed
  }

  /**
   * Sets a new seed for deterministic shuffling
   */
  setSeed(seed: number): void {
    this.seed = seed
  }

  /**
   * Seeded random number generator (Linear Congruential Generator)
   * Ensures deterministic random numbers across different clients
   */
  private seededRandom(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }

  /**
   * Resets the seed to its original value for consistent shuffling
   */
  private resetSeed(): void {
    // Reset to original seed for deterministic shuffling
    this.seed = this.originalSeed
  }
}