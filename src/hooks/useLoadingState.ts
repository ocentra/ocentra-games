import { useState, useEffect } from 'react';
import { useMainAppLogger } from './useMainAppLogger';

interface UseLoadingStateOptions {
  isBackgroundReady: boolean;
  isAuthenticated: boolean;
}

export function useLoadingState({ isBackgroundReady, isAuthenticated }: UseLoadingStateOptions) {
  const logger = useMainAppLogger();
  const [shouldShowLoading, setShouldShowLoading] = useState(true);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  useEffect(() => {
    if (isBackgroundReady) {
      logger.logUI('[useEffect] Background is ready, starting loading screen dissolve timer');
      const waitTimer = setTimeout(() => {
        logger.logUI('[useEffect] Starting to dissolve loading screen');
        const dissolveTimer = setTimeout(() => {
          logger.logUI('[useEffect] ✅ Loading screen completely dissolved');
          setShouldShowLoading(false);
        }, 1000);
        
        return () => clearTimeout(dissolveTimer);
      }, 500);
      
      return () => clearTimeout(waitTimer);
    }
  }, [isBackgroundReady, logger]);

  useEffect(() => {
    logger.logUI('[useEffect] Login dialog effect triggered:', { 
      isAuthenticated, 
      isBackgroundReady, 
      shouldShowLoading
    });
    
    if (!isAuthenticated && isBackgroundReady && !shouldShowLoading) {
      logger.logUI('[useEffect] ✅ Conditions met to show login dialog, setting timer');
      const timer = setTimeout(() => {
        logger.logUI('[useEffect] ✅ Showing login dialog');
        setShowLoginDialog(true);
      }, 300);

      return () => clearTimeout(timer);
    } else if (isAuthenticated) {
      logger.logUI('[useEffect] ✅ User is authenticated, hiding login dialog');
      setShowLoginDialog(false);
    }
  }, [isAuthenticated, isBackgroundReady, shouldShowLoading, logger]);

  return { shouldShowLoading, showLoginDialog };
}

