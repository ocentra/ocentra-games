import { AssetLoader } from './assetLoader'
import type { LoadingProgress, AssetManagerStats, AssetManagerConfig } from './types'
import { IndexedDBCache } from './indexedDBCache'
import { TextureManager } from './textureManager'
import { 
  ALL_ASSET_BUNDLES, 
  CRITICAL_ASSETS, 
  HIGH_PRIORITY_ASSETS,
  MEDIUM_PRIORITY_ASSETS,
  LOW_PRIORITY_ASSETS,
  getAssetBundle 
} from './assetDefinitions'



export class AssetManager {
  private assetLoader: AssetLoader
  private textureManager: TextureManager
  private cache: IndexedDBCache
  private config: Required<AssetManagerConfig>
  private progressCallbacks: Set<(progress: LoadingProgress[]) => void> = new Set()
  private currentProgress: Map<string, LoadingProgress> = new Map()
  private isInitialized = false

  constructor(config: AssetManagerConfig = {}) {
    this.config = {
      enableCaching: config.enableCaching ?? true,
      maxCacheSize: config.maxCacheSize ?? 100 * 1024 * 1024, // 100MB
      preloadStrategy: config.preloadStrategy ?? 'high',
      concurrentLoads: config.concurrentLoads ?? 4
    }

    this.cache = new IndexedDBCache()
    this.assetLoader = new AssetLoader(this.cache)
    this.textureManager = new TextureManager(this.assetLoader)

    this.setupProgressTracking()
  }

  /**
   * Initialize the asset manager and perform initial loading
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Check IndexedDB support
      if (this.config.enableCaching && !IndexedDBCache.isSupported()) {
        console.warn('IndexedDB not supported, caching disabled')
        this.config.enableCaching = false
      }

      // Perform cache cleanup if needed
      if (this.config.enableCaching) {
        await this.cache.cleanup(this.config.maxCacheSize)
      }

      // Preload assets based on strategy
      await this.preloadAssets()

      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize AssetManager:', error)
      throw error
    }
  }

  /**
   * Preload assets based on the configured strategy
   */
  async preloadAssets(): Promise<void> {
    const bundlesToLoad = this.getBundlesToPreload()
    
    if (bundlesToLoad.length === 0) {
      return
    }

    // Load bundles in priority order
    for (const bundle of bundlesToLoad) {
      await this.assetLoader.loadBundle(bundle)
    }
  }

  /**
   * Load a specific asset bundle
   */
  async loadBundle(bundleId: string): Promise<void> {
    const bundle = getAssetBundle(bundleId)
    if (!bundle) {
      throw new Error(`Asset bundle not found: ${bundleId}`)
    }

    await this.assetLoader.loadBundle(bundle)
  }

  /**
   * Get texture manager for Three.js integration
   */
  getTextureManager(): TextureManager {
    return this.textureManager
  }

  /**
   * Get asset loader for direct access
   */
  getAssetLoader(): AssetLoader {
    return this.assetLoader
  }

  /**
   * Subscribe to loading progress updates
   */
  onProgress(callback: (progress: LoadingProgress[]) => void): () => void {
    this.progressCallbacks.add(callback)
    
    // Send current progress immediately
    const currentProgressArray = Array.from(this.currentProgress.values())
    if (currentProgressArray.length > 0) {
      callback(currentProgressArray)
    }
    
    return () => {
      this.progressCallbacks.delete(callback)
    }
  }

  /**
   * Get current loading statistics
   */
  async getStats(): Promise<AssetManagerStats> {
    const textureStats = this.textureManager.getMemoryUsage()
    const cacheStats = this.config.enableCaching 
      ? await this.cache.getStats()
      : { count: 0, totalSize: 0 }

    const totalAssets = ALL_ASSET_BUNDLES.reduce(
      (sum, bundle) => sum + bundle.assets.length, 0
    )

    return {
      totalAssets,
      loadedAssets: textureStats.textureCount + textureStats.cardTextureCount,
      cachedAssets: cacheStats.count,
      memoryUsage: {
        textures: textureStats.textureCount + textureStats.cardTextureCount,
        estimatedMB: textureStats.estimatedMemoryMB
      },
      cacheStats
    }
  }

  /**
   * Clear all caches and free memory
   */
  async clearAll(): Promise<void> {
    this.textureManager.disposeAll()
    
    if (this.config.enableCaching) {
      await this.cache.clear()
    }
    
    this.currentProgress.clear()
    this.isInitialized = false
  }

  /**
   * Optimize memory usage by disposing unused assets
   */
  async optimizeMemory(): Promise<void> {
    // This could implement more sophisticated memory management
    // For now, just cleanup the cache if it's too large
    if (this.config.enableCaching) {
      await this.cache.cleanup(this.config.maxCacheSize)
    }
  }

  /**
   * Check if the asset manager is ready for use
   */
  isReady(): boolean {
    return this.isInitialized
  }

  /**
   * Get loading progress for all active bundles
   */
  getCurrentProgress(): LoadingProgress[] {
    return Array.from(this.currentProgress.values())
  }

  private setupProgressTracking(): void {
    this.assetLoader.onProgress((progress) => {
      this.currentProgress.set(progress.bundleId, progress)
      
      // Notify all subscribers
      const progressArray = Array.from(this.currentProgress.values())
      this.progressCallbacks.forEach(callback => callback(progressArray))
      
      // Remove completed bundles after a short delay
      if (progress.percentage >= 100) {
        setTimeout(() => {
          this.currentProgress.delete(progress.bundleId)
        }, 1000)
      }
    })
  }

  private getBundlesToPreload() {
    switch (this.config.preloadStrategy) {
      case 'critical':
        return [CRITICAL_ASSETS]
      
      case 'high':
        return [CRITICAL_ASSETS, HIGH_PRIORITY_ASSETS]
      
      case 'all':
        return [CRITICAL_ASSETS, HIGH_PRIORITY_ASSETS, MEDIUM_PRIORITY_ASSETS, LOW_PRIORITY_ASSETS]
      
      case 'none':
      default:
        return []
    }
  }
}

// Global asset manager instance
let globalAssetManager: AssetManager | null = null

/**
 * Get the global asset manager instance
 */
export function getAssetManager(config?: AssetManagerConfig): AssetManager {
  if (!globalAssetManager) {
    globalAssetManager = new AssetManager(config)
  }
  return globalAssetManager
}

/**
 * Initialize the global asset manager
 */
export async function initializeAssets(config?: AssetManagerConfig): Promise<AssetManager> {
  const manager = getAssetManager(config)
  await manager.initialize()
  return manager
}

/**
 * Cleanup the global asset manager
 */
export async function cleanupAssets(): Promise<void> {
  if (globalAssetManager) {
    await globalAssetManager.clearAll()
    globalAssetManager = null
  }
}