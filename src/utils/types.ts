import { Texture, Object3D } from 'three'

export interface AssetDefinition {
  id: string
  path: string
  type: 'texture' | 'model' | 'audio' | 'json'
  size?: number // in bytes
}

export interface AssetBundle {
  id: string
  name: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  assets: AssetDefinition[]
}

export interface LoadingProgress {
  bundleId: string
  loaded: number
  total: number
  percentage: number
  currentAsset?: string
}

export interface AssetCache {
  get(key: string): Promise<Blob | null>
  set(key: string, data: Blob): Promise<void>
  has(key: string): Promise<boolean>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

export interface AssetManagerConfig {
  enableCaching?: boolean
  maxCacheSize?: number // in bytes
  preloadStrategy?: 'critical' | 'high' | 'all' | 'none'
  concurrentLoads?: number
}

export interface AssetManagerStats {
  totalAssets: number
  loadedAssets: number
  cachedAssets: number
  memoryUsage: {
    textures: number
    estimatedMB: number
  }
  cacheStats: {
    count: number
    totalSize: number
  }
}

export type AssetType = Texture | Object3D | Record<string, unknown> | Blob