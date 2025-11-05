import { useRef, useState, useCallback, useMemo } from 'react'
import { Group } from 'three'
import { CardDealingSystem } from './CardDealingSystem'
import { CardDragDropSystem } from './CardDragDropSystem'
import { CardFlipSystem } from './CardFlipSystem'
import { type Card } from '@/types'

export interface InteractionCard {
  card: Card
  position: [number, number, number]
  rotation: [number, number, number]
  showFace: boolean
  isSelected: boolean
  isDraggable: boolean
  isFlipping: boolean
  isDealing: boolean
}

export interface DropZone {
  id: string
  position: [number, number, number]
  size: [number, number, number]
  isValid: (card: Card) => boolean
  onDrop: (card: Card) => void
  color?: string
  label?: string
}

export interface CardInteractionState {
  mode: 'dealing' | 'playing' | 'showdown' | 'scoring'
  selectedCards: Set<string>
  draggingCard: Card | null
  flippingCards: Set<string>
  dealingCards: Set<string>
}

interface CardInteractionManagerProps {
  cards: InteractionCard[]
  dropZones?: DropZone[]
  state: CardInteractionState
  onStateChange: (state: Partial<CardInteractionState>) => void
  onCardAction: (action: CardAction) => void
  dealingConfig?: {
    deckPosition: [number, number, number]
    dealingSpeed: number
    staggerDelay: number
  }
  dragDropConfig?: {
    multiSelect: boolean
    snapToGrid: boolean
    gridSize: number
  }
  flipConfig?: {
    simultaneousFlip: boolean
    flipDelay: number
    flipSound: boolean
  }
}

export interface CardAction {
  type: 'select' | 'deselect' | 'drag_start' | 'drag_end' | 'flip' | 'deal' | 'hover'
  card: Card
  data?: any
}

