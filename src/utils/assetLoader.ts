import { Texture, TextureLoader, LoadingManager, Object3D } from 'three'
import { FBXLoader } from 'three-stdlib'
import type { AssetBundle, AssetDefinition, LoadingProgress, AssetCache, AssetType } from './types'

export class AssetLoader {
  private textureLoader: TextureLoader
  private fbxLoader: FBXLoader
  private loadingManager: LoadingManager
  private cache: AssetCache
  private loadedTextures: Map<string, Texture> = new Map()
  private loadedModels: Map<string, Object3D> = new Map()
  private loadingPromises: Map<string, Promise<AssetType | void>> = new Map()
  private progressCallbacks: Set<(progress: LoadingProgress) => void> = new Set()

  constructor(cache: AssetCache) {
    this.cache = cache
    this.loadingManager = new LoadingManager()
    this.textureLoader = new TextureLoader(this.loadingManager)
    this.fbxLoader = new FBXLoader(this.loadingManager)
    
    this.setupLoadingManager()
  }

  private setupLoadingManager(): void {
    this.loadingManager.onProgress = () => {
      // Progress tracking will be handled per bundle
    }

    this.loadingManager.onError = (url) => {
      console.error(`Failed to load asset: ${url}`)
    }
  }

  /**
   * Load a complete asset bundle with progress tracking
   */
  async loadBundle(bundle: AssetBundle): Promise<void> {
    const bundleKey = `bundle_${bundle.id}`
    
    // Check if bundle is already loaded
    if (this.loadingPromises.has(bundleKey)) {
      const promise = this.loadingPromises.get(bundleKey)!
      await promise
      return
    }

    const loadPromise = this.loadBundleInternal(bundle)
    this.loadingPromises.set(bundleKey, loadPromise)
    
    try {
      await loadPromise
    } finally {
      this.loadingPromises.delete(bundleKey)
    }
  }

