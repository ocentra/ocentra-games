import { describe, it, expect, beforeEach } from 'vitest'
import { DeckManager } from '../DeckManager'
import { Suit } from '@/types'

describe('DeckManager', () => {
  let deckManager: DeckManager

  beforeEach(() => {
    deckManager = new DeckManager(12345) // Fixed seed for deterministic tests
  })

  describe('createStandardDeck', () => {
    it('should create a 52-card deck', () => {
      const deck = deckManager.createStandardDeck()
      expect(deck).toHaveLength(52)
    })

    it('should have 13 cards of each suit', () => {
      const deck = deckManager.createStandardDeck()
      
      const spades = deck.filter(card => card.suit === Suit.SPADES)
      const hearts = deck.filter(card => card.suit === Suit.HEARTS)
      const diamonds = deck.filter(card => card.suit === Suit.DIAMONDS)
      const clubs = deck.filter(card => card.suit === Suit.CLUBS)

      expect(spades).toHaveLength(13)
      expect(hearts).toHaveLength(13)
      expect(diamonds).toHaveLength(13)
      expect(clubs).toHaveLength(13)
    })

    it('should have cards with values from 2 to 14', () => {
      const deck = deckManager.createStandardDeck()
      const values = deck.map(card => card.value)
      
      expect(Math.min(...values)).toBe(2)
      expect(Math.max(...values)).toBe(14)
    })

    it('should have unique card IDs', () => {
      const deck = deckManager.createStandardDeck()
      const ids = deck.map(card => card.id)
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(52)
    })
  })

  describe('shuffleDeck', () => {
    it('should return a deck with same cards but different order', () => {
      const originalDeck = deckManager.createStandardDeck()
      const shuffledDeck = deckManager.shuffleDeck(originalDeck)
      
      expect(shuffledDeck).toHaveLength(52)
      expect(shuffledDeck).not.toEqual(originalDeck) // Should be different order
      
      // Should contain same cards
      const originalIds = originalDeck.map(card => card.id).sort()
      const shuffledIds = shuffledDeck.map(card => card.id).sort()
      expect(shuffledIds).toEqual(originalIds)
    })

    it('should produce deterministic results with same seed', () => {
      const deck1 = deckManager.createStandardDeck()
      const deck2 = deckManager.createStandardDeck()
      
      const shuffled1 = deckManager.shuffleDeck(deck1)
      const shuffled2 = deckManager.shuffleDeck(deck2)
      
      expect(shuffled1).toEqual(shuffled2)
    })
  })

  describe('dealInitialHands', () => {
    it('should deal correct number of cards to each player', () => {
      const deck = deckManager.createStandardDeck()
      const { hands, remainingDeck } = deckManager.dealInitialHands(deck, 4, 3)
      
      expect(hands).toHaveLength(4)
      hands.forEach(hand => {
        expect(hand).toHaveLength(3)
      })
      expect(remainingDeck).toHaveLength(52 - 12) // 52 - (4 players × 3 cards)
    })

    it('should deal unique cards to each player', () => {
      const deck = deckManager.createStandardDeck()
      const { hands } = deckManager.dealInitialHands(deck, 4, 3)
      
      const allDealtCards = hands.flat()
      const cardIds = allDealtCards.map(card => card.id)
      const uniqueIds = new Set(cardIds)
      
      expect(uniqueIds.size).toBe(12) // All dealt cards should be unique
    })
  })

  describe('drawCard', () => {
    it('should draw the top card from deck', () => {
      const deck = deckManager.createStandardDeck()
      const topCard = deck[0]
      
      const { card, remainingDeck } = deckManager.drawCard(deck)
      
      expect(card).toEqual(topCard)
      expect(remainingDeck).toHaveLength(51)
      expect(remainingDeck).not.toContain(topCard)
    })

    it('should return null when deck is empty', () => {
      const { card, remainingDeck } = deckManager.drawCard([])
      
      expect(card).toBeNull()
      expect(remainingDeck).toHaveLength(0)
    })
  })
})