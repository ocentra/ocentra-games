import { create } from 'zustand'
import { type GameState, type Player, type GameScreen } from '@/types'
import { GameEngine } from '@/engine/GameEngine'
import { logStore } from '@/utils/logger'

interface GameStore {
  // UI State
  currentScreen: GameScreen
  
  // Game State
  gameEngine: GameEngine | null
  gameState: GameState | null
  currentPlayer: Player | null
  isLoading: boolean
  error: string | null

  // Actions
  setCurrentScreen: (screen: GameScreen) => void
  initializeEngine: () => void
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

  initializeEngine: () => {
    logStore('Initializing game engine')
    const engine = new GameEngine()
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