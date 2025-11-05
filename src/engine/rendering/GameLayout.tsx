import React, { useState } from 'react'
import { Text } from '@react-three/drei'
import { type Card } from '@/types'
import { TexturedCard3D } from './TexturedCard3D'

interface PlayerAreaProps {
  playerIndex: number
  playerName: string
  cards: Card[]
  isCurrentPlayer?: boolean
  isDeclared?: boolean
  isSelected?: boolean
  onCardClick?: (card: Card) => void
  onCardHover?: (cardId: string | null) => void
  hoveredCardId?: string | null
  position?: [number, number, number]
  rotation?: [number, number, number]
}

function PlayerArea({
  playerIndex,
  playerName,
  cards,
  isCurrentPlayer = false,
  isDeclared = false,
  isSelected = false,
  onCardClick,
  onCardHover,
  hoveredCardId,
  position = [0, 0, 0],
  rotation = [0, 0, 0]
}: PlayerAreaProps) {
  // Calculate card positions
  const cardSpacing = 0.8
  const handWidth = (cards.length - 1) * cardSpacing
  const startX = -handWidth / 2

  return (
    <group position={position} rotation={rotation}>
      {/* Player area background */}
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[2.0, 1.2]} />
        <meshStandardMaterial 
          color={isCurrentPlayer ? "#ffd700" : (isDeclared ? "#ff6b6b" : "#1a5d1a")}
          roughness={0.8}
          transparent
          opacity={0.3}
        />
      </mesh>
      
      {/* Player name tag */}
      <mesh position={[0, 0.4, 0.01]}>
        <planeGeometry args={[1.0, 0.2]} />
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.9}
          transparent
          opacity={0.8}
        />
      </mesh>
      
      {/* Player name text */}
      <Text
        position={[0, 0.4, 0.02]}
        fontSize={0.1}
        color="#000000"
        anchorX="center"
        anchorY="middle"
      >
        {playerName}
      </Text>
      
      {/* Player cards */}
      {cards.map((card, index) => {
        const cardX = startX + index * cardSpacing
        const isHovered = hoveredCardId === card.id
        
        return (
          <TexturedCard3D
            key={card.id}
            card={card}
            position={[cardX, 0, 0]}
            showFace={playerIndex === 0} // Only show face for player 0 (human player)
            isHovered={isHovered}
            isSelected={isSelected}
            onClick={() => onCardClick?.(card)}
            onHover={(hovered) => onCardHover?.(hovered ? card.id : null)}
          />
        )
      })}
    </group>
  )
}

interface GameLayoutProps {
  players: {
    id: string
    name: string
    hand: Card[]
    isCurrentPlayer?: boolean
    isDeclared?: boolean
  }[]
  floorCard: Card | null
  discardPile: Card[]
  deck: Card[]
  onCardClick?: (playerId: string, card: Card) => void
}

export function GameLayout({
  players,
  floorCard,
  discardPile,
  deck,
  onCardClick
}: GameLayoutProps) {
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null)

  return (
    <group>
      {/* Player areas */}
      {players.map((player, index) => {
        // Calculate player position around the table
        const angle = (index * Math.PI * 2) / 4
        const radius = 3.2
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        
        return (
          <PlayerArea
            key={player.id}
            playerIndex={index}
            playerName={player.name}
            cards={player.hand}
            isCurrentPlayer={player.isCurrentPlayer}
            isDeclared={player.isDeclared}
            hoveredCardId={hoveredCardId}
            onCardClick={(card) => onCardClick?.(player.id, card)}
            onCardHover={setHoveredCardId}
            position={[x, 0.1, z]}
            rotation={[0, -angle, 0]}
          />
        )
      })}

      {/* Floor card */}
      {floorCard && (
        <TexturedCard3D
          card={floorCard}
          position={[0, 0.1, 0]}
          showFace={true}
          isHovered={hoveredCardId === 'floor'}
          onHover={(hovered) => setHoveredCardId(hovered ? 'floor' : null)}
        />
      )}

      {/* Discard pile */}
      {discardPile.length > 0 && (
        <group position={[1.5, 0.1, 1.5]}>
          {discardPile.slice(-3).map((card, index) => (
            <TexturedCard3D
              key={`discard-${index}`}
              card={card}
              position={[0, index * 0.01, 0]}
              showFace={false}
              rotation={[0, 0, index * 0.1]}
            />
          ))}
        </group>
      )}

      {/* Deck */}
      <group position={[-1.5, 0.1, -1.5]}>
        {Array.from({ length: Math.min(3, deck.length) }).map((_, index) => (
          <TexturedCard3D
            key={`deck-${index}`}
            position={[0, index * 0.01, 0]}
            showFace={false}
            rotation={[0, 0, -index * 0.1]}
          />
        ))}
      </group>
    </group>
  )
}