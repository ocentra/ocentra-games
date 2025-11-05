import { vi } from 'vitest'
import { 
  createInteractionCard, 
  createDropZone,
  type CardInteractionState 
} from '../CardInteractionManager'
import { type Card, Suit } from '@/types'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { it } from 'node:test'
import { describe } from 'node:test'

const mockCard: Card = {
  id: 'test-card',
  suit: Suit.SPADES,
  value: 14,
}

const mockState: CardInteractionState = {
  mode: 'playing',
  selectedCards: new Set(),
  draggingCard: null,
  flippingCards: new Set(),
  dealingCards: new Set(),
}

describe('CardInteractionManager', () => {
  it('should validate interaction state structure', () => {
    expect(mockState.mode).toBe('playing')
    expect(mockState.selectedCards).toBeInstanceOf(Set)
    expect(mockState.draggingCard).toBeNull()
    expect(mockState.flippingCards).toBeInstanceOf(Set)
    expect(mockState.dealingCards).toBeInstanceOf(Set)
  })

  it('should handle different game modes', () => {
    const modes = ['dealing', 'playing', 'showdown', 'scoring'] as const
    
    modes.forEach(mode => {
      const state = { ...mockState, mode }
      expect(state.mode).toBe(mode)
    })
  })

  it('should manage selected cards set', () => {
    const selectedCards = new Set(['card1', 'card2', 'card3'])
    const state = { ...mockState, selectedCards }
    
    expect(state.selectedCards.size).toBe(3)
    expect(state.selectedCards.has('card1')).toBe(true)
    expect(state.selectedCards.has('card4')).toBe(false)
  })

  it('should handle dragging card state', () => {
    const draggingState = { ...mockState, draggingCard: mockCard }
    expect(draggingState.draggingCard).toBe(mockCard)
    
    const notDraggingState = { ...mockState, draggingCard: null }
    expect(notDraggingState.draggingCard).toBeNull()
  })
})

describe('createInteractionCard', () => {
  it('should create interaction card with default options', () => {
    const card = createInteractionCard(mockCard, [1, 2, 3])
    
    expect(card.card).toBe(mockCard)
    expect(card.position).toEqual([1, 2, 3])
    expect(card.rotation).toEqual([0, 0, 0])
    expect(card.showFace).toBe(true)
    expect(card.isSelected).toBe(false)
    expect(card.isDraggable).toBe(true)
    expect(card.isFlipping).toBe(false)
    expect(card.isDealing).toBe(false)
  })

  it('should create interaction card with custom options', () => {
    const card = createInteractionCard(mockCard, [1, 2, 3], {
      rotation: [0.1, 0.2, 0.3],
      showFace: false,
      isSelected: true,
      isDraggable: false,
      isFlipping: true,
      isDealing: true,
    })
    
    expect(card.rotation).toEqual([0.1, 0.2, 0.3])
    expect(card.showFace).toBe(false)
    expect(card.isSelected).toBe(true)
    expect(card.isDraggable).toBe(false)
    expect(card.isFlipping).toBe(true)
    expect(card.isDealing).toBe(true)
  })
})

describe('createDropZone', () => {
  it('should create drop zone with required properties', () => {
    const validator = vi.fn(() => true)
    const onDrop = vi.fn()
    
    const dropZone = createDropZone(
      'test-zone',
      [1, 2, 3],
      [4, 5, 6],
      validator,
      onDrop
    )
    
    expect(dropZone.id).toBe('test-zone')
    expect(dropZone.position).toEqual([1, 2, 3])
    expect(dropZone.size).toEqual([4, 5, 6])
    expect(dropZone.isValid).toBe(validator)
    expect(dropZone.onDrop).toBe(onDrop)
  })

  it('should create drop zone with optional properties', () => {
    const validator = vi.fn(() => true)
    const onDrop = vi.fn()
    
    const dropZone = createDropZone(
      'test-zone',
      [1, 2, 3],
      [4, 5, 6],
      validator,
      onDrop,
      { color: '#ff0000', label: 'Test Zone' }
    )
    
    expect(dropZone.color).toBe('#ff0000')
    expect(dropZone.label).toBe('Test Zone')
  })
})