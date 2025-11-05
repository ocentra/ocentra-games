import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import { type PlayerAction } from '@/types'
import { logGameEngine, logStore } from '@/utils/logger'

export function useGameEngine() {
  const { gameEngine, setGameState } = useGameStore()
  const isProcessingAIAction = useRef(false)

  useEffect(() => {
    if (!gameEngine) {
      logGameEngine('Game engine not available')
      return
    }

    logGameEngine('Subscribing to game state updates')
    // Subscribe to game state updates
    const unsubscribe = gameEngine.subscribeToUpdates((state) => {
      logStore('Game state updated:', state)
      setGameState(state)
    })

    // Cleanup subscription on unmount
    return () => {
      logGameEngine('Unsubscribing from game state updates')
      unsubscribe()
    }
  }, [gameEngine, setGameState])

  // Effect to handle AI actions
  useEffect(() => {
    if (!gameEngine) {
      logGameEngine('Game engine not available for AI actions')
      return
    }

    const handleAIActions = async () => {
      if (isProcessingAIAction.current) {
        logGameEngine('AI action already processing, skipping')
        return
      }
      
      const gameState = gameEngine.getGameState()
      if (!gameState) {
        logGameEngine('No game state available')
        return
      }

      // Check if it's an AI player's turn
      const currentPlayer = gameState.players[gameState.currentPlayer]
      if (!currentPlayer.isAI) {
        logGameEngine('Current player is not AI, skipping AI action')
        return
      }

      logGameEngine('Processing AI action for player:', currentPlayer.name)
      // Prevent multiple simultaneous AI action processing
      isProcessingAIAction.current = true

      try {
        // Get AI action
        const action = await gameEngine.getAIAction()
        if (action) {
          logGameEngine('AI action received:', action)
          // Process AI action
          gameEngine.processPlayerAction(action)
        } else {
          logGameEngine('No AI action received')
        }
      } catch (error) {
        logGameEngine('Error processing AI action:', error)
        console.error('Error processing AI action:', error)
      } finally {
        isProcessingAIAction.current = false
      }
    }

    // Check for AI actions when game state changes
    logGameEngine('Checking for AI actions')
    handleAIActions()

    // Set up interval to check for AI actions periodically
    logGameEngine('Setting up AI action interval')
    const interval = setInterval(handleAIActions, 1000)

    return () => {
      logGameEngine('Clearing AI action interval')
      clearInterval(interval)
    }
  }, [gameEngine])

  return {
    gameEngine,
    initializeGame: async (config: import('@/engine/GameEngine').GameConfig) => {
      logGameEngine('Initializing game with config:', config)
      if (!gameEngine) {
        logGameEngine('Game engine not available for initialization')
        return
      }
      await gameEngine.initializeGame(config)
      logGameEngine('Game initialized successfully')
    },
    startSinglePlayer: async (difficulty: 'easy' | 'medium' | 'hard') => {
      logGameEngine('Starting single player game with difficulty:', difficulty)
      if (!gameEngine) {
        logGameEngine('Game engine not available for starting single player game')
        return
      }
      await gameEngine.startSinglePlayer(difficulty)
      logGameEngine('Single player game started successfully')
    },
    processPlayerAction: (action: PlayerAction) => {
      logGameEngine('Processing player action:', action)
      if (!gameEngine) {
        logGameEngine('Game engine not available for processing player action')
        return
      }
      return gameEngine.processPlayerAction(action)
    }
  }
}