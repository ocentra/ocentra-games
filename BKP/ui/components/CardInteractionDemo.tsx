import { useState, useCallback, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { 
  CardInteractionManager, 
  useCardInteractionState, 
  createInteractionCard, 
  createDropZone,
  type CardAction,
  type InteractionCard 
} from '../../engine/rendering/CardInteractionManager'
import { type Card, Suit } from '@/types'

// Optional Physics wrapper
const OptionalPhysics = ({ children }: { children: React.ReactNode }) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Physics } = require('@react-three/cannon')
    return <Physics gravity={[0, -9.82, 0]}>{children}</Physics>
  } catch {
    return <group>{children}</group>
  }
}

// Sample cards for demonstration
const createSampleCards = (): Card[] => [
  { id: '1', suit: Suit.SPADES, value: 14 }, // Ace of Spades
  { id: '2', suit: Suit.HEARTS, value: 13 }, // King of Hearts
  { id: '3', suit: Suit.DIAMONDS, value: 12 }, // Queen of Diamonds
  { id: '4', suit: Suit.CLUBS, value: 11 }, // Jack of Clubs
  { id: '5', suit: Suit.SPADES, value: 10 }, // 10 of Spades
]

export function CardInteractionDemo() {
  const [demoMode, setDemoMode] = useState<'dealing' | 'playing' | 'flipping'>('dealing')
  const [actionLog, setActionLog] = useState<string[]>([])
  
  // Create sample cards with positions
  const sampleCards = useMemo(() => createSampleCards(), [])
  
  // Create interaction cards
  const interactionCards = useMemo((): InteractionCard[] => {
    return sampleCards.map((card, index) => 
      createInteractionCard(
        card,
        [index * 1.2 - 2.4, 0, 0], // Spread cards horizontally
        {
          showFace: demoMode !== 'dealing',
          isDraggable: demoMode === 'playing',
          isDealing: demoMode === 'dealing',
          isFlipping: demoMode === 'flipping',
        }
      )
    )
  }, [sampleCards, demoMode])

  // Initialize interaction state
  const [interactionState, updateInteractionState] = useCardInteractionState(interactionCards)

  // Create drop zones for demonstration
  const dropZones = useMemo(() => [
    createDropZone(
      'play-area',
      [0, 0, 2],
      [4, 0.1, 1.5],
      (card) => true, // Accept any card
      (card) => {
        addToLog(`Card ${card.value} of ${card.suit} dropped in play area`)
      },
      { color: '#22c55e', label: 'Play Area' }
    ),
    createDropZone(
      'discard-pile',
      [3, 0, 0],
      [1, 0.1, 1.5],
      (card) => card.suit === Suit.SPADES, // Only accept spades
      (card) => {
        addToLog(`Card ${card.value} of ${card.suit} discarded`)
      },
      { color: '#ef4444', label: 'Discard (Spades Only)' }
    ),
  ], [])

  // Add action to log
  const addToLog = useCallback((message: string) => {
    setActionLog(prev => [...prev.slice(-9), `${new Date().toLocaleTimeString()}: ${message}`])
  }, [])

  // Handle card actions
  const handleCardAction = useCallback((action: CardAction) => {
    const { type, card, data } = action
    
    switch (type) {
      case 'select':
        addToLog(`Selected ${card.value} of ${card.suit}`)
        break
      case 'deselect':
        addToLog(`Deselected ${card.value} of ${card.suit}`)
        break
      case 'drag_start':
        addToLog(`Started dragging ${card.value} of ${card.suit}`)
        break
      case 'drag_end':
        if (data?.dropZone) {
          addToLog(`Dropped ${card.value} of ${card.suit} in ${data.dropZone.label}`)
        } else {
          addToLog(`Returned ${card.value} of ${card.suit} to original position`)
        }
        break
      case 'flip':
        if (data?.phase === 'start') {
          addToLog(`Flipping ${card.value} of ${card.suit}`)
        } else if (data?.phase === 'complete') {
          addToLog(`Flip complete: ${card.value} of ${card.suit} ${data.showFace ? 'face up' : 'face down'}`)
        }
        break
      case 'deal':
        if (data?.phase === 'complete') {
          addToLog(`Dealt ${card.value} of ${card.suit} to position ${data.index + 1}`)
        }
        break
      case 'hover':
        if (data?.hovered) {
          addToLog(`Hovering over ${card.value} of ${card.suit}`)
        }
        break
    }
  }, [addToLog])

  // Demo mode handlers
  const startDealing = useCallback(() => {
    setDemoMode('dealing')
    updateInteractionState({ 
      mode: 'dealing',
      selectedCards: new Set(),
      draggingCard: null,
    })
    addToLog('Started dealing animation')
  }, [updateInteractionState, addToLog])

  const startPlaying = useCallback(() => {
    setDemoMode('playing')
    updateInteractionState({ 
      mode: 'playing',
      selectedCards: new Set(),
      draggingCard: null,
    })
    addToLog('Entered playing mode - cards are draggable')
  }, [updateInteractionState, addToLog])

  const startFlipping = useCallback(() => {
    setDemoMode('flipping')
    updateInteractionState({ 
      mode: 'playing',
      selectedCards: new Set(),
      draggingCard: null,
    })
    addToLog('Started flip animation demo')
  }, [updateInteractionState, addToLog])

  const clearLog = useCallback(() => {
    setActionLog([])
  }, [])

  return (
    <div className="card-interaction-demo">
      <div className="demo-controls">
        <h2>3D Card Interaction System Demo</h2>
        
        <div className="control-buttons">
          <button onClick={startDealing} disabled={demoMode === 'dealing'}>
            Demo Dealing Animation
          </button>
          <button onClick={startPlaying} disabled={demoMode === 'playing'}>
            Demo Drag & Drop
          </button>
          <button onClick={startFlipping} disabled={demoMode === 'flipping'}>
            Demo Card Flipping
          </button>
          <button onClick={clearLog}>
            Clear Log
          </button>
        </div>

        <div className="demo-info">
          <p><strong>Current Mode:</strong> {demoMode}</p>
          <p><strong>Instructions:</strong></p>
          <ul>
            <li><strong>Dealing:</strong> Watch cards animate from deck to positions</li>
            <li><strong>Playing:</strong> Click to select, drag cards to drop zones</li>
            <li><strong>Flipping:</strong> Click cards to flip between face up/down</li>
          </ul>
        </div>
      </div>

      <div className="demo-canvas">
        <Canvas
          camera={{ 
            position: [0, 8, 5], 
            fov: 50,
            near: 0.1,
            far: 100 
          }}
          shadows
        >
          <Environment preset="studio" />
          
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          
          {/* Physics world (optional) */}
          <OptionalPhysics>
            {/* Table surface */}
            <mesh position={[0, -0.1, 0]} receiveShadow>
              <boxGeometry args={[10, 0.2, 6]} />
              <meshStandardMaterial color="#0f5132" />
            </mesh>
            
            {/* Card Interaction System */}
            <CardInteractionManager
              cards={interactionCards}
              dropZones={dropZones}
              state={interactionState}
              onStateChange={updateInteractionState}
              onCardAction={handleCardAction}
              dealingConfig={{
                deckPosition: [-4, 0.2, -2],
                dealingSpeed: 800,
                staggerDelay: 200,
              }}
              dragDropConfig={{
                multiSelect: false,
                snapToGrid: true,
                gridSize: 0.5,
              }}
              flipConfig={{
                simultaneousFlip: false,
                flipDelay: 150,
                flipSound: true,
              }}
            />
          </OptionalPhysics>
          
          {/* Camera controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={3}
            maxDistance={15}
            maxPolarAngle={Math.PI / 2}
          />
        </Canvas>
      </div>

      <div className="action-log">
        <h3>Action Log</h3>
        <div className="log-content">
          {actionLog.length === 0 ? (
            <p className="log-empty">No actions yet. Try interacting with the cards!</p>
          ) : (
            actionLog.map((entry, index) => (
              <div key={index} className="log-entry">
                {entry}
              </div>
            ))
          )}
        </div>
      </div>

      <style jsx>{`
        .card-interaction-demo {
          display: flex;
          flex-direction: column;
          height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .demo-controls {
          padding: 1rem;
          background: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
        }

        .demo-controls h2 {
          margin: 0 0 1rem 0;
          color: #212529;
        }

        .control-buttons {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .control-buttons button {
          padding: 0.5rem 1rem;
          border: 1px solid #dee2e6;
          background: #ffffff;
          border-radius: 0.25rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .control-buttons button:hover:not(:disabled) {
          background: #e9ecef;
        }

        .control-buttons button:disabled {
          background: #6c757d;
          color: #ffffff;
          cursor: not-allowed;
        }

        .demo-info {
          font-size: 0.875rem;
          color: #6c757d;
        }

        .demo-info ul {
          margin: 0.5rem 0 0 1rem;
          padding: 0;
        }

        .demo-canvas {
          flex: 1;
          min-height: 400px;
        }

        .action-log {
          height: 200px;
          padding: 1rem;
          background: #f8f9fa;
          border-top: 1px solid #dee2e6;
          overflow-y: auto;
        }

        .action-log h3 {
          margin: 0 0 0.5rem 0;
          color: #212529;
        }

        .log-content {
          font-family: 'Courier New', monospace;
          font-size: 0.75rem;
        }

        .log-empty {
          color: #6c757d;
          font-style: italic;
        }

        .log-entry {
          padding: 0.125rem 0;
          border-bottom: 1px solid #e9ecef;
          color: #495057;
        }

        .log-entry:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  )
}