import React, { useState, useRef, Suspense, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/providers/AuthProvider';
import type { RotationControlAPI } from '@ocentra/core-ui/Background/DynamicBackground';

const LazyThreeBaseProvider = React.lazy(() =>
  import('@ocentra/core-ui/Background/ThreeBaseContext').then((m) => ({ default: m.ThreeBaseProvider }))
);

const LazyDynamicBackground = React.lazy(() =>
  import('@ocentra/core-ui/Background/DynamicBackground').then((m) => ({ default: m.DynamicBackground }))
);

import { PlatformDesktopAssetWarmupBanner } from '@/ui/components/Loading/PlatformDesktopAssetWarmupBanner';
import { ScreenLoadingFallback } from '@/ui/components/Loading/ScreenLoadingFallback';
import { ErrorScreen } from '@/ui/components/Error/ErrorScreen';
import { AuthScreen } from '@/ui/components/Auth/AuthScreen';
import { useAuthHandlers } from '@/hooks/useAuthHandlers';
import { useMainAppLogger } from '@/hooks/useMainAppLogger';
import { useLoadingState } from '@/hooks/useLoadingState';
import { ROUTE_FEATURES, RouteFeature } from '@/config/platformFeatures';
import { ErrorScreenTitle } from '@/constants/ui';
import { EventBus } from '@ocentra/eventing-domain/core/EventBus';
import { ShowScreenEvent } from '@ocentra/eventing-domain/events/lobby/ShowScreenEvent';

const DISABLE_BACKGROUND_3D = false;

const AuthenticatedApp: React.FC = () => {
  const location = useLocation();
  const { isAuthenticated, hasAccount, user, login, signUp, logout, loginWithFacebook, loginWithGoogle, loginAsGuest, sendPasswordReset } = useAuth();
  const handleWalletLogin = async (): Promise<{ success: boolean; error?: string }> => {
    return { success: false, error: 'Connect your wallet in Add funds when available' };
  };

  const authHandlers = useAuthHandlers(login, signUp, loginWithFacebook, loginWithGoogle, loginAsGuest, handleWalletLogin);
  const logger = useMainAppLogger();
  const { error } = useGameStore();
  const [isBackgroundReady, setIsBackgroundReady] = useState(false);
  const rotationRef = useRef<RotationControlAPI | null>(null);
  const prevPathnameRef = useRef(location.pathname);

  const shouldShowBackground = useMemo(() => {
    const path = location.pathname;
    const excludedPaths = [
      ROUTE_FEATURES[RouteFeature.Admin].path,
      ROUTE_FEATURES[RouteFeature.Logs].path,
      ROUTE_FEATURES[RouteFeature.AIPlayground].path,
    ];
    return !excludedPaths.some(excluded => path.startsWith(excluded));
  }, [location.pathname]);
  const shouldUseThreeBackground = shouldShowBackground && !DISABLE_BACKGROUND_3D;

  useEffect(() => {
    if ((!shouldShowBackground || DISABLE_BACKGROUND_3D) && !isBackgroundReady) {
      setIsBackgroundReady(true);
    }
  }, [shouldShowBackground, isBackgroundReady]);

  useEffect(() => {
    if (isBackgroundReady) {
      const hide = (globalThis as Record<string, unknown>).__hideAppLoading as (() => void) | undefined;
      hide?.();
    }
  }, [isBackgroundReady]);

  useEffect(() => {
    if (!shouldUseThreeBackground || !isBackgroundReady || !rotationRef.current?.rotate) return;
    const navigated = prevPathnameRef.current !== location.pathname;
    prevPathnameRef.current = location.pathname;
    if (!navigated) return;
    rotationRef.current.rotate();
  }, [location.pathname, shouldUseThreeBackground, isBackgroundReady]);

  useEffect(() => {
    const handleShowScreen = () => {
      if (shouldUseThreeBackground && isBackgroundReady && rotationRef.current?.rotate) {
        rotationRef.current.rotate();
      }
    };

    EventBus.instance.subscribe(ShowScreenEvent, handleShowScreen);

    return () => {
      EventBus.instance.unsubscribe(ShowScreenEvent, handleShowScreen);
    };
  }, [shouldUseThreeBackground, isBackgroundReady]);

  const { shouldShowLoading } = useLoadingState({
    isBackgroundReady,
    isAuthenticated,
  });

  logger.logRender({
    isAuthenticated,
    hasAccount,
    user: user ? { uid: user.uid, displayName: user.displayName } : null,
    isBackgroundReady,
    shouldShowLoading,
  });

  if (error) {
    logger.logError('[render] ❌ Game store error:', error);
    return <ErrorScreen title={ErrorScreenTitle} message={error} />;
  }

  return (
    <div className="app main-app-container">
      <PlatformDesktopAssetWarmupBanner />
      {shouldShowBackground && (
        <Suspense fallback={null}>
          {shouldUseThreeBackground && (
            <LazyThreeBaseProvider>
              <LazyDynamicBackground
                controlRef={rotationRef}
                onReady={() => {
                  logger.logUI('[onReady] ✅ Background is ready');
                  setIsBackgroundReady(true);
                }}
              />
            </LazyThreeBaseProvider>
          )}
        </Suspense>
      )}

      <AuthScreen
        user={user}
        hasAccount={hasAccount}
        onLogin={authHandlers.login}
        onSignUp={authHandlers.signUp}
        onFacebookLogin={authHandlers.facebookLogin}
        onGoogleLogin={authHandlers.googleLogin}
        onGuestLogin={authHandlers.guestLogin}
        onWalletLogin={authHandlers.walletLogin}
        onLogout={logout}
        onSendPasswordReset={sendPasswordReset}
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

const MainApp: React.FC = () => {
  return (
    <Suspense fallback={<ScreenLoadingFallback label="Loading Ocentra Games" variant="page" />}>
      <AuthenticatedApp />
    </Suspense>
  );
};

export default MainApp;
