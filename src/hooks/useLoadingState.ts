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

  // Hide loading screen when background is ready
  useEffect(() => {
    if (isBackgroundReady) {
      logger.logUI('[useEffect] Background is ready, starting loading screen dissolve timer');
      // Wait 0.5 seconds before starting to dissolve (balanced timing)
      const waitTimer = setTimeout(() => {
        logger.logUI('[useEffect] Starting to dissolve loading screen');
        // Then dissolve over 1.0 seconds (smooth transition)
        const dissolveTimer = setTimeout(() => {
          logger.logUI('[useEffect] ✅ Loading screen completely dissolved');
          setShouldShowLoading(false);
        }, 1000);
        
        return () => clearTimeout(dissolveTimer);
      }, 500);
      
      return () => clearTimeout(waitTimer);
    }
  }, [isBackgroundReady, logger]);
  
  // Show login dialog after background is ready and loading screen has dissolved
  useEffect(() => {
    logger.logUI('[useEffect] Login dialog effect triggered:', { 
      isAuthenticated, 
      isBackgroundReady, 
      shouldShowLoading
    });
    
    if (!isAuthenticated && isBackgroundReady && !shouldShowLoading) {
      logger.logUI('[useEffect] ✅ Conditions met to show login dialog, setting timer');
      // Add a small delay for smooth appearance
      const timer = setTimeout(() => {
        logger.logUI('[useEffect] ✅ Showing login dialog');
        setShowLoginDialog(true);
      }, 300); // 300ms delay for smooth transition
      
      return () => clearTimeout(timer);
    } else if (isAuthenticated) {
      // Make sure login dialog is hidden when user is authenticated
      logger.logUI('[useEffect] ✅ User is authenticated, hiding login dialog');
      setShowLoginDialog(false);
    }
  }, [isAuthenticated, isBackgroundReady, shouldShowLoading, logger]);

  return { shouldShowLoading, showLoginDialog };
}

