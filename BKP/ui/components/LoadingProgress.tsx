import React from 'react'
import { LoadingProgress as LoadingProgressType } from '../../utils/assetLoader'

interface LoadingProgressProps {
  progress: LoadingProgressType
  showDetails?: boolean
  className?: string
}

export function LoadingProgress({ 
  progress, 
  showDetails = true, 
  className = '' 
}: LoadingProgressProps) {
  const { bundleId, loaded, total, percentage, currentAsset } = progress

  return (
    <div className={`loading-progress ${className}`}>
      <div className="loading-progress-header">
        <h3>Loading {bundleId.replace('_', ' ').toUpperCase()}</h3>
        <span className="loading-percentage">{Math.round(percentage)}%</span>
      </div>
      
      <div className="loading-progress-bar">
        <div 
          className="loading-progress-fill"
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      {showDetails && (
        <div className="loading-progress-details">
          <div className="loading-stats">
            {loaded} / {total} assets loaded
          </div>
          {currentAsset && (
            <div className="loading-current-asset">
              Loading: {currentAsset}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface MultiProgressProps {
  progressList: LoadingProgressType[]
  className?: string
}

export function MultiProgress({ progressList, className = '' }: MultiProgressProps) {
  const totalAssets = progressList.reduce((sum, p) => sum + p.total, 0)
  const loadedAssets = progressList.reduce((sum, p) => sum + p.loaded, 0)
  const overallPercentage = totalAssets > 0 ? (loadedAssets / totalAssets) * 100 : 0

  const currentBundle = progressList.find(p => p.percentage < 100 && p.percentage > 0)

  return (
    <div className={`multi-progress ${className}`}>
      <div className="multi-progress-header">
        <h2>Loading Game Assets</h2>
        <span className="multi-progress-percentage">
          {Math.round(overallPercentage)}%
        </span>
      </div>
      
      <div className="multi-progress-bar">
        <div 
          className="multi-progress-fill"
          style={{ width: `${overallPercentage}%` }}
        />
      </div>
      
      <div className="multi-progress-details">
        <div className="multi-progress-stats">
          {loadedAssets} / {totalAssets} total assets
        </div>
        
        {currentBundle && (
          <div className="multi-progress-current">
            Currently loading: {currentBundle.bundleId.replace('_', ' ')}
          </div>
        )}
      </div>
      
      <div className="multi-progress-bundles">
        {progressList.map((progress) => (
          <div 
            key={progress.bundleId}
            className={`bundle-progress ${progress.percentage === 100 ? 'completed' : ''}`}
          >
            <div className="bundle-name">
              {progress.bundleId.replace('_', ' ')}
            </div>
            <div className="bundle-bar">
              <div 
                className="bundle-fill"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
            <div className="bundle-percentage">
              {Math.round(progress.percentage)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

interface LoadingScreenProps {
  progress?: LoadingProgressType[]
  message?: string
  showLogo?: boolean
}

export function LoadingScreen({ 
  progress = [], 
  message = 'Loading CLAIM...', 
  showLogo = true 
}: LoadingScreenProps) {
  return (
    <div className="loading-screen">
      <div className="loading-screen-content">
        {showLogo && (
          <div className="loading-logo">
            <h1>CLAIM</h1>
            <p>High-Stakes Card Game</p>
          </div>
        )}
        
        <div className="loading-message">
          {message}
        </div>
        
        {progress.length > 0 ? (
          <MultiProgress progressList={progress} />
        ) : (
          <div className="loading-spinner">
            <div className="spinner" />
          </div>
        )}
        
        <div className="loading-tips">
          <p>💡 Tip: CLAIM rewards aggressive play and punishes hesitation</p>
        </div>
      </div>
    </div>
  )
}