import React, { useState } from 'react'
import { 
  useAssetManager, 
  useAssetProgress, 
  useCardTextures,
  LoadingScreen,
  LoadingProgress as LoadingProgressComponent
} from '../../utils'

/**
 * Demo component showing how to use the asset management system
 */
export function AssetManagerDemo() {
  const {
    isInitialized,
    isLoading,
    error,
    stats,
    initialize,
    loadBundle,
    clearAll,
    refreshStats
  } = useAssetManager({ autoInitialize: false })

  const { progress, totalProgress, isComplete } = useAssetProgress()
  const { loadCardTexture, preloadSuit, isReady } = useCardTextures()
  
  const [selectedSuit, setSelectedSuit] = useState('spades')
  const [selectedValue, setSelectedValue] = useState('ace')
  const [loadingCard, setLoadingCard] = useState(false)

  const handleInitialize = async () => {
    try {
      await initialize()
    } catch (err) {
      console.error('Failed to initialize:', err)
    }
  }

  const handleLoadBundle = async (bundleId: string) => {
    try {
      await loadBundle(bundleId)
      await refreshStats()
    } catch (err) {
      console.error('Failed to load bundle:', err)
    }
  }

  const handleLoadCard = async () => {
    if (!isReady) return
    
    setLoadingCard(true)
    try {
      const textures = await loadCardTexture(selectedSuit, selectedValue)
      console.log('Loaded card textures:', textures)
    } catch (err) {
      console.error('Failed to load card:', err)
    } finally {
      setLoadingCard(false)
    }
  }

  const handlePreloadSuit = async () => {
    if (!isReady) return
    
    try {
      await preloadSuit(selectedSuit)
      await refreshStats()
    } catch (err) {
      console.error('Failed to preload suit:', err)
    }
  }

  if (isLoading && !isInitialized) {
    return <LoadingScreen progress={progress} message="Initializing Asset Manager..." />
  }

  return (
    <div className="asset-manager-demo">
      <div className="demo-header">
        <h2>Asset Manager Demo</h2>
        <div className="demo-status">
          Status: {isInitialized ? '✅ Ready' : '❌ Not Initialized'}
        </div>
      </div>

      {error && (
        <div className="demo-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Initialization Controls */}
      <div className="demo-section">
        <h3>Initialization</h3>
        <div className="demo-controls">
          <button 
            onClick={handleInitialize} 
            disabled={isInitialized || isLoading}
          >
            Initialize Asset Manager
          </button>
          <button 
            onClick={clearAll} 
            disabled={!isInitialized}
          >
            Clear All Assets
          </button>
          <button 
            onClick={refreshStats} 
            disabled={!isInitialized}
          >
            Refresh Stats
          </button>
        </div>
      </div>

      {/* Loading Progress */}
      {progress.length > 0 && (
        <div className="demo-section">
          <h3>Loading Progress</h3>
          <div className="demo-progress">
            <div className="overall-progress">
              Overall: {Math.round(totalProgress)}% 
              {isComplete && ' ✅ Complete'}
            </div>
            {progress.map((p) => (
              <LoadingProgressComponent 
                key={p.bundleId} 
                progress={p} 
                showDetails={true}
              />
            ))}
          </div>
        </div>
      )}

      {/* Bundle Loading */}
      <div className="demo-section">
        <h3>Asset Bundles</h3>
        <div className="demo-controls">
          <button 
            onClick={() => handleLoadBundle('critical')} 
            disabled={!isInitialized || isLoading}
          >
            Load Critical Assets
          </button>
          <button 
            onClick={() => handleLoadBundle('high_priority')} 
            disabled={!isInitialized || isLoading}
          >
            Load High Priority
          </button>
          <button 
            onClick={() => handleLoadBundle('medium_priority')} 
            disabled={!isInitialized || isLoading}
          >
            Load Medium Priority
          </button>
          <button 
            onClick={() => handleLoadBundle('low_priority')} 
            disabled={!isInitialized || isLoading}
          >
            Load Low Priority
          </button>
        </div>
      </div>

      {/* Card Loading */}
      <div className="demo-section">
        <h3>Card Textures</h3>
        <div className="demo-card-controls">
          <div className="demo-selectors">
            <select 
              value={selectedSuit} 
              onChange={(e) => setSelectedSuit(e.target.value)}
            >
              <option value="spades">Spades</option>
              <option value="hearts">Hearts</option>
              <option value="diamonds">Diamonds</option>
              <option value="clubs">Clubs</option>
            </select>
            
            <select 
              value={selectedValue} 
              onChange={(e) => setSelectedValue(e.target.value)}
            >
              <option value="ace">Ace</option>
              <option value="king">King</option>
              <option value="queen">Queen</option>
              <option value="jack">Jack</option>
              <option value="10">10</option>
              <option value="9">9</option>
              <option value="8">8</option>
              <option value="7">7</option>
              <option value="6">6</option>
              <option value="5">5</option>
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
            </select>
          </div>
          
          <div className="demo-controls">
            <button 
              onClick={handleLoadCard} 
              disabled={!isReady || loadingCard}
            >
              {loadingCard ? 'Loading...' : `Load ${selectedValue} of ${selectedSuit}`}
            </button>
            <button 
              onClick={handlePreloadSuit} 
              disabled={!isReady || isLoading}
            >
              Preload All {selectedSuit}
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="demo-section">
          <h3>Statistics</h3>
          <div className="demo-stats">
            <div className="stat-item">
              <strong>Total Assets:</strong> {stats.totalAssets}
            </div>
            <div className="stat-item">
              <strong>Loaded Assets:</strong> {stats.loadedAssets}
            </div>
            <div className="stat-item">
              <strong>Cached Assets:</strong> {stats.cachedAssets}
            </div>
            <div className="stat-item">
              <strong>Memory Usage:</strong> {stats.memoryUsage.estimatedMB}MB 
              ({stats.memoryUsage.textures} textures)
            </div>
            <div className="stat-item">
              <strong>Cache Size:</strong> {Math.round(stats.cacheStats.totalSize / 1024 / 1024)}MB 
              ({stats.cacheStats.count} items)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}