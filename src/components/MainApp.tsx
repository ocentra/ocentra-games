import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAssetManager } from '../utils/useAssetManager';
import { useAuth } from '../providers/AuthProvider';
import LoginDialog from '../ui/components/Auth/LoginDialog';
import DynamicBackground3D from '../ui/components/Background/DynamicBackground3D';
import type { RotationControlAPI } from '../ui/components/Background/DynamicBackground3D';

const MainApp: React.FC = () => {
  const { isAuthenticated, user, login, signUp, logout, loginWithFacebook, loginWithGoogle, loginAsGuest } = useAuth();
  const { error } = useGameStore();
  const { isInitialized, isLoading, error: assetError } = useAssetManager({ autoInitialize: true });
  const [isBackgroundReady, setIsBackgroundReady] = useState(false);
  const [shouldShowLoading, setShouldShowLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const rotationRef = useRef<RotationControlAPI | null>(null);

  console.log('App render', { 
    isAuthenticated, 
    isInitialized, 
    isLoading, 
    isBackgroundReady, 
    shouldShowLoading,
    showLoginDialog
  });

  // Hide loading screen when background is ready
  useEffect(() => {
    if (isBackgroundReady) {
      console.log('Background is ready, starting loading screen dissolve timer');
      // Wait 0.5 seconds before starting to dissolve (balanced timing)
      const waitTimer = setTimeout(() => {
        console.log('Starting to dissolve loading screen');
        // Then dissolve over 1.0 seconds (smooth transition)
        const dissolveTimer = setTimeout(() => {
          console.log('Loading screen completely dissolved');
          setShouldShowLoading(false);
        }, 1000);
        
        return () => clearTimeout(dissolveTimer);
      }, 500);
      
      return () => clearTimeout(waitTimer);
    }
  }, [isBackgroundReady]);
  
  // Show login dialog after background is ready and loading screen has dissolved
  useEffect(() => {
    console.log('Login dialog effect triggered', { 
      isAuthenticated, 
      isBackgroundReady, 
      shouldShowLoading,
      showLoginDialog
    });
    
    if (!isAuthenticated && isBackgroundReady && !shouldShowLoading) {
      console.log('Conditions met to show login dialog, setting timer');
      // Add a small delay for smooth appearance
      const timer = setTimeout(() => {
        console.log('Showing login dialog');
        setShowLoginDialog(true);
      }, 300); // 300ms delay for smooth transition
      
      return () => clearTimeout(timer);
    } else if (isAuthenticated) {
      // Make sure login dialog is hidden when user is authenticated
      console.log('User is authenticated, hiding login dialog');
      setShowLoginDialog(false);
    }
  }, [isAuthenticated, isBackgroundReady, shouldShowLoading]);
  
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
  
  // Main app render - always show background
  return (
    <div className="app" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <DynamicBackground3D 
        controlRef={rotationRef} // Pass the ref to access rotation API
        onReady={() => {
          console.log('Background is ready');
          setIsBackgroundReady(true);
        }} 
      />
      
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
            Initializing game...
          </p>
          
          {/* Optimized growing 3D text effect */}
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
            animation: 'grow 6s linear infinite',
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
            @keyframes grow {
              0% { transform: translate(-50%, -50%) scale(1); }
              100% { transform: translate(-50%, -50%) scale(15); }
            }
          `}</style>
        </div>
      )}
      
      {/* Show login dialog if user is not authenticated and it's time to show it */}
      {!isAuthenticated && showLoginDialog && (
        <LoginDialog
          onLogin={async (username, password) => {
            const result = await login(username, password);
            if (result.success) {
              console.log('Login successful');
            } else {
              console.log('Login failed:', result.error);
            }
            return result.success;
          }}
          onSignUp={async (userData) => {
            const result = await signUp(userData);
            if (result.success) {
              console.log('Sign up successful');
            } else {
              console.log('Sign up failed:', result.error);
            }
            return result.success;
          }}
          onFacebookLogin={async () => {
            const result = await loginWithFacebook();
            if (result.success) {
              console.log('Facebook login successful');
            } else {
              console.log('Facebook login failed:', result.error);
            }
            return result.success;
          }}
          onGoogleLogin={async () => {
            const result = await loginWithGoogle();
            if (result.success) {
              console.log('Google login successful');
            } else {
              console.log('Google login failed:', result.error);
            }
            return result.success;
          }}
          onGuestLogin={async () => {
            const result = await loginAsGuest();
            if (result.success) {
              console.log('Guest login successful');
            } else {
              console.log('Guest login failed:', result.error);
            }
            return result.success;
          }}
          onTabSwitch={() => {
            // Trigger background rotation when switching tabs
            if (rotationRef.current && rotationRef.current.rotate) {
              rotationRef.current.rotate();
            }
          }}
        />
      )}
      
      {/* Show main app content if user is authenticated */}
      {isAuthenticated && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          textAlign: 'center',
          zIndex: 1000
        }}>
          <h1>Welcome to CLAIM</h1>
          {user && <p>Hello, {user.displayName}!</p>}
          <p>You are successfully logged in!</p>
          <button 
            onClick={logout}
            style={{
              padding: '10px 20px',
              backgroundColor: 'rgba(255, 0, 0, 0.7)',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
};

export default MainApp;