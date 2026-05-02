import { useState, useCallback, useRef } from 'react'
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
  const loadRequestIdRef = useRef(0)

  const loadAsset = useCallback(
    async (identifier: string) => {
      const requestId = loadRequestIdRef.current + 1
      loadRequestIdRef.current = requestId
      const isCurrentRequest = () => loadRequestIdRef.current === requestId
      const commitAssetData = (data: AssetData | null) => {
        if (isCurrentRequest()) setAssetData(data)
      }
      const commitAssetPath = (path: string | null) => {
        if (isCurrentRequest()) setAssetPath(path)
      }
      const commitAssetRawContent = (content: string | null) => {
        if (isCurrentRequest()) setAssetRawContent(content)
      }
      const commitAssetError = (error: string | null) => {
        if (isCurrentRequest()) setAssetError(error)
      }
      const commitIsLoadingAsset = (loading: boolean) => {
        if (isCurrentRequest()) setIsLoadingAsset(loading)
      }
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
          commitIsLoadingAsset(true)
          commitAssetError(null)
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

          commitAssetData(assetData)
          commitAssetPath('virtual:GameRegistry')
          commitAssetRawContent(null)
          commitAssetError(null)
          commitIsLoadingAsset(false)

          const loadEnd = performance.now()
          log.logInfo(
            `[useAssetLoader] loadAsset END (GameRegistry) - ${(loadEnd - loadStart).toFixed(2)}ms`,
            getStackTrace(),
            undefined,
            false
          )
          return
        } catch (error) {
          commitAssetError(
            error instanceof Error
              ? error.message
              : 'Failed to load GameRegistry'
          )
          commitIsLoadingAsset(false)
          return
        }
      }

      if (identifierClean === 'virtual:AssetCatalog') {
        try {
          commitIsLoadingAsset(true)
          commitAssetError(null)

          const assetData: AssetData = {
            system: {
              guid: 'virtual:AssetCatalog',
              assetType: 'AssetCatalog',
              displayName: 'Asset Catalog',
              schemaVersion: 1,
            },
            data: {},
          }

          commitAssetData(assetData)
          commitAssetPath('virtual:AssetCatalog')
          commitAssetRawContent(null)
          commitAssetError(null)
          commitIsLoadingAsset(false)
          return
        } catch (error) {
          commitAssetError(
            error instanceof Error
              ? error.message
              : 'Failed to load asset catalog'
          )
          commitIsLoadingAsset(false)
          return
        }
      }

      if (identifierClean === 'virtual:DeckManager') {
        try {
          commitIsLoadingAsset(true)
          commitAssetError(null)
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

          commitAssetData(assetData)
          commitAssetPath('virtual:DeckManager')
          commitAssetRawContent(null)
          commitAssetError(null)
          commitIsLoadingAsset(false)

          const loadEnd = performance.now()
          log.logInfo(
            `[useAssetLoader] loadAsset END (DeckManager) - ${(loadEnd - loadStart).toFixed(2)}ms`,
            getStackTrace(),
            undefined,
            false
          )
          return
        } catch (error) {
          commitAssetError(
            error instanceof Error
              ? error.message
              : 'Failed to load DeckManager'
          )
          commitIsLoadingAsset(false)
          return
        }
      }

      commitIsLoadingAsset(true)
      commitAssetError(null)
      log.logInfo(
        '[useAssetLoader] Loading asset from network',
        getStackTrace(),
        { identifier },
        false
      )

      await loadAssetFromNetwork(
        identifier,
        commitAssetData,
        commitAssetPath,
        commitAssetRawContent,
        commitAssetError,
        commitIsLoadingAsset
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
