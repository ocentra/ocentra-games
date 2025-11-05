import { useRef, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box } from '@react-three/drei'
import { Texture, Group } from 'three'
import { type Card } from '@/types'
import { useCardTextures } from '@/utils/useAssetManager'

interface TexturedCard3DProps {
  card?: Card
  position?: [number, number, number]
  rotation?: [number, number, number]
  isHovered?: boolean
  isSelected?: boolean
  showFace?: boolean
  onClick?: () => void
  onHover?: (hovered: boolean) => void
}

export function TexturedCard3D({
  card,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  isHovered = false,
  isSelected = false,
  showFace = true,
  onClick,
  onHover,
}: TexturedCard3DProps) {
  const groupRef = useRef<Group>(null)
  const [hovered, setHovered] = useState(false)
  const [cardTextures, setCardTextures] = useState<{ front: Texture | null; back: Texture | null }>({ front: null, back: null })
  const { loadCardTexture, isReady } = useCardTextures()

  // Card dimensions (standard playing card proportions)
  const cardWidth = 0.63
  const cardHeight = 0.88
  const cardThickness = 0.02

  // Load card textures when card changes
  useEffect(() => {
    if (!isReady || !card) return

    const loadTextures = async () => {
      try {
        // Map card values to asset names
        const valueMap: Record<number, string> = {
          14: 'ace', 13: 'king', 12: 'queen', 11: 'jack'
        }
        
        const value = valueMap[card.value] || card.value.toString()
        
        // Load the card textures
        const textures = await loadCardTexture(card.suit, value)
        setCardTextures({
          front: textures.front,
          back: textures.back
        })
      } catch (error) {
        console.error('Failed to load card textures:', error)
        // Fallback to null textures
        setCardTextures({ front: null, back: null })
      }
    }

    loadTextures()
  }, [card, isReady, loadCardTexture])

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
        <mesh position={[0, cardThickness / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cardWidth * 0.95, cardHeight * 0.95]} />
          <meshStandardMaterial 
            map={cardTextures.front || undefined}
            color={cardTextures.front ? '#ffffff' : '#f8f9fa'}
          />
        </mesh>
      ) : (
        <mesh position={[0, cardThickness / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[cardWidth * 0.95, cardHeight * 0.95]} />
          <meshStandardMaterial 
            map={cardTextures.back || undefined}
            color={cardTextures.back ? '#ffffff' : '#1e40af'}
          />
        </mesh>
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