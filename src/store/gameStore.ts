import { create } from 'zustand'
import type { GameEngine } from '@ocentra/game-domain/engine/GameEngine';
import type { GameState, Player } from '@ocentra/game-domain/types/game';
import type { GameScreen } from '@/types/ui';
import { createAppGameEngine } from '@/adapters/game/createAppGameEngine';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'

const log = MainAppLogger.instance
const logStore = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled)
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled)
  }
}

log.register(import.meta.url)

interface GameStore {
  currentScreen: GameScreen
  gameEngine: GameEngine | null
  gameState: GameState | null
  currentPlayer: Player | null
  isLoading: boolean
  error: string | null

  setCurrentScreen: (screen: GameScreen) => void
  initializeEngine: () => Promise<void>
  setGameState: (state: GameState) => void
  setCurrentPlayer: (player: Player | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

export const useGameStore = create<GameStore>(set => ({
  // UI State
  currentScreen: 'welcome',

  // Game State
  gameEngine: null,
  gameState: null,
  currentPlayer: null,
  isLoading: false,
  error: null,

  // Actions
  setCurrentScreen: (screen: GameScreen) => {
    logStore('Setting current screen:', screen)
    set({ currentScreen: screen })
  },

  initializeEngine: async () => {
    logStore('Initializing game engine')
    const engine = await createAppGameEngine()
    logStore('Game engine initialized')
    set({ gameEngine: engine })
  },

  setGameState: (state: GameState) => {
    logStore('Setting game state')
    set({ gameState: state })
  },

  setCurrentPlayer: (player: Player | null) => {
    logStore('Setting current player:', player?.name || 'null')
    set({ currentPlayer: player })
  },

  setLoading: (loading: boolean) => {
    logStore('Setting loading state:', loading)
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    logStore('Setting error:', error)
    set({ error })
  },

  reset: () => {
    logStore('Resetting game store')
    set({
      currentScreen: 'welcome',
      gameEngine: null,
      gameState: null,
      currentPlayer: null,
      isLoading: false,
      error: null,
    })
  },
}))