export function CardInteractionManager({
  cards,
  dropZones = [],
  state,
  onStateChange,
  onCardAction,
  dealingConfig = {
    deckPosition: [0, 0.1, 0],
    dealingSpeed: 1000,
    staggerDelay: 300,
  },
  dragDropConfig = {
    multiSelect: false,
    snapToGrid: false,
    gridSize: 0.5,
  },
  flipConfig = {
    simultaneousFlip: false,
    flipDelay: 100,
    flipSound: true,
  },
}: CardInteractionManagerProps) {
  const groupRef = useRef<Group>(null)

  // Separate cards by their current state
  const { dealingCards, playingCards, flippingCards } = useMemo(() => {
    const dealing: Card[] = []
    const playing: InteractionCard[] = []
    const flipping: InteractionCard[] = []

    cards.forEach((cardData) => {
      if (cardData.isDealing) {
        dealing.push(cardData.card)
      } else if (cardData.isFlipping) {
        flipping.push(cardData)
      } else {
        playing.push(cardData)
      }
    })

    return {
      dealingCards: dealing,
      playingCards: playing,
      flippingCards: flipping,
    }
  }, [cards])

  // Handle card selection
  const handleCardSelect = useCallback((card: Card) => {
    const newSelected = new Set(state.selectedCards)
    
    if (!dragDropConfig.multiSelect) {
      newSelected.clear()
    }
    
    newSelected.add(card.id)
    
    onStateChange({ selectedCards: newSelected })
    onCardAction({ type: 'select', card })
  }, [state.selectedCards, dragDropConfig.multiSelect, onStateChange, onCardAction])

  // Handle card deselection
  const handleCardDeselect = useCallback((card: Card) => {
    const newSelected = new Set(state.selectedCards)
    newSelected.delete(card.id)
    
    onStateChange({ selectedCards: newSelected })
    onCardAction({ type: 'deselect', card })
  }, [state.selectedCards, onStateChange, onCardAction])

  // Handle drag start
  const handleDragStart = useCallback((card: Card) => {
    onStateChange({ draggingCard: card })
    onCardAction({ type: 'drag_start', card })
  }, [onStateChange, onCardAction])

  // Handle drag end
  const handleDragEnd = useCallback((card: Card, dropZone?: DropZone) => {
    onStateChange({ draggingCard: null })
    onCardAction({ 
      type: 'drag_end', 
      card, 
      data: { dropZone } 
    })
  }, [onStateChange, onCardAction])

  // Handle card flip
  const handleFlipStart = useCallback((card: Card) => {
    const newFlipping = new Set(state.flippingCards)
    newFlipping.add(card.id)
    
    onStateChange({ flippingCards: newFlipping })
    onCardAction({ type: 'flip', card, data: { phase: 'start' } })
  }, [state.flippingCards, onStateChange, onCardAction])

  // Handle flip complete
  const handleFlipComplete = useCallback((card: Card, showFace: boolean) => {
    const newFlipping = new Set(state.flippingCards)
    newFlipping.delete(card.id)
    
    onStateChange({ flippingCards: newFlipping })
    onCardAction({ 
      type: 'flip', 
      card, 
      data: { phase: 'complete', showFace } 
    })
  }, [state.flippingCards, onStateChange, onCardAction])

  // Handle dealing complete
  const handleDealingComplete = useCallback(() => {
    onStateChange({ mode: 'playing' })
  }, [onStateChange])

  // Handle card dealt
  const handleCardDealt = useCallback((card: Card, index: number) => {
    const newDealing = new Set(state.dealingCards)
    newDealing.delete(card.id)
    
    onStateChange({ dealingCards: newDealing })
    onCardAction({ 
      type: 'deal', 
      card, 
      data: { index, phase: 'complete' } 
    })
  }, [state.dealingCards, onStateChange, onCardAction])

  // Handle card hover
  const handleCardHover = useCallback((card: Card, hovered: boolean) => {
    onCardAction({ 
      type: 'hover', 
      card, 
      data: { hovered } 
    })
  }, [onCardAction])

  // Prepare target positions for dealing
  const dealingTargetPositions = useMemo(() => {
    return dealingCards.map((card) => {
      const cardData = cards.find(c => c.card.id === card.id)
      return cardData?.position || [0, 0, 0] as [number, number, number]
    })
  }, [dealingCards, cards])

  // Prepare target rotations for dealing
  const dealingTargetRotations = useMemo(() => {
    return dealingCards.map((card) => {
      const cardData = cards.find(c => c.card.id === card.id)
      return cardData?.rotation || [0, 0, 0] as [number, number, number]
    })
  }, [dealingCards, cards])

  // Convert InteractionCard to DragDropCard format
  const dragDropCards = useMemo(() => {
    return playingCards.map((cardData) => ({
      card: cardData.card,
      position: cardData.position,
      rotation: cardData.rotation,
      isSelected: cardData.isSelected,
      isDraggable: cardData.isDraggable && state.mode === 'playing',
      showFace: cardData.showFace,
    }))
  }, [playingCards, state.mode])

  // Convert InteractionCard to FlipCard format
  const flipCards = useMemo(() => {
    return flippingCards.map((cardData) => ({
      card: cardData.card,
      position: cardData.position,
      rotation: cardData.rotation,
      showFace: cardData.showFace,
      isFlipping: cardData.isFlipping,
    }))
  }, [flippingCards])

  return (
    <group ref={groupRef}>
      {/* Dealing System - Active during dealing phase */}
      {state.mode === 'dealing' && dealingCards.length > 0 && (
        <CardDealingSystem
          cards={dealingCards}
          targetPositions={dealingTargetPositions}
          targetRotations={dealingTargetRotations}
          deckPosition={dealingConfig.deckPosition}
          dealingSpeed={dealingConfig.dealingSpeed}
          onDealingComplete={handleDealingComplete}
          onCardDealt={handleCardDealt}
        />
      )}

      {/* Drag & Drop System - Active during playing phase */}
      {(state.mode === 'playing' || state.mode === 'showdown') && (
        <CardDragDropSystem
          cards={dragDropCards}
          dropZones={dropZones}
          onCardSelect={handleCardSelect}
          onCardDeselect={handleCardDeselect}
          onCardDragStart={handleDragStart}
          onCardDragEnd={handleDragEnd}
          onCardHover={handleCardHover}
          multiSelect={dragDropConfig.multiSelect}
          snapToGrid={dragDropConfig.snapToGrid}
          gridSize={dragDropConfig.gridSize}
        />
      )}

      {/* Flip System - Active for flipping animations */}
      {flipCards.length > 0 && (
        <CardFlipSystem
          cards={flipCards}
          onFlipStart={handleFlipStart}
          onFlipComplete={handleFlipComplete}
          onCardHover={handleCardHover}
          simultaneousFlip={flipConfig.simultaneousFlip}
          flipDelay={flipConfig.flipDelay}
          flipSound={flipConfig.flipSound}
        />
      )}
    </group>
  )
}

// Utility hooks for managing card interactions
export const useCardInteractionState = (initialCards: InteractionCard[]) => {
  const [state, setState] = useState<CardInteractionState>({
    mode: 'dealing',
    selectedCards: new Set(),
    draggingCard: null,
    flippingCards: new Set(),
    dealingCards: new Set(initialCards.filter(c => c.isDealing).map(c => c.card.id)),
  })

  const updateState = useCallback((updates: Partial<CardInteractionState>) => {
    setState(prev => ({ ...prev, ...updates }))
  }, [])

  return [state, updateState] as const
}

// Utility function to create drop zones
export const createDropZone = (
  id: string,
  position: [number, number, number],
  size: [number, number, number],
  validator: (card: Card) => boolean,
  onDrop: (card: Card) => void,
  options?: { color?: string; label?: string }
): DropZone => ({
  id,
  position,
  size,
  isValid: validator,
  onDrop,
  color: options?.color,
  label: options?.label,
})

// Utility function to create interaction cards
export const createInteractionCard = (
  card: Card,
  position: [number, number, number],
  options?: {
    rotation?: [number, number, number]
    showFace?: boolean
    isSelected?: boolean
    isDraggable?: boolean
    isFlipping?: boolean
    isDealing?: boolean
  }
): InteractionCard => ({
  card,
  position,
  rotation: options?.rotation || [0, 0, 0],
  showFace: options?.showFace ?? true,
  isSelected: options?.isSelected ?? false,
  isDraggable: options?.isDraggable ?? true,
  isFlipping: options?.isFlipping ?? false,
  isDealing: options?.isDealing ?? false,
})