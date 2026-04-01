import { useEffect, useRef } from 'react'
import { useGameStore } from '@/store/gameStore'
import type { PlayerAction } from '@ocentra/game-domain/types/game'
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = MainAppLogger.instance;
const LOG_GAME_ENGINE = false;
const LOG_STORE = false;

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_GAME_ENGINE) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

export function useGameEngine() {
  const { gameEngine, setGameState } = useGameStore()
  const isProcessingAIAction = useRef(false)

  useEffect(() => {
    if (!gameEngine) {
      logInfo('Game engine not available', undefined, LOG_GAME_ENGINE)
      return
    }

    logInfo('Subscribing to game state updates', undefined, LOG_GAME_ENGINE)
    const unsubscribe = gameEngine.subscribeToUpdates((state) => {
      logInfo('Game state updated:', state, LOG_STORE)
      setGameState(state)
    })

    return () => {
      logInfo('Unsubscribing from game state updates', undefined, LOG_GAME_ENGINE)
      unsubscribe()
    }
  }, [gameEngine, setGameState])

  useEffect(() => {
    if (!gameEngine) {
      logInfo('Game engine not available for AI actions')
      return
    }

    const handleAIActions = async () => {
      if (isProcessingAIAction.current) {
        logInfo('AI action already processing, skipping')
        return
      }
      
      const gameState = gameEngine.getGameState()
      if (!gameState) {
        logInfo('No game state available')
        return
      }

      const currentPlayer = gameState.players[gameState.currentPlayer]
      if (!currentPlayer.isAI) {
        logInfo('Current player is not AI, skipping AI action')
        return
      }

      logInfo('Processing AI action for player:', currentPlayer.name)
      isProcessingAIAction.current = true

      try {
        const action = await gameEngine.getAIAction()
        if (action) {
          logInfo('AI action received:', action)
          gameEngine.processPlayerAction(action)
        } else {
          logInfo('No AI action received')
        }
      } catch (error) {
        logInfo('Error processing AI action:', error)
        log.logError('Error processing AI action:', getStackTrace(), error)
      } finally {
        isProcessingAIAction.current = false
      }
    }

    logInfo('Checking for AI actions')
    handleAIActions()

    logInfo('Setting up AI action interval')
    const interval = setInterval(handleAIActions, 1000)

    return () => {
      logInfo('Clearing AI action interval')
      clearInterval(interval)
    }
  }, [gameEngine])

  return {
    gameEngine,
    initializeGame: async (config: import('@ocentra/game-domain/engine/GameEngine').GameConfig) => {
      logInfo('Initializing game with config:', config)
      if (!gameEngine) {
        logInfo('Game engine not available for initialization')
        return
      }
      await gameEngine.initializeGame(config)
      logInfo('Game initialized successfully')
    },
    startSinglePlayer: async (difficulty: 'easy' | 'medium' | 'hard') => {
      logInfo('Starting single player game with difficulty:', difficulty)
      if (!gameEngine) {
        logInfo('Game engine not available for starting single player game')
        return
      }
      await gameEngine.startSinglePlayer(difficulty)
      logInfo('Single player game started successfully')
    },
    processPlayerAction: (action: PlayerAction) => {
      logInfo('Processing player action:', action)
      if (!gameEngine) {
        logInfo('Game engine not available for processing player action')
        return
      }
      return gameEngine.processPlayerAction(action)
    }
  }
}