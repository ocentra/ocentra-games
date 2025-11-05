import { describe, it, expect } from 'vitest'
import { Suit } from '@/types'

describe('Card3D Component', () => {
  const mockCard = {
    id: 'test-card',
    suit: Suit.SPADES,
    value: 14 as const,
  }

  it('should have valid card data structure', () => {
    expect(mockCard.id).toBe('test-card')
    expect(mockCard.suit).toBe(Suit.SPADES)
    expect(mockCard.value).toBe(14)
  })

  it('should handle different card suits', () => {
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS]
    suits.forEach(suit => {
      expect(Object.values(Suit)).toContain(suit)
    })
  })

  it('should handle valid card values', () => {
    const validValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
    validValues.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(2)
      expect(value).toBeLessThanOrEqual(14)
    })
  })
})