import { GameRenderer } from './GameRenderer'
import { useGameStore } from '@/store/gameStore'

export function GameScene() {
  const { gameState } = useGameStore()
  
  return <GameRenderer 
    showStats={false} 
    enableControls={true} 
    gameState={gameState}
  />
}
