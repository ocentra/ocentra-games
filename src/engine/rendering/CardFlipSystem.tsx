import { useRef, useState, useCallback, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group } from 'three'
import { useSpring, animated, config } from '@react-spring/three'
import { InteractiveCard3D } from './InteractiveCard3D'
import { type Card } from '@/types'

interface FlipCard {
  card: Card
  position: [number, number, number]
  rotation: [number, number, number]
  showFace: boolean
  isFlipping: boolean
  flipDuration?: number
}

interface CardFlipSystemProps {
  cards: FlipCard[]
  onFlipStart?: (card: Card) => void
  onFlipComplete?: (card: Card, showFace: boolean) => void
  onCardClick?: (card: Card) => void
  onCardHover?: (card: Card, hovered: boolean) => void
  simultaneousFlip?: boolean
  flipDelay?: number
  flipSound?: boolean
}

export function CardFlipSystem({
  cards,
  onFlipStart,
  onFlipComplete,
  onCardClick,
  onCardHover,
  simultaneousFlip = false,
  flipDelay = 100,
  flipSound = true,
}: CardFlipSystemProps) {
  const groupRef = useRef<Group>(null)
  const [flippingCards, setFlippingCards] = useState<Set<string>>(new Set())
  const flipQueueRef = useRef<Array<{ card: Card; showFace: boolean; delay: number }>>([])
  const audioContextRef = useRef<AudioContext | null>(null)

  // Initialize audio context for flip sounds
  useEffect(() => {
    if (flipSound && !audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      } catch (error) {
        console.warn('Audio context not available:', error)
      }
    }
  }, [flipSound])

  // Play flip sound effect
  const playFlipSound = useCallback(() => {
    if (!flipSound || !audioContextRef.current) return

    try {
      const ctx = audioContextRef.current
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()

      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

      // Create a quick "whoosh" sound
      oscillator.frequency.setValueAtTime(200, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1)

      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.1)
    } catch (error) {
      console.warn('Failed to play flip sound:', error)
    }
  }, [flipSound])

  // Process flip queue
  useFrame(() => {
    const currentTime = Date.now()
    
    while (flipQueueRef.current.length > 0) {
      const nextFlip = flipQueueRef.current[0]
      
      if (currentTime >= nextFlip.delay) {
        const { card, showFace } = flipQueueRef.current.shift()!
        
        setFlippingCards(prev => new Set(prev).add(card.id))
        onFlipStart?.(card)
        playFlipSound()
        
        // Complete flip after animation duration
        setTimeout(() => {
          setFlippingCards(prev => {
            const newSet = new Set(prev)
            newSet.delete(card.id)
            return newSet
          })
          onFlipComplete?.(card, showFace)
        }, 600) // Match animation duration
      } else {
        break
      }
    }
  })

  // Queue card flip
  const queueFlip = useCallback((card: Card, showFace: boolean, delay: number = 0) => {
    const flipTime = Date.now() + delay
    flipQueueRef.current.push({ card, showFace, delay: flipTime })
    
    // Sort queue by delay time
    flipQueueRef.current.sort((a, b) => a.delay - b.delay)
  }, [])

  // Flip single card
  const flipCard = useCallback((card: Card, showFace?: boolean) => {
    const cardData = cards.find(c => c.card.id === card.id)
    if (!cardData || flippingCards.has(card.id)) return

    const newShowFace = showFace !== undefined ? showFace : !cardData.showFace
    queueFlip(card, newShowFace)
  }, [cards, flippingCards, queueFlip])

  // Flip multiple cards with staggered timing
  const flipCards = useCallback((cardIds: string[], showFace?: boolean, staggerDelay: number = flipDelay) => {
    cardIds.forEach((cardId, index) => {
      const cardData = cards.find(c => c.card.id === cardId)
      if (!cardData || flippingCards.has(cardId)) return

      const newShowFace = showFace !== undefined ? showFace : !cardData.showFace
      const delay = simultaneousFlip ? 0 : index * staggerDelay
      queueFlip(cardData.card, newShowFace, delay)
    })
  }, [cards, flippingCards, queueFlip, simultaneousFlip, flipDelay])

  // Flip all cards
  const flipAllCards = useCallback((showFace?: boolean) => {
    const cardIds = cards.map(c => c.card.id)
    flipCards(cardIds, showFace)
  }, [cards, flipCards])

  // Handle card click to flip
  const handleCardClick = useCallback((card: Card) => {
    onCardClick?.(card)
    
    // Auto-flip on click if not specified otherwise
    if (!onCardClick) {
      flipCard(card)
    }
  }, [onCardClick, flipCard])

  return (
    <group ref={groupRef}>
      {cards.map((cardData) => {
        const isFlipping = flippingCards.has(cardData.card.id)
        
        return (
          <FlipAnimatedCard
            key={cardData.card.id}
            card={cardData.card}
            position={cardData.position}
            rotation={cardData.rotation}
            showFace={cardData.showFace}
            isFlipping={isFlipping}
            flipDuration={cardData.flipDuration || 600}
            onClick={() => handleCardClick(cardData.card)}
            onHover={(hovered) => onCardHover?.(cardData.card, hovered)}
          />
        )
      })}
    </group>
  )
}

