import { createContext } from 'react'
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode'

export interface GameModeContextValue {
  gameMode: GameMode | null
  isReady: boolean
}

export const GameModeContext = createContext<GameModeContextValue | null>(null)

