import React, { useEffect, useMemo, useState } from 'react'
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode'
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger'
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'
import { ensureGameAssetLoaded } from '@/ui/layout/loadGameUiPreset'
import { GameModeContext } from './GameModeContextValue'
import { getGameMode } from '@/adapters/assets/GameCatalogService'

const log = MainAppLogger.instance
log.register(import.meta.url)

interface GameModeProviderProps {
  gameModeId: string
  children: React.ReactNode
}

export const GameModeProvider: React.FC<GameModeProviderProps> = ({ gameModeId, children }) => {
  const [gameMode, setGameMode] = useState<GameMode | null>(null)
  const [isLoaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadGameMode() {
      try {
        const loadedGameMode = await getGameMode(gameModeId)
        if (cancelled) return

        setGameMode(loadedGameMode)

        if (loadedGameMode) {
          const metadata = (loadedGameMode as unknown as { metadata?: { gameId?: string; assetId?: string } }).metadata
          const presetId = metadata?.gameId || metadata?.assetId || gameModeId
          await ensureGameAssetLoaded(presetId)
        }

        if (!cancelled) {
          setLoaded(true)
        }
      } catch (error) {
        log.logError('[GameModeProvider] Failed to load game mode', getStackTrace(), { error })
        if (!cancelled) {
          setLoaded(true)
        }
      }
    }

    loadGameMode()
    return () => {
      cancelled = true
    }
  }, [gameModeId])

  const value = useMemo(
    () => ({
      gameMode,
      isReady: isLoaded,
    }),
    [gameMode, isLoaded],
  )

  return <GameModeContext.Provider value={value}>{children}</GameModeContext.Provider>
}