interface FlipAnimatedCardProps {
  card: Card
  position: [number, number, number]
  rotation: [number, number, number]
  showFace: boolean
  isFlipping: boolean
  flipDuration: number
  onClick: () => void
  onHover: (hovered: boolean) => void
}

function FlipAnimatedCard({
  card,
  position,
  rotation,
  showFace,
  isFlipping,
  flipDuration,
  onClick,
  onHover,
}: FlipAnimatedCardProps) {
  const cardRef = useRef<Group>(null)
  
  // Flip animation spring
  const { rotationY, scale } = useSpring({
    rotationY: showFace ? 0 : Math.PI,
    scale: isFlipping ? [1.1, 1.1, 1.1] : [1, 1, 1],
    config: {
      tension: 200,
      friction: 20,
      duration: flipDuration,
    },
  })

  // Bounce effect during flip
  const { bounceScale } = useSpring({
    bounceScale: isFlipping ? 1.05 : 1,
    config: config.wobbly,
  })

  // Glow effect during flip
  const { glowIntensity } = useSpring({
    glowIntensity: isFlipping ? 0.3 : 0,
    config: config.gentle,
  })

  return (
    <animated.group
      ref={cardRef}
      position={position}
      rotation={rotation}
      scale={scale}
    >
      <animated.group rotation-y={rotationY} scale={bounceScale}>
        <InteractiveCard3D
          card={card}
          position={[0, 0, 0]}
          showFace={showFace}
          isFlipping={isFlipping}
          onClick={onClick}
          onHover={onHover}
        />
        
        {/* Flip glow effect */}
        {isFlipping && (
          <animated.mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.4, 0.5, 32]} />
            <animated.meshBasicMaterial
              color="#fbbf24"
              transparent
              opacity={glowIntensity}
            />
          </animated.mesh>
        )}
      </animated.group>
    </animated.group>
  )
}

// Export utility functions for external use
export const useCardFlip = () => {
  const [flippingCards, setFlippingCards] = useState<Set<string>>(new Set())
  
  const flipCard = useCallback((cardId: string, showFace: boolean) => {
    setFlippingCards(prev => new Set(prev).add(cardId))
    
    setTimeout(() => {
      setFlippingCards(prev => {
        const newSet = new Set(prev)
        newSet.delete(cardId)
        return newSet
      })
    }, 600)
  }, [])
  
  const isFlipping = useCallback((cardId: string) => {
    return flippingCards.has(cardId)
  }, [flippingCards])
  
  return { flipCard, isFlipping }
}