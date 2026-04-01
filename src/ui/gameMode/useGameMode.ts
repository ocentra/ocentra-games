import { useContext } from 'react'
import { GameModeContext, type GameModeContextValue } from './GameModeContextValue'

export function useGameMode(): GameModeContextValue {
  const ctx = useContext(GameModeContext)
  if (!ctx) {
    throw new Error('useGameMode must be used within a GameModeProvider')
  }
  return ctx
}

