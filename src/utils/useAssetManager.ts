import { useState, useEffect, useCallback, useRef } from 'react'
import { AssetManager, getAssetManager } from './assetManager'
import type { AssetManagerStats, LoadingProgress } from './types'
import { TextureManager } from './textureManager'

export interface UseAssetManagerOptions {
  autoInitialize?: boolean
  preloadStrategy?: 'critical' | 'high' | 'all' | 'none'
  enableCaching?: boolean
}

export interface AssetManagerState {
  isInitialized: boolean
  isLoading: boolean
  progress: LoadingProgress[]
  error: string | null
  stats: AssetManagerStats | null
}

/**
 * React hook for managing game assets
 */
export function useAssetManager(options: UseAssetManagerOptions = {}) {
  const {
    autoInitialize = true,
    preloadStrategy = 'high',
    enableCaching = true
  } = options

  const [state, setState] = useState<AssetManagerState>({
    isInitialized: false,
    isLoading: false,
    progress: [],
    error: null,
    stats: null
  })

  const assetManagerRef = useRef<AssetManager | null>(null)
  const progressUnsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize asset manager
  const initialize = useCallback(async () => {
    if (state.isInitialized || state.isLoading) {
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const manager = getAssetManager({
        preloadStrategy,
        enableCaching
      })

      assetManagerRef.current = manager

      // Subscribe to progress updates
      progressUnsubscribeRef.current = manager.onProgress((progress) => {
        setState(prev => ({ ...prev, progress }))
      })

      await manager.initialize()

      const stats = await manager.getStats()

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isLoading: false,
        stats
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to initialize assets'
      }))
    }
  }, [preloadStrategy, enableCaching, state.isInitialized, state.isLoading])

  // Load a specific bundle
  const loadBundle = useCallback(async (bundleId: string) => {
    if (!assetManagerRef.current) {
      throw new Error('Asset manager not initialized')
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      await assetManagerRef.current.loadBundle(bundleId)
      const stats = await assetManagerRef.current.getStats()
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        stats
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load bundle'
      }))
    }
  }, [])

  // Get texture manager
  const getTextureManager = useCallback((): TextureManager | null => {
    return assetManagerRef.current?.getTextureManager() || null
  }, [])

  // Refresh stats
  const refreshStats = useCallback(async () => {
    if (!assetManagerRef.current) {
      return
    }

    try {
      const stats = await assetManagerRef.current.getStats()
      setState(prev => ({ ...prev, stats }))
    } catch (error) {
      console.error('Failed to refresh stats:', error)
    }
  }, [])

  // Clear all assets
  const clearAll = useCallback(async () => {
    if (!assetManagerRef.current) {
      return
    }

    try {
      await assetManagerRef.current.clearAll()
      setState({
        isInitialized: false,
        isLoading: false,
        progress: [],
        error: null,
        stats: null
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to clear assets'
      }))
    }
  }, [])

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInitialize) {
      initialize()
    }

    // Cleanup on unmount
    return () => {
      if (progressUnsubscribeRef.current) {
        progressUnsubscribeRef.current()
      }
    }
  }, [autoInitialize, initialize])

  return {
    // State
    ...state,
    
    // Actions
    initialize,
    loadBundle,
    clearAll,
    refreshStats,
    
    // Utilities
    getTextureManager,
    assetManager: assetManagerRef.current
  }
}

/**
 * Hook for loading specific card textures
 */
export function useCardTextures() {
  const { getTextureManager, isInitialized } = useAssetManager()
  
  const loadCardTexture = useCallback(async (suit: string, value: string) => {
    const textureManager = getTextureManager()
    if (!textureManager || !isInitialized) {
      throw new Error('Asset manager not ready')
    }
    
    return textureManager.getCardTextures(suit, value)
  }, [getTextureManager, isInitialized])

  const loadSuitTexture = useCallback(async (suit: string, variant: 'filled' | 'hollow' | 'circles_filled' | 'circles_hollow' = 'filled') => {
    const textureManager = getTextureManager()
    if (!textureManager || !isInitialized) {
      throw new Error('Asset manager not ready')
    }
    
    return textureManager.getSuitTexture(suit, variant)
  }, [getTextureManager, isInitialized])

  const preloadSuit = useCallback(async (suit: string) => {
    const textureManager = getTextureManager()
    if (!textureManager || !isInitialized) {
      throw new Error('Asset manager not ready')
    }
    
    return textureManager.preloadSuitTextures(suit)
  }, [getTextureManager, isInitialized])

  return {
    loadCardTexture,
    loadSuitTexture,
    preloadSuit,
    isReady: isInitialized
  }
}

/**
 * Hook for UI textures (backgrounds, icons, etc.)
 */
export function useUITextures() {
  const { getTextureManager, isInitialized } = useAssetManager()
  
  const loadUITextures = useCallback(async () => {
    const textureManager = getTextureManager()
    if (!textureManager || !isInitialized) {
      throw new Error('Asset manager not ready')
    }
    
    return textureManager.getUITextures()
  }, [getTextureManager, isInitialized])

  return {
    loadUITextures,
    isReady: isInitialized
  }
}

/**
 * Hook for monitoring asset loading progress
 */
export function useAssetProgress() {
  const { progress, isLoading } = useAssetManager({ autoInitialize: false })
  
  const totalProgress = progress.length > 0 
    ? progress.reduce((sum, p) => sum + p.percentage, 0) / progress.length
    : 0

  const isComplete = progress.length > 0 && progress.every(p => p.percentage >= 100)
  
  return {
    progress,
    totalProgress,
    isLoading,
    isComplete,
    currentBundle: progress.find(p => p.percentage < 100 && p.percentage > 0)
  }
}