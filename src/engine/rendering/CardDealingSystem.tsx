import { useRef, useCallback, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Group, Vector3, CubicBezierCurve3 } from 'three'
import { useSpring, animated, config } from '@react-spring/three'
import { InteractiveCard3D } from './InteractiveCard3D'
import { type Card } from '@/types'

interface DealingCard {
  card: Card
  targetPosition: [number, number, number]
  targetRotation: [number, number, number]
  startTime: number
  duration: number
  curve: CubicBezierCurve3
}

interface CardDealingSystemProps {
  cards: Card[]
  targetPositions: Array<[number, number, number]>
  targetRotations?: Array<[number, number, number]>
  deckPosition?: [number, number, number]
  dealingSpeed?: number
  onDealingComplete?: () => void
  onCardDealt?: (card: Card, index: number) => void
}

export function CardDealingSystem({
  cards,
  targetPositions,
  targetRotations,
  deckPosition = [0, 0.1, 0],
  dealingSpeed = 1000, // milliseconds per card
  onDealingComplete,
  onCardDealt,
}: CardDealingSystemProps) {
  const groupRef = useRef<Group>(null)
  const dealingCardsRef = useRef<DealingCard[]>([])
  const startTimeRef = useRef<number>(0)
  const completedCardsRef = useRef<Set<string>>(new Set())

  // Generate dealing curves for realistic arc trajectories
  const generateDealingCurve = useCallback((
    start: Vector3,
    end: Vector3,
    arcHeight: number = 1.5
  ): CubicBezierCurve3 => {
    const midPoint1 = start.clone().lerp(end, 0.33)
    midPoint1.y += arcHeight
    
    const midPoint2 = start.clone().lerp(end, 0.66)
    midPoint2.y += arcHeight * 0.7
    
    return new CubicBezierCurve3(start, midPoint1, midPoint2, end)
  }, [])

  // Initialize dealing cards when cards change
  useMemo(() => {
    if (cards.length === 0) return

    const currentTime = Date.now()
    startTimeRef.current = currentTime
    completedCardsRef.current.clear()

    dealingCardsRef.current = cards.map((card, index) => {
      const targetPos = targetPositions[index] || [0, 0, 0]
      const targetRot = targetRotations?.[index] || [0, 0, 0]
      
      const startPos = new Vector3(...deckPosition)
      const endPos = new Vector3(...targetPos)
      
      return {
        card,
        targetPosition: targetPos,
        targetRotation: targetRot,
        startTime: currentTime + (index * dealingSpeed * 0.3), // Stagger dealing
        duration: dealingSpeed,
        curve: generateDealingCurve(startPos, endPos),
      }
    })
  }, [cards, targetPositions, targetRotations, deckPosition, dealingSpeed, generateDealingCurve])

  // Animation frame loop for dealing
  useFrame(() => {
    const currentTime = Date.now()
    let allComplete = true

    dealingCardsRef.current.forEach((dealingCard, index) => {
      const { card, startTime, duration } = dealingCard
      const elapsed = currentTime - startTime
      
      if (elapsed < 0) {
        allComplete = false
        return // Not started yet
      }
      
      if (elapsed >= duration) {
        // Card dealing complete
        if (!completedCardsRef.current.has(card.id)) {
          completedCardsRef.current.add(card.id)
          onCardDealt?.(card, index)
        }
        return
      }
      
      allComplete = false
      
      // Calculate position along curve
      const t = Math.min(elapsed / duration, 1)
      const easedT = 1 - Math.pow(1 - t, 3) // Ease out cubic
      
      // Update card position along curve
      const position = dealingCard.curve.getPoint(easedT)
      
      // Add some rotation during flight
      const rotationY = Math.sin(t * Math.PI * 2) * 0.5
      
      // This would be handled by the individual card components
      // The actual position updates happen in the render loop
    })

    // Check if all cards are dealt
    if (allComplete && completedCardsRef.current.size === cards.length) {
      onDealingComplete?.()
    }
  })

  return (
    <group ref={groupRef}>
      {dealingCardsRef.current.map((dealingCard, index) => {
        const { card, targetPosition, targetRotation, startTime, duration, curve } = dealingCard
        
        return (
          <DealingCard
            key={card.id}
            card={card}
            curve={curve}
            targetPosition={targetPosition}
            targetRotation={targetRotation}
            startTime={startTime}
            duration={duration}
            onComplete={() => onCardDealt?.(card, index)}
          />
        )
      })}
    </group>
  )
}

interface DealingCardProps {
  card: Card
  curve: CubicBezierCurve3
  targetPosition: [number, number, number]
  targetRotation: [number, number, number]
  startTime: number
  duration: number
  onComplete: () => void
}

function DealingCard({
  card,
  curve,
  targetPosition,
  targetRotation,
  startTime,
  duration,
  onComplete,
}: DealingCardProps) {
  const cardRef = useRef<Group>(null)
  const completedRef = useRef(false)

  // Animation spring for smooth dealing
  const { progress } = useSpring({
    from: { progress: 0 },
    to: { progress: 1 },
    config: { tension: 120, friction: 20 },
    delay: Math.max(0, startTime - Date.now()),
    onRest: () => {
      if (!completedRef.current) {
        completedRef.current = true
        onComplete()
      }
    },
  })

  useFrame(() => {
    if (!cardRef.current) return
    
    const currentTime = Date.now()
    const elapsed = currentTime - startTime
    
    if (elapsed < 0) return // Not started
    if (elapsed >= duration) {
      // Snap to final position
      cardRef.current.position.set(...targetPosition)
      cardRef.current.rotation.set(...targetRotation)
      return
    }
    
    // Calculate position along curve
    const t = Math.min(elapsed / duration, 1)
    const easedT = 1 - Math.pow(1 - t, 3) // Ease out cubic
    
    const position = curve.getPoint(easedT)
    cardRef.current.position.copy(position)
    
    // Add rotation during flight
    const rotationY = Math.sin(t * Math.PI * 2) * 0.3
    cardRef.current.rotation.set(0, rotationY, 0)
  })

  return (
    <group ref={cardRef}>
      <InteractiveCard3D
        card={card}
        position={[0, 0, 0]} // Position controlled by parent group
        showFace={false} // Cards are face down during dealing
        isDraggable={false}
      />
    </group>
  )
}