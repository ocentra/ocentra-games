// Asset Management System
export { AssetLoader } from './assetLoader'
export type { 
  AssetBundle, 
  AssetDefinition, 
  AssetCache 
} from './types'

export { IndexedDBCache } from './indexedDBCache'

export { TextureManager } from './textureManager'
export type { 
  TextureConfig, 
  CardTextureSet 
} from './textureManager'

export { 
  AssetManager, 
  getAssetManager, 
  initializeAssets, 
  cleanupAssets 
} from './assetManager'
export type { 
  AssetManagerConfig, 
  AssetManagerStats 
} from './types'

export {
  ALL_ASSET_BUNDLES,
  CRITICAL_ASSETS,
  HIGH_PRIORITY_ASSETS,
  MEDIUM_PRIORITY_ASSETS,
  LOW_PRIORITY_ASSETS,
  MODEL_ASSETS,
  getAssetBundle,
  getAssetsByType,
  getCardAssetId,
  getSuitAssetId,
  getTotalAssetSize
} from './assetDefinitions'

export { 
  useAssetManager, 
  useCardTextures, 
  useUITextures, 
  useAssetProgress 
} from './useAssetManager'
export type { 
  UseAssetManagerOptions, 
  AssetManagerState 
} from './useAssetManager'

// Loading UI Components
export { 
  LoadingProgress, 
  MultiProgress, 
  LoadingScreen 
} from '../ui/components/LoadingProgress'