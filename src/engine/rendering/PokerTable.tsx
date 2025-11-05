import { useRef, useState, useEffect } from 'react'
import { Group, Object3D } from 'three'
import { useAssetManager } from '@/utils/useAssetManager'

interface PokerTableProps {
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export function PokerTable({ 
  position = [0, 0, 0], 
  rotation = [0, 0, 0] 
}: PokerTableProps) {
  const groupRef = useRef<Group>(null)
  const [tableModel, setTableModel] = useState<Object3D | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { assetManager, isInitialized } = useAssetManager()

  // Load the FBX model
  useEffect(() => {
    const loadTableModel = async () => {
      if (!isInitialized || !assetManager) return

      try {
        setLoading(true)
        setError(null)
        
        // Load the poker table model using the asset manager
        const model = await assetManager.getAssetLoader().loadAsset({
          id: 'poker_table',
          path: '/src/assets/Poker Table.fbx',
          type: 'model'
        }) as Object3D
        
        if (model) {
          setTableModel(model)
        }
        setLoading(false)
      } catch (err) {
        console.error('Failed to load poker table model:', err)
        setError(`Failed to load model: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setLoading(false)
      }
    }

    loadTableModel()
  }, [isInitialized, assetManager])

  // Show error state if model fails to load
  if (error) {
    console.error('Poker table model error:', error)
  }

  // If we have the model, render it
  if (tableModel && !loading) {
    return (
      <group ref={groupRef} position={position} rotation={rotation}>
        <primitive object={tableModel} />
      </group>
    )
  }

  // Show fallback geometry if model fails to load or is still loading
  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Main table surface - oval shaped for poker */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <cylinderGeometry args={[4, 4, 0.15, 32]} />
        <meshStandardMaterial 
          color="#0f5132" // Dark green felt
          roughness={0.9}
          metalness={0.05}
        />
      </mesh>
      
      {/* Table padding/rail */}
      <mesh position={[0, 0.075, 0]}>
        <cylinderGeometry args={[4.3, 4.3, 0.15, 32]} />
        <meshStandardMaterial 
          color="#8B4513" // Brown leather
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      
      {/* Inner felt area */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <cylinderGeometry args={[3.7, 3.7, 0.01, 32]} />
        <meshStandardMaterial 
          color="#228B22" // Bright green felt
          roughness={0.95}
          metalness={0.0}
        />
      </mesh>

      {/* Player position markers */}
      {[0, 1, 2, 3].map((playerIndex) => {
        const angle = (playerIndex * Math.PI * 2) / 4
        const x = Math.cos(angle) * 3.2
        const z = Math.sin(angle) * 3.2
        
        return (
          <group key={playerIndex} position={[x, 0.085, z]} rotation={[0, -angle, 0]}>
            {/* Player area background */}
            <mesh>
              <planeGeometry args={[1.8, 1.0]} />
              <meshStandardMaterial 
                color="#1a5d1a" 
                roughness={0.8}
                transparent
                opacity={0.3}
              />
            </mesh>
            
            {/* Player label */}
            <mesh position={[0, 0, 0.01]}>
              <planeGeometry args={[0.4, 0.2]} />
              <meshStandardMaterial 
                color="#ffffff" 
                roughness={0.9}
                transparent
                opacity={0.7}
              />
            </mesh>
          </group>
        )
      })}

      {/* Center area for floor card */}
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.8, 0.8, 0.005, 16]} />
        <meshStandardMaterial 
          color="#1a5d1a" 
          roughness={0.8}
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* Discard pile area */}
      <mesh position={[1.5, 0.09, 1.5]}>
        <cylinderGeometry args={[0.5, 0.5, 0.005, 16]} />
        <meshStandardMaterial 
          color="#8B4513" 
          roughness={0.8}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Deck area */}
      <mesh position={[-1.5, 0.09, -1.5]}>
        <cylinderGeometry args={[0.6, 0.6, 0.005, 16]} />
        <meshStandardMaterial 
          color="#654321" 
          roughness={0.8}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Table legs */}
      {[0, 1, 2, 3].map((legIndex) => {
        const angle = (legIndex * Math.PI * 2) / 4 + Math.PI / 4
        const x = Math.cos(angle) * 2.5
        const z = Math.sin(angle) * 2.5
        
        return (
          <mesh 
            key={`leg-${legIndex}`}
            position={[x, -1, z]}
            castShadow
          >
            <cylinderGeometry args={[0.1, 0.15, 2]} />
            <meshStandardMaterial 
              color="#654321" 
              roughness={0.7}
              metalness={0.1}
            />
          </mesh>
        )
      })}

      {/* Floor */}
      <mesh position={[0, -2.1, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial 
          color="#2a2a2a" 
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
    </group>
  )
}