  private async loadBundleInternal(bundle: AssetBundle): Promise<void> {
    const totalAssets = bundle.assets.length
    let loadedAssets = 0

    const updateProgress = (currentAsset?: string) => {
      const progress: LoadingProgress = {
        bundleId: bundle.id,
        loaded: loadedAssets,
        total: totalAssets,
        percentage: (loadedAssets / totalAssets) * 100,
        currentAsset
      }
      
      this.progressCallbacks.forEach(callback => callback(progress))
    }

    updateProgress()

    // Load assets in parallel with concurrency limit
    const concurrencyLimit = 4
    const chunks = this.chunkArray(bundle.assets, concurrencyLimit)

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (asset) => {
          updateProgress(asset.id)
          await this.loadAsset(asset)
          loadedAssets++
          updateProgress()
        })
      )
    }
  }

  /**
   * Load a single asset with caching
   */
  async loadAsset(asset: AssetDefinition): Promise<AssetType> {
    const cacheKey = `asset_${asset.id}`
    
    // Check if already loaded in memory
    if (asset.type === 'texture' && this.loadedTextures.has(asset.id)) {
      return this.loadedTextures.get(asset.id)!
    }
    
    if (asset.type === 'model' && this.loadedModels.has(asset.id)) {
      return this.loadedModels.get(asset.id)!
    }

    // Check if loading is in progress
    if (this.loadingPromises.has(cacheKey)) {
      const promise = this.loadingPromises.get(cacheKey)!
      const result = await promise
      // If the promise returned void, we need to load the asset again
      if (result === undefined) {
        // Try to get from loaded maps
        if (asset.type === 'texture' && this.loadedTextures.has(asset.id)) {
          return this.loadedTextures.get(asset.id)!
        }
        if (asset.type === 'model' && this.loadedModels.has(asset.id)) {
          return this.loadedModels.get(asset.id)!
        }
        // If still not found, throw error
        throw new Error(`Asset ${asset.id} is still loading`)
      }
      return result
    }

    const loadPromise = this.loadAssetInternal(asset)
    this.loadingPromises.set(cacheKey, loadPromise)

    try {
      const result = await loadPromise
      return result
    } finally {
      this.loadingPromises.delete(cacheKey)
    }
  }

  private async loadAssetInternal(asset: AssetDefinition): Promise<AssetType> {
    const cacheKey = `asset_${asset.id}`

    try {
      // Try to load from cache first
      const cachedData = await this.cache.get(cacheKey)
      if (cachedData) {
        return this.createAssetFromBlob(asset, cachedData)
      }
    } catch (error) {
      console.warn(`Failed to load ${asset.id} from cache:`, error)
    }

    // Load from network
    try {
      const response = await fetch(asset.path)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${asset.path}: ${response.statusText}`)
      }

      const blob = await response.blob()
      
      // Cache the asset
      try {
        await this.cache.set(cacheKey, blob)
      } catch (error) {
        console.warn(`Failed to cache ${asset.id}:`, error)
      }

      return this.createAssetFromBlob(asset, blob)
    } catch (error) {
      console.error(`Failed to load asset ${asset.id}:`, error)
      throw error
    }
  }

  private async createAssetFromBlob(asset: AssetDefinition, blob: Blob): Promise<AssetType> {
    switch (asset.type) {
      case 'texture':
        return this.createTextureFromBlob(asset.id, blob)
      case 'model':
        return this.createModelFromBlob(asset.id, asset.path, blob)
      case 'json': {
        const text = await blob.text()
        return JSON.parse(text)
      }
      default:
        return blob
    }
  }

  private async createTextureFromBlob(id: string, blob: Blob): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      
      this.textureLoader.load(
        url,
        (loadedTexture) => {
          URL.revokeObjectURL(url)
          this.loadedTextures.set(id, loadedTexture)
          resolve(loadedTexture)
        },
        undefined,
        (error) => {
          URL.revokeObjectURL(url)
          reject(error)
        }
      )
    })
  }

  private async createModelFromBlob(id: string, path: string, blob: Blob): Promise<Object3D> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob)
      
      // Check if it's an FBX file based on extension
      if (path.toLowerCase().endsWith('.fbx')) {
        this.fbxLoader.load(
          url,
          (loadedModel) => {
            URL.revokeObjectURL(url)
            this.loadedModels.set(id, loadedModel)
            resolve(loadedModel)
          },
          undefined,
          (error) => {
            URL.revokeObjectURL(url)
            reject(error)
          }
        )
      } else {
        // For other model types, return the blob
        URL.revokeObjectURL(url)
        reject(new Error(`Unsupported model type for path: ${path}`))
      }
    })
  }

  /**
   * Get a loaded texture by ID
   */
  getTexture(id: string): Texture | null {
    return this.loadedTextures.get(id) || null
  }

  /**
   * Get a loaded model by ID
   */
  getModel(id: string): Object3D | null {
    return this.loadedModels.get(id) || null
  }

  /**
   * Preload critical assets
   */
  async preloadCriticalAssets(): Promise<void> {
    const criticalBundles = this.getCriticalAssetBundles()
    
    await Promise.all(
      criticalBundles.map(bundle => this.loadBundle(bundle))
    )
  }

  /**
   * Subscribe to loading progress updates
   */
  onProgress(callback: (progress: LoadingProgress) => void): () => void {
    this.progressCallbacks.add(callback)
    
    return () => {
      this.progressCallbacks.delete(callback)
    }
  }

  /**
   * Clear all cached assets
   */
  async clearCache(): Promise<void> {
    await this.cache.clear()
    this.loadedTextures.clear()
    this.loadedModels.clear()
  }

  /**
   * Get memory usage statistics
   */
  getMemoryUsage(): { textureCount: number; modelCount: number; cacheSize: string } {
    return {
      textureCount: this.loadedTextures.size,
      modelCount: this.loadedModels.size,
      cacheSize: 'Unknown' // IndexedDB size is not easily accessible
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  private getCriticalAssetBundles(): AssetBundle[] {
    // This will be populated with actual asset definitions
    return []
  }
}