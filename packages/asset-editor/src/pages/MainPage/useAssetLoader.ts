import { useState, useCallback } from 'react'
import type { AssetData } from '@/types/assets'
import { loadAssetFromNetwork } from './loadAssetFromNetwork'
import type { ScriptableObject } from '@ocentra/asset-domain/ScriptableObject'
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger'
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace'
import { EventBus } from '@ocentra/eventing-domain/core/EventBus'
import { OperationDeferred } from '@ocentra/eventing-domain/core/OperationDeferred'
import { GetDiskGameModeEntriesEvent } from '@ocentra/eventing-domain/events/assets/GetDiskGameModeEntriesEvent'
import { AssetResourceEntry } from '@ocentra/asset-domain/resourceEntry/AssetResourceEntry'
import type { GameMode } from '@ocentra/game-asset-domain/gameMode/core/GameMode'
import { DeckManager } from '@ocentra/game-asset-domain/deck/DeckManager'

const log = AssetEditorLogger.instance
log.register(import.meta.url)

export function useAssetLoader() {
  const [assetData, setAssetData] = useState<AssetData | null>(null)
  const [assetPath, setAssetPath] = useState<string | null>(null)
  const [assetRawContent, setAssetRawContent] = useState<string | null>(null)
  const [assetInstance] = useState<ScriptableObject | null>(null)
  const [isLoadingAsset, setIsLoadingAsset] = useState(false)
  const [assetError, setAssetError] = useState<string | null>(null)

  const loadAsset = useCallback(
    async (identifier: string) => {
      const loadStart = performance.now()
      log.logInfo(
        '[useAssetLoader] loadAsset START',
        getStackTrace(),
        { identifier },
        false
      )

      const identifierClean = identifier.startsWith('/')
        ? identifier.substring(1)
        : identifier

      if (identifierClean === 'virtual:GameRegistry') {
        try {
          setIsLoadingAsset(true)
          setAssetError(null)
          log.logInfo(
            '[useAssetLoader] Loading GameRegistry',
            getStackTrace(),
            undefined,
            false
          )

          const getGameModeEntriesDeferred = new OperationDeferred<
            AssetResourceEntry<GameMode>[]
          >()
          await EventBus.instance.publishAsync(
            new GetDiskGameModeEntriesEvent(getGameModeEntriesDeferred)
          )
          const result = await getGameModeEntriesDeferred.promise

          if (!result.isSuccess || !result.value) {
            throw new Error(
              result.errorMessage || 'Failed to get game mode entries'
            )
          }

          const assetData: AssetData = {
            system: {
              guid: 'virtual:GameRegistry',
              assetType: 'GameRegistry',
              displayName: 'Game Registry',
              schemaVersion: 1,
            },
            data: {
              gameModeEntries: result.value,
            },
          }

          setAssetData(assetData)
          setAssetPath('virtual:GameRegistry')
          setAssetRawContent(null)
          setAssetError(null)
          setIsLoadingAsset(false)

          const loadEnd = performance.now()
          log.logInfo(
            `[useAssetLoader] loadAsset END (GameRegistry) - ${(loadEnd - loadStart).toFixed(2)}ms`,
            getStackTrace(),
            undefined,
            false
          )
          return
        } catch (error) {
          setAssetError(
            error instanceof Error
              ? error.message
              : 'Failed to load GameRegistry'
          )
          setIsLoadingAsset(false)
          return
        }
      }

      if (identifierClean === 'virtual:AssetCatalog') {
        try {
          setIsLoadingAsset(true)
          setAssetError(null)

          const assetData: AssetData = {
            system: {
              guid: 'virtual:AssetCatalog',
              assetType: 'AssetCatalog',
              displayName: 'Asset Catalog',
              schemaVersion: 1,
            },
            data: {},
          }

          setAssetData(assetData)
          setAssetPath('virtual:AssetCatalog')
          setAssetRawContent(null)
          setAssetError(null)
          setIsLoadingAsset(false)
          return
        } catch (error) {
          setAssetError(
            error instanceof Error
              ? error.message
              : 'Failed to load asset catalog'
          )
          setIsLoadingAsset(false)
          return
        }
      }

      if (identifierClean === 'virtual:DeckManager') {
        try {
          setIsLoadingAsset(true)
          setAssetError(null)
          log.logInfo(
            '[useAssetLoader] Loading DeckManager',
            getStackTrace(),
            undefined,
            false
          )

          const deckManager = await DeckManager.getOrCreateInstance()

          const assetData: AssetData = {
            system: {
              guid: 'virtual:DeckManager',
              assetType: 'DeckManager',
              displayName: 'Deck Manager',
              schemaVersion: 1,
            },
            data: {
              deckEntries: deckManager.deckEntries,
            },
          }

          setAssetData(assetData)
          setAssetPath('virtual:DeckManager')
          setAssetRawContent(null)
          setAssetError(null)
          setIsLoadingAsset(false)

          const loadEnd = performance.now()
          log.logInfo(
            `[useAssetLoader] loadAsset END (DeckManager) - ${(loadEnd - loadStart).toFixed(2)}ms`,
            getStackTrace(),
            undefined,
            false
          )
          return
        } catch (error) {
          setAssetError(
            error instanceof Error
              ? error.message
              : 'Failed to load DeckManager'
          )
          setIsLoadingAsset(false)
          return
        }
      }

      setIsLoadingAsset(true)
      setAssetError(null)
      log.logInfo(
        '[useAssetLoader] Loading asset from network',
        getStackTrace(),
        { identifier },
        false
      )

      await loadAssetFromNetwork(
        identifier,
        setAssetData,
        setAssetPath,
        setAssetRawContent,
        setAssetError,
        setIsLoadingAsset
      )

      const loadEnd = performance.now()
      log.logInfo(
        `[useAssetLoader] loadAsset END (network) - ${(loadEnd - loadStart).toFixed(2)}ms`,
        getStackTrace(),
        undefined,
        false
      )
    },
    [
      setAssetData,
      setAssetPath,
      setAssetRawContent,
      setAssetError,
      setIsLoadingAsset,
    ]
  )

  return {
    assetData,
    assetPath,
    assetRawContent,
    assetInstance,
    isLoadingAsset,
    assetError,
    loadAsset,
    setAssetData,
    setAssetPath,
    setAssetRawContent,
    setAssetError,
    setIsLoadingAsset,
  }
}
