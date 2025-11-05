import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Box, useCursor } from '@react-three/drei'
import { Group, Vector3, Euler, Quaternion } from 'three'
import { type Card } from '@/types'
import { useSpring, animated, config } from '@react-spring/three'

// Optional physics hook - fallback if cannon is not available
const useOptionalPhysics = (enabled: boolean, config: any) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useBox } = require('@react-three/cannon')
    return enabled ? useBox(() => config) : [{ current: null }]
  } catch {
    return [{ current: null }]
  }
}

interface InteractiveCard3DProps {
  card?: Card
  position?: [number, number, number]
  rotation?: [number, number, number]
  isHovered?: boolean
  isSelected?: boolean
  showFace?: boolean
  isFlipping?: boolean
  isDraggable?: boolean
  isValidTarget?: boolean
  isInvalidTarget?: boolean
  onClick?: () => void
  onHover?: (hovered: boolean) => void
  onDragStart?: (card: Card) => void
  onDragEnd?: (card: Card, position: [number, number, number]) => void
  onFlip?: () => void
}

export function InteractiveCard3D({
  card,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isHovered = false,
  isSelected = false,
  showFace = true,
  isFlipping = false,
  isDraggable = false,
  isValidTarget = false,
  isInvalidTarget = false,
  onClick,
  onHover,
  onDragStart,
  onDragEnd,
  onFlip,
}: InteractiveCard3DProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState<Vector3>(new Vector3())
  const { camera, raycaster, pointer } = useThree()
  
  // Card dimensions (standard playing card proportions)
  const cardWidth = 0.63
  const cardHeight = 0.88
  const cardThickness = 0.02

  // Physics body for collision detection (optional)
  const [physicsRef] = useOptionalPhysics(isDraggable, {
    mass: isDraggable ? 1 : 0,
    position,
    args: [cardWidth, cardThickness, cardHeight],
    type: isDraggable ? 'Dynamic' : 'Static',
  })

  // Cursor management
  useCursor(hovered && (isDraggable || onClick), 'pointer', 'auto')

  // Animation springs
  const { scale, positionY, rotationY } = useSpring({
    scale: isSelected ? 1.1 : hovered ? 1.05 : 1,
    positionY: isDragging ? position[1] + 0.3 : (isHovered || hovered) ? position[1] + 0.1 : position[1],
    rotationY: isFlipping ? Math.PI : 0,
    config: isDragging ? config.wobbly : config.gentle,
  })

  // Flip animation
  const flipSpring = useSpring({
    rotationY: showFace ? 0 : Math.PI,
    config: config.slow,
  })

  // Visual feedback colors
  const getCardColor = useCallback(() => {
    if (isInvalidTarget) return '#ef4444' // Red for invalid
    if (isValidTarget) return '#22c55e' // Green for valid
    if (isSelected) return '#fbbf24' // Amber for selected
    return '#ffffff' // Default white
  }, [isSelected, isValidTarget, isInvalidTarget])

  // Glow effect for feedback
  const getEmissiveColor = useCallback(() => {
    if (isInvalidTarget) return '#dc2626'
    if (isValidTarget) return '#16a34a'
    if (isSelected) return '#d97706'
    return '#000000'
  }, [isSelected, isValidTarget, isInvalidTarget])

  // Handle pointer events
  const handlePointerOver = useCallback(() => {
    if (!isDragging) {
      setHovered(true)
      onHover?.(true)
    }
  }, [isDragging, onHover])

  const handlePointerOut = useCallback(() => {
    if (!isDragging) {
      setHovered(false)
      onHover?.(false)
    }
  }, [isDragging, onHover])

  const handlePointerDown = useCallback((event: any) => {
    if (!isDraggable || !card) return
    
    event.stopPropagation()
    setIsDragging(true)
    
    // Calculate drag offset
    const intersection = event.intersections[0]
    if (intersection && groupRef.current) {
      const worldPosition = new Vector3()
      groupRef.current.getWorldPosition(worldPosition)
      setDragOffset(worldPosition.clone().sub(intersection.point))
    }
    
    onDragStart?.(card)
  }, [isDraggable, card, onDragStart])

  const handlePointerUp = useCallback(() => {
    if (isDragging && card && groupRef.current) {
      const worldPosition = new Vector3()
      groupRef.current.getWorldPosition(worldPosition)
      onDragEnd?.(card, [worldPosition.x, worldPosition.y, worldPosition.z])
    }
    setIsDragging(false)
  }, [isDragging, card, onDragEnd])

  const handleClick = useCallback((event: any) => {
    if (!isDragging) {
      event.stopPropagation()
      onClick?.()
    }
  }, [isDragging, onClick])

  // Drag movement
  useFrame(() => {
    if (isDragging && groupRef.current) {
      // Convert mouse position to world coordinates
      const vector = new Vector3(pointer.x, pointer.y, 0.5)
      vector.unproject(camera)
      
      const dir = vector.sub(camera.position).normalize()
      const distance = -camera.position.z / dir.z
      const pos = camera.position.clone().add(dir.multiplyScalar(distance))
      
      // Apply drag offset
      pos.add(dragOffset)
      
      // Update position with smooth interpolation
      groupRef.current.position.lerp(pos, 0.1)
    }
  })

  // Card display text
  const getCardDisplayText = useCallback(() => {
    if (!card) return '?'
    
    const valueMap: Record<number, string> = {
      14: 'A', 13: 'K', 12: 'Q', 11: 'J'
    }
    
    const value = valueMap[card.value] || card.value.toString()
    const suitSymbol = {
      spades: '♠',
      hearts: '♥',
      diamonds: '♦',
      clubs: '♣'
    }[card.suit]
    
    return `${value}${suitSymbol}`
  }, [card])

  const getTextColor = useCallback(() => {
    if (!card) return '#000000'
    return card.suit === 'hearts' || card.suit === 'diamonds' ? '#dc2626' : '#000000'
  }, [card])

  // Dealing animation (arc trajectory)
  const dealingAnimation = useSpring({
    from: { 
      position: [0, 2, 0] as [number, number, number],
      rotation: [0, Math.PI * 2, 0] as [number, number, number]
    },
    to: { 
      position: position,
      rotation: rotation
    },
    config: { tension: 120, friction: 14 },
  })

  return (
    <animated.group
      ref={groupRef}
      position={isDragging ? undefined : positionY.to(y => [position[0], y, position[2]])}
      rotation={rotation}
      scale={scale}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
    >
      {/* Physics body reference */}
      <group ref={physicsRef}>
        {/* Card body with thickness and glow effect */}
        <Box
          args={[cardWidth, cardThickness, cardHeight]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color={getCardColor()}
            emissive={getEmissiveColor()}
            emissiveIntensity={0.2}
            roughness={0.1}
            metalness={0.1}
          />
        </Box>

        {/* Card face with flip animation */}
        <animated.group rotation-y={flipSpring.rotationY}>
          {/* Front face (card face) */}
          <mesh 
            position={[0, cardThickness / 2 + 0.001, 0]} 
            rotation={[-Math.PI / 2, 0, 0]}
            visible={showFace}
          >
            <planeGeometry args={[cardWidth * 0.9, cardHeight * 0.9]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          
          {/* Card text */}
          {showFace && card && (
            <mesh position={[0, cardThickness / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.3, 0.2]} />
              <meshBasicMaterial color={getTextColor()} transparent opacity={0.9} />
            </mesh>
          )}
        </animated.group>

        {/* Back face (always opposite to front) */}
        <animated.group rotation-y={flipSpring.rotationY.to(y => y + Math.PI)}>
          <mesh 
            position={[0, cardThickness / 2 + 0.001, 0]} 
            rotation={[-Math.PI / 2, 0, 0]}
            visible={!showFace}
          >
            <planeGeometry args={[cardWidth * 0.9, cardHeight * 0.9]} />
            <meshStandardMaterial 
              color="#1e40af" 
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
          
          {/* Card back pattern */}
          <mesh position={[0, cardThickness / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.4, 0.1]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
          </mesh>
        </animated.group>

        {/* Card edges for 3D effect */}
        <mesh position={[cardWidth / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <planeGeometry args={[cardThickness, cardHeight]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
        <mesh position={[-cardWidth / 2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <planeGeometry args={[cardThickness, cardHeight]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
        <mesh position={[0, 0, cardHeight / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cardWidth, cardThickness]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>
        <mesh position={[0, 0, -cardHeight / 2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cardWidth, cardThickness]} />
          <meshStandardMaterial color="#f3f4f6" />
        </mesh>

        {/* Selection highlight ring */}
        {(isSelected || isValidTarget || isInvalidTarget) && (
          <mesh position={[0, cardThickness / 2 + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[cardWidth * 0.6, cardWidth * 0.65, 32]} />
            <meshBasicMaterial 
              color={getEmissiveColor()} 
              transparent 
              opacity={0.6}
            />
          </mesh>
        )}

        {/* Particle effects for special actions */}
        {isDragging && (
          <mesh position={[0, cardThickness / 2 + 0.01, 0]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.7} />
          </mesh>
        )}
      </group>
    </animated.group>
  )
}