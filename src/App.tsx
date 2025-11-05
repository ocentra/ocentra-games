import { QueryProvider } from './providers/QueryProvider'
import { useGameStore } from './store/gameStore'
import { useAssetManager } from './utils/useAssetManager'
import DynamicBackground3D from './ui/components/Background/DynamicBackground3D'
import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const { error } = useGameStore()
  const { isInitialized, isLoading, error: assetError } = useAssetManager({ autoInitialize: true })
  const [isBackgroundReady, setIsBackgroundReady] = useState(false)
  const [shouldShowLoading, setShouldShowLoading] = useState(true)

  // Hide loading screen when background is ready
  useEffect(() => {
    if (isBackgroundReady) {
      // Wait 1 second before starting to dissolve
      const waitTimer = setTimeout(() => {
        // Then dissolve over 1.5 seconds (3 times longer than before)
        const dissolveTimer = setTimeout(() => {
          setShouldShowLoading(false);
        }, 1500);
        
        return () => clearTimeout(dissolveTimer);
      }, 1000);
      
      return () => clearTimeout(waitTimer);
    }
  }, [isBackgroundReady]);

  if (error) {
    return (
      <div className="error-container">
        <h1>Error</h1>
        <p>{error}</p>
      </div>
    )
  }

  // Show asset loading screen if assets are not yet loaded
  if (isLoading || !isInitialized) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'radial-gradient(circle, rgb(0, 110, 104) 0%, rgb(0, 50, 100) 70%, rgb(0, 5, 15) 100%)',
        zIndex: 1000
      }}>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: '8px solid rgba(0, 149, 255, 0.2)',
          borderTop: '8px solid rgba(0, 149, 255, 0.8)',
          animation: 'spin 1s linear infinite'
        }}></div>
        
        <p style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, calc(-50% + 100px))',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: 16,
          fontFamily: 'Arial, sans-serif'
        }}>
          Loading...
        </p>
        
        <style>{`
          @keyframes spin {
            0% { transform: translate(-50%, -50%) rotate(0deg); }
            100% { transform: translate(-50%, -50%) rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Show asset error if there was a problem loading assets
  if (assetError) {
    return (
      <div className="error-container">
        <h1>Asset Loading Error</h1>
        <p>{assetError}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    )
  }

  // Always render the background, but show loading overlay until it's ready
  return (
    <div className="app" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DynamicBackground3D onReady={() => {
        setIsBackgroundReady(true);
      }} />
      
      {shouldShowLoading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgb(0, 110, 104) 0%, rgb(0, 50, 100) 70%, rgb(0, 5, 15) 100%)',
          zIndex: 1000,
          transition: 'opacity 1.5s ease-out',
          opacity: isBackgroundReady ? 0 : 1,
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 120,
            height: 120,
            borderRadius: '50%',
            border: '8px solid rgba(0, 149, 255, 0.2)',
            borderTop: '8px solid rgba(0, 149, 255, 0.8)',
            animation: 'spin 1s linear infinite'
          }}></div>
          
          <p style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, calc(-50% + 100px))',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: 16,
            fontFamily: 'Arial, sans-serif',
            animation: 'pulse 2s ease-in-out infinite alternate'
          }}>
            Initializing...
          </p>
          
          {/* Static 3D-like text effect using CSS */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: '48px',
            fontWeight: 'bold',
            color: 'limegreen',
            opacity: 0.7,
            textShadow: `
              0 1px 0 #ccc, 
              0 2px 0 #c9c9c9,
              0 3px 0 #bbb,
              0 4px 0 #b9b9b9,
              0 5px 0 #aaa,
              0 6px 1px rgba(0,0,0,.1),
              0 0 5px rgba(0,0,0,.1),
              0 1px 3px rgba(0,0,0,.3),
              0 3px 5px rgba(0,0,0,.2),
              0 5px 10px rgba(0,0,0,.25),
              0 10px 10px rgba(0,0,0,.2),
              0 20px 20px rgba(0,0,0,.15)
            `,
            pointerEvents: 'none'
          }}>
            CLAIM
          </div>
          
          <style>{`
            @keyframes spin {
              0% { transform: translate(-50%, -50%) rotate(0deg); }
              100% { transform: translate(-50%, -50%) rotate(360deg); }
            }
            @keyframes pulse {
              0% { transform: translate(-50%, calc(-50% + 100px)) scale(1); }
              100% { transform: translate(-50%, calc(-50% + 100px)) scale(1.1); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default function AppWrapper() {
  return (
    <QueryProvider>
      <App />
    </QueryProvider>
  )
}