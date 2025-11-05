import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, OrthographicCamera, Stats } from '@react-three/drei'
import { Suspense } from 'react'
import { PokerTable } from './PokerTable'
import { GameLayout } from './GameLayout'
import { type Card, Suit, type CardValue } from '@/types'
import { useAssetManager } from '@/utils/useAssetManager'

interface GameRendererProps {
  showStats?: boolean
  enableControls?: boolean
  gameState?: import('@/types').GameState | null
}

function GameCamera() {
  return (
    <OrthographicCamera
      makeDefault
      position={[0, 10, 3]} // Slightly angled top-down
      rotation={[-Math.PI / 3, 0, 0]} // 60° angle for depth
      zoom={50}
      near={0.1}
      far={100}
    />
  )
}

function GameLighting() {
  return (
    <>
      {/* Ambient light for overall scene illumination */}
      <ambientLight intensity={0.4} color="#ffffff" />
      
      {/* Main directional light from above for realistic card shadows */}
      <directionalLight
        position={[0, 15, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-camera-near={0.1}
        shadow-camera-far={30}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0001}
      />
      
      {/* Secondary light for fill lighting */}
      <directionalLight
        position={[-5, 10, -5]}
        intensity={0.6}
        color="#f0f8ff"
      />
      
      {/* Subtle rim light for depth */}
      <pointLight
        position={[0, 8, 0]}
        intensity={0.3}
        color="#ffffff"
        distance={20}
        decay={1}
      />
    </>
  )
}

function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#3b82f6" />
    </mesh>
  )
}

function AssetLoader() {
  const { isLoading, progress } = useAssetManager()
  
  if (!isLoading) return null
  
  const totalProgress = progress.length > 0 
    ? progress.reduce((sum, p) => sum + p.percentage, 0) / progress.length
    : 0
  
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      background: 'rgba(0, 0, 0, 0.8)',
      padding: '20px',
      borderRadius: '8px',
      color: 'white',
      textAlign: 'center',
      zIndex: 1000
    }}>
      <h3>Loading Assets...</h3>
      <p>{Math.round(totalProgress)}% complete</p>
      {progress.map((p) => (
        <div key={p.bundleId} style={{ margin: '5px 0' }}>
          <small>{p.bundleId}: {Math.round(p.percentage)}%</small>
        </div>
      ))}
    </div>
  )
}

export function GameRenderer({ showStats = false, enableControls = true, gameState }: GameRendererProps) {
  // Use actual game state or mock data for testing
  const players = gameState?.players || [
    {
      id: 'player1',
      name: 'You',
      hand: [
        { id: '1', suit: Suit.SPADES, value: 14 as CardValue },
        { id: '2', suit: Suit.SPADES, value: 13 as CardValue },
        { id: '3', suit: Suit.SPADES, value: 12 as CardValue }
      ],
      isCurrentPlayer: true,
      declaredSuit: null,
      intentCard: null,
      score: 0,
      isConnected: true,
      isAI: false,
      aiPersonality: undefined
    },
    {
      id: 'player2',
      name: 'AI 1',
      hand: [
        { id: '4', suit: Suit.HEARTS, value: 10 as CardValue },
        { id: '5', suit: Suit.HEARTS, value: 9 as CardValue },
        { id: '6', suit: Suit.HEARTS, value: 8 as CardValue }
      ],
      declaredSuit: null,
      intentCard: null,
      score: 0,
      isConnected: true,
      isAI: true,
      aiPersonality: undefined
    },
    {
      id: 'player3',
      name: 'AI 2',
      hand: [
        { id: '7', suit: Suit.DIAMONDS, value: 7 as CardValue },
        { id: '8', suit: Suit.DIAMONDS, value: 6 as CardValue },
        { id: '9', suit: Suit.DIAMONDS, value: 5 as CardValue }
      ],
      declaredSuit: Suit.DIAMONDS,
      intentCard: null,
      score: 0,
      isConnected: true,
      isAI: true,
      aiPersonality: undefined
    },
    {
      id: 'player4',
      name: 'AI 3',
      hand: [
        { id: '10', suit: Suit.CLUBS, value: 4 as CardValue },
        { id: '11', suit: Suit.CLUBS, value: 3 as CardValue },
        { id: '12', suit: Suit.CLUBS, value: 2 as CardValue }
      ],
      declaredSuit: null,
      intentCard: null,
      score: 0,
      isConnected: true,
      isAI: true,
      aiPersonality: undefined
    }
  ]

  const floorCard: Card | null = gameState?.floorCard || { id: 'floor', suit: Suit.HEARTS, value: 10 as CardValue }
  const discardPile: Card[] = gameState?.discardPile || []
  const deck: Card[] = gameState?.deck || Array(40).fill(null).map((_, i) => ({ 
    id: `deck-${i}`, 
    suit: Suit.SPADES, 
    value: 2 as CardValue
  }))

  return (
    <div style={{ width: '100%', height: '100%', flex: 1 }}>
      <AssetLoader />
      <Canvas shadows>
        <GameCamera />
        <GameLighting />
        <Suspense fallback={<LoadingFallback />}>
          <PokerTable />
          <GameLayout
            players={players}
            floorCard={floorCard}
            discardPile={discardPile}
            deck={deck}
            onCardClick={(playerId, card) => console.log(`Clicked card ${card.id} of player ${playerId}`)}
          />
          <Environment preset="studio" />
        </Suspense>
        {enableControls && (
          <OrbitControls
            target={[0, 0, 0]}
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxPolarAngle={Math.PI / 2.1} // Prevent going below table
            minPolarAngle={Math.PI / 8} // Maintain top-down perspective
            minDistance={8}
            maxDistance={25}
            autoRotate={false}
            enableDamping={true}
            dampingFactor={0.08}
            panSpeed={0.5}
            zoomSpeed={0.5}
          />
        )}
        {showStats && <Stats />}
      </Canvas>
    </div>
  )
}