import { useRef, useState, useCallback, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Group, Vector3, Raycaster, Plane, Box3 } from 'three'
import { InteractiveCard3D } from './InteractiveCard3D'
import { type Card } from '@/types'

interface DropZone {
  id: string
  position: [number, number, number]
  size: [number, number, number]
  isValid: (card: Card) => boolean
  onDrop: (card: Card) => void
  color?: string
  label?: string
}

interface DragDropCard {
  card: Card
  position: [number, number, number]
  rotation: [number, number, number]
  isSelected: boolean
  isDraggable: boolean
  showFace: boolean
}

interface CardDragDropSystemProps {
  cards: DragDropCard[]
  dropZones: DropZone[]
  onCardSelect?: (card: Card) => void
  onCardDeselect?: (card: Card) => void
  onCardDragStart?: (card: Card) => void
  onCardDragEnd?: (card: Card, dropZone?: DropZone) => void
  onCardHover?: (card: Card, hovered: boolean) => void
  multiSelect?: boolean
  snapToGrid?: boolean
  gridSize?: number
}

export function CardDragDropSystem({
  cards,
  dropZones,
  onCardSelect,
  onCardDeselect,
  onCardDragStart,
  onCardDragEnd,
  onCardHover,
  multiSelect = false,
  snapToGrid = false,
  gridSize = 0.5,
}: CardDragDropSystemProps) {
  const groupRef = useRef<Group>(null)
  const [draggedCard, setDraggedCard] = useState<Card | null>(null)
  const [dragOffset, setDragOffset] = useState<Vector3>(new Vector3())
  const [hoveredDropZone, setHoveredDropZone] = useState<DropZone | null>(null)
  const { camera, raycaster, pointer, scene } = useThree()

  // Create invisible plane for drag calculations
  const dragPlane = useMemo(() => new Plane(new Vector3(0, 1, 0), 0), [])

  // Snap position to grid if enabled
  const snapToGridPosition = useCallback((position: Vector3): Vector3 => {
    if (!snapToGrid) return position
    
    return new Vector3(
      Math.round(position.x / gridSize) * gridSize,
      position.y,
      Math.round(position.z / gridSize) * gridSize
    )
  }, [snapToGrid, gridSize])

  // Check if position is within drop zone
  const getDropZoneAt = useCallback((position: Vector3): DropZone | null => {
    for (const zone of dropZones) {
      const zoneBox = new Box3(
        new Vector3(
          zone.position[0] - zone.size[0] / 2,
          zone.position[1] - zone.size[1] / 2,
          zone.position[2] - zone.size[2] / 2
        ),
        new Vector3(
          zone.position[0] + zone.size[0] / 2,
          zone.position[1] + zone.size[1] / 2,
          zone.position[2] + zone.size[2] / 2
        )
      )
      
      if (zoneBox.containsPoint(position)) {
        return zone
      }
    }
    return null
  }, [dropZones])

  // Handle card selection
  const handleCardClick = useCallback((card: Card) => {
    const cardData = cards.find(c => c.card.id === card.id)
    if (!cardData) return

    if (cardData.isSelected) {
      onCardDeselect?.(card)
    } else {
      onCardSelect?.(card)
    }
  }, [cards, onCardSelect, onCardDeselect])

  // Handle drag start
  const handleDragStart = useCallback((card: Card) => {
    const cardData = cards.find(c => c.card.id === card.id)
    if (!cardData?.isDraggable) return

    setDraggedCard(card)
    
    // Calculate drag offset from card center
    raycaster.setFromCamera(pointer, camera)
    const intersection = raycaster.intersectObject(scene, true)[0]
    
    if (intersection) {
      const cardPosition = new Vector3(...cardData.position)
      setDragOffset(cardPosition.clone().sub(intersection.point))
    }
    
    onCardDragStart?.(card)
  }, [cards, camera, raycaster, pointer, scene, onCardDragStart])

  // Handle drag end
  const handleDragEnd = useCallback((card: Card, position: [number, number, number]) => {
    const worldPos = new Vector3(...position)
    const snappedPos = snapToGridPosition(worldPos)
    const dropZone = getDropZoneAt(snappedPos)
    
    // Validate drop
    if (dropZone && dropZone.isValid(card)) {
      dropZone.onDrop(card)
      onCardDragEnd?.(card, dropZone)
    } else {
      // Invalid drop - return to original position
      onCardDragEnd?.(card, undefined)
    }
    
    setDraggedCard(null)
    setHoveredDropZone(null)
  }, [snapToGridPosition, getDropZoneAt, onCardDragEnd])

  // Update hovered drop zone during drag
  useFrame(() => {
    if (!draggedCard) return

    // Cast ray from camera through mouse position
    raycaster.setFromCamera(pointer, camera)
    
    // Intersect with drag plane
    const intersection = new Vector3()
    if (raycaster.ray.intersectPlane(dragPlane, intersection)) {
      const adjustedPos = intersection.add(dragOffset)
      const snappedPos = snapToGridPosition(adjustedPos)
      const dropZone = getDropZoneAt(snappedPos)
      
      if (dropZone !== hoveredDropZone) {
        setHoveredDropZone(dropZone)
      }
    }
  })

  return (
    <group ref={groupRef}>
      {/* Render drop zones */}
      {dropZones.map((zone) => (
        <DropZoneVisual
          key={zone.id}
          zone={zone}
          isHovered={hoveredDropZone?.id === zone.id}
          isValid={draggedCard ? zone.isValid(draggedCard) : true}
        />
      ))}
      
      {/* Render cards */}
      {cards.map((cardData) => {
        const isDragging = draggedCard?.id === cardData.card.id
        const dropZone = hoveredDropZone
        const isValidTarget = dropZone ? dropZone.isValid(cardData.card) : false
        const isInvalidTarget = dropZone && !dropZone.isValid(cardData.card)
        
        return (
          <InteractiveCard3D
            key={cardData.card.id}
            card={cardData.card}
            position={cardData.position}
            rotation={cardData.rotation}
            isSelected={cardData.isSelected}
            showFace={cardData.showFace}
            isDraggable={cardData.isDraggable}
            isValidTarget={isDragging && isValidTarget}
            isInvalidTarget={isDragging && isInvalidTarget}
            onClick={() => handleCardClick(cardData.card)}
            onHover={(hovered) => onCardHover?.(cardData.card, hovered)}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          />
        )
      })}
      
      {/* Grid visualization if enabled */}
      {snapToGrid && (
        <GridVisualization gridSize={gridSize} extent={10} />
      )}
    </group>
  )
}

interface DropZoneVisualProps {
  zone: DropZone
  isHovered: boolean
  isValid: boolean
}

function DropZoneVisual({ zone, isHovered, isValid }: DropZoneVisualProps) {
  const color = useMemo(() => {
    if (!isValid) return '#ef4444' // Red for invalid
    if (isHovered) return '#22c55e' // Green when hovered
    return zone.color || '#6b7280' // Default gray
  }, [isValid, isHovered, zone.color])

  const opacity = useMemo(() => {
    if (isHovered) return 0.6
    return 0.2
  }, [isHovered])

  return (
    <group position={zone.position}>
      {/* Drop zone outline */}
      <mesh>
        <boxGeometry args={zone.size} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          wireframe
        />
      </mesh>
      
      {/* Drop zone base */}
      <mesh position={[0, -zone.size[1] / 2 + 0.001, 0]}>
        <planeGeometry args={[zone.size[0], zone.size[2]]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.5}
        />
      </mesh>
      
      {/* Zone label */}
      {zone.label && (
        <mesh position={[0, zone.size[1] / 2 + 0.1, 0]}>
          <planeGeometry args={[1, 0.2]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}

interface GridVisualizationProps {
  gridSize: number
  extent: number
}

function GridVisualization({ gridSize, extent }: GridVisualizationProps) {
  const lines = useMemo(() => {
    const lineGeometry = []
    const halfExtent = extent / 2
    
    // Vertical lines
    for (let x = -halfExtent; x <= halfExtent; x += gridSize) {
      lineGeometry.push(
        new Vector3(x, 0, -halfExtent),
        new Vector3(x, 0, halfExtent)
      )
    }
    
    // Horizontal lines
    for (let z = -halfExtent; z <= halfExtent; z += gridSize) {
      lineGeometry.push(
        new Vector3(-halfExtent, 0, z),
        new Vector3(halfExtent, 0, z)
      )
    }
    
    return lineGeometry
  }, [gridSize, extent])

  return (
    <group>
      {lines.map((line, index) => (
        <mesh key={index} position={line}>
          <sphereGeometry args={[0.01, 4, 4]} />
          <meshBasicMaterial color="#9ca3af" transparent opacity={0.3} />
        </mesh>
      ))}
    </group>
  )
}