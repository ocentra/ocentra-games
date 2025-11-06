import React, { useState, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { useAssetManager } from '../utils/useAssetManager';
import { useAuth } from '../providers/AuthProvider';
import DynamicBackground3D from '../ui/components/Background/DynamicBackground3D';
import type { RotationControlAPI } from '../ui/components/Background/DynamicBackground3D';
import { AssetLoadingScreen } from '../ui/components/Loading/AssetLoadingScreen';
import { GameLoadingScreen } from '../ui/components/Loading/GameLoadingScreen';
import { ErrorScreen } from '../ui/components/Error/ErrorScreen';
import { AuthScreen } from '../ui/components/Auth/AuthScreen';
import { useAuthHandlers } from '../hooks/useAuthHandlers';
import { useMainAppLogger } from '../hooks/useMainAppLogger';
import { useLoadingState } from '../hooks/useLoadingState';

const MainApp: React.FC = () => {
  const { isAuthenticated, user, login, signUp, logout, loginWithFacebook, loginWithGoogle, loginAsGuest } = useAuth();
  const authHandlers = useAuthHandlers(login, signUp, loginWithFacebook, loginWithGoogle, loginAsGuest);
  const logger = useMainAppLogger();
  const { error } = useGameStore();
  const { isInitialized, isLoading, error: assetError } = useAssetManager({ autoInitialize: true });
  const [isBackgroundReady, setIsBackgroundReady] = useState(false);
  const rotationRef = useRef<RotationControlAPI | null>(null);
  
  const { shouldShowLoading, showLoginDialog } = useLoadingState({
    isBackgroundReady,
    isAuthenticated,
  });

  logger.logRender({ 
    isAuthenticated, 
    user: user ? { uid: user.uid, displayName: user.displayName } : null,
    isInitialized, 
    isLoading, 
    isBackgroundReady, 
    shouldShowLoading,
    showLoginDialog
  });
  
  // Early returns for error and loading states
  if (error) {
    logger.logError('[render] ❌ Game store error:', error);
    return <ErrorScreen title="Error" message={error} />;
  }
  
  if (isLoading || !isInitialized) {
    return <AssetLoadingScreen message="Loading..." />;
  }
  
  if (assetError) {
    logger.logError('[render] ❌ Asset loading error:', assetError);
    return (
      <ErrorScreen 
        title="Asset Loading Error" 
        message={assetError} 
        onRetry={() => window.location.reload()}
        retryLabel="Retry"
      />
    );
  }
  
  // Main app render - always show background
  return (
    <div className="app main-app-container">
      <DynamicBackground3D 
        controlRef={rotationRef}
        onReady={() => {
          logger.logUI('[onReady] ✅ Background is ready');
          setIsBackgroundReady(true);
        }} 
      />
      
      {shouldShowLoading && <GameLoadingScreen isBackgroundReady={isBackgroundReady} />}
      
      <AuthScreen
        isAuthenticated={isAuthenticated}
        user={user}
        showLoginDialog={showLoginDialog}
        onLogin={authHandlers.login}
        onSignUp={authHandlers.signUp}
        onFacebookLogin={authHandlers.facebookLogin}
        onGoogleLogin={authHandlers.googleLogin}
        onGuestLogin={authHandlers.guestLogin}
        onLogout={logout}
        onLogoutClick={() => logger.logUI('[onClick] Logout button clicked')}
        onTabSwitch={() => {
          logger.logUI('[onTabSwitch] Tab switch triggered, rotating background');
          if (rotationRef.current?.rotate) {
            rotationRef.current.rotate();
          }
        }}
      />
    </div>
  );
};

export default MainApp;