import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Box } from '@react-three/drei'
import { Group } from 'three'
import { type Card } from '@/types'

interface Card3DProps {
  card?: Card
  position?: [number, number, number]
  rotation?: [number, number, number]
  isHovered?: boolean
  isSelected?: boolean
  showFace?: boolean
  onClick?: () => void
  onHover?: (hovered: boolean) => void
}

export function Card3D({
  card,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isHovered = false,
  isSelected = false,
  showFace = true,
  onClick,
  onHover,
}: Card3DProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  
  // Card dimensions (standard playing card proportions)
  const cardWidth = 0.63
  const cardHeight = 0.88
  const cardThickness = 0.02

  // Animate hover effect
  useFrame((state) => {
    if (groupRef.current) {
      const targetY = (isHovered || hovered) ? position[1] + 0.1 : position[1]
      groupRef.current.position.y += (targetY - groupRef.current.position.y) * 0.1
      
      // Subtle rotation animation when hovered
      if (isHovered || hovered) {
        groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 2) * 0.05
      } else {
        groupRef.current.rotation.y += (0 - groupRef.current.rotation.y) * 0.1
      }
    }
  })

  const handlePointerOver = () => {
    setHovered(true)
    onHover?.(true)
  }

  const handlePointerOut = () => {
    setHovered(false)
    onHover?.(false)
  }

  const getCardDisplayText = () => {
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
  }

  const getCardColor = () => {
    if (!card) return '#ffffff'
    return card.suit === 'hearts' || card.suit === 'diamonds' ? '#dc2626' : '#000000'
  }

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={onClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* Card body with thickness */}
      <Box
        args={[cardWidth, cardThickness, cardHeight]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial
          color={isSelected ? '#fbbf24' : '#ffffff'}
          roughness={0.1}
          metalness={0.1}
        />
      </Box>

      {/* Card face */}
      {showFace && card ? (
        <>
          {/* Front face */}
          <mesh position={[0, cardThickness / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[cardWidth * 0.9, cardHeight * 0.9]} />
            <meshStandardMaterial color="#ffffff" />
          </mesh>
          
          {/* Card text */}
          <Text
            position={[0, cardThickness / 2 + 0.002, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.15}
            color={getCardColor()}
            anchorX="center"
            anchorY="middle"
          >
            {getCardDisplayText()}
          </Text>
        </>
      ) : (
        <>
          {/* Card back */}
          <mesh position={[0, cardThickness / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[cardWidth * 0.9, cardHeight * 0.9]} />
            <meshStandardMaterial 
              color="#1e40af" 
              roughness={0.3}
              metalness={0.1}
            />
          </mesh>
          
          {/* Card back pattern */}
          <Text
            position={[0, cardThickness / 2 + 0.002, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.08}
            color="#ffffff"
            anchorX="center"
            anchorY="middle"
          >
            CLAIM
          </Text>
        </>
      )}

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
    </group>
  )
}