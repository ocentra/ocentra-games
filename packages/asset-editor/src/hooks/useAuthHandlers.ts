import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';

const log = AssetEditorLogger.instance;
const LOG_AUTH_CALLBACKS = true;
const LOG_AUTH_ERROR = true;

const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_AUTH_CALLBACKS) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = LOG_AUTH_ERROR) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

interface AuthHandlers {
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  facebookLogin: () => Promise<{ success: boolean; error?: string }>;
  googleLogin: () => Promise<{ success: boolean; error?: string }>;
  guestLogin: () => Promise<{ success: boolean; error?: string }>;
  walletLogin: () => Promise<{ success: boolean; error?: string }>;
}

export function useAuthHandlers(
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>,
  signUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>,
  loginWithFacebook: () => Promise<{ success: boolean; error?: string }>,
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>,
  loginAsGuest: () => Promise<{ success: boolean; error?: string }>,
  loginWithWallet: () => Promise<{ success: boolean; error?: string }>
): AuthHandlers {
  return {
    login: async (username: string, password: string) => {
      try {
        logInfo('Login callback called:', { username }, LOG_AUTH_CALLBACKS);
        const result = await login(username, password);
        if (result.success) {
          logInfo('✅ Login callback successful', undefined, LOG_AUTH_CALLBACKS);
        } else {
          logError('❌ Login callback failed:', result.error, LOG_AUTH_ERROR);
        }
        return { success: result.success, error: result.error };
      } catch (error) {
        logError('❌ Exception in login callback:', error, LOG_AUTH_ERROR);
        return { success: false, error: 'An unexpected error occurred' };
      }
    },

    signUp: async (userData: { alias: string; avatar: string; username: string; password: string }) => {
      try {
        logInfo('Sign up callback called:', { 
          alias: userData.alias, 
          username: userData.username 
        }, LOG_AUTH_CALLBACKS);
        const result = await signUp(userData);
        if (result.success) {
          logInfo('✅ Sign up callback successful', undefined, LOG_AUTH_CALLBACKS);
        } else {
          logError('❌ Sign up callback failed:', result.error, LOG_AUTH_ERROR);
        }
        return { success: result.success, error: result.error };
      } catch (error) {
        logError('❌ Exception in sign up callback:', error, LOG_AUTH_ERROR);
        return { success: false, error: 'An unexpected error occurred' };
      }
    },

    facebookLogin: async () => {
      try {
        logInfo('Facebook login callback called', undefined, LOG_AUTH_CALLBACKS);
        const result = await loginWithFacebook();
        if (result.success) {
          logInfo('✅ Facebook login callback successful', undefined, LOG_AUTH_CALLBACKS);
        } else {
          logError('❌ Facebook login callback failed:', result.error, LOG_AUTH_ERROR);
        }
        return { success: result.success, error: result.error };
      } catch (error) {
        logError('❌ Exception in Facebook login callback:', error, LOG_AUTH_ERROR);
        return { success: false, error: 'An unexpected error occurred' };
      }
    },

    googleLogin: async () => {
      try {
        logInfo('Google login callback called', undefined, LOG_AUTH_CALLBACKS);
        const result = await loginWithGoogle();
        if (result.success) {
          logInfo('✅ Google login callback successful', undefined, LOG_AUTH_CALLBACKS);
        } else {
          logError('❌ Google login callback failed:', result.error, LOG_AUTH_ERROR);
        }
        return { success: result.success, error: result.error };
      } catch (error) {
        logError('❌ Exception in Google login callback:', error, LOG_AUTH_ERROR);
        return { success: false, error: 'An unexpected error occurred' };
      }
    },

    guestLogin: async () => {
      try {
        logInfo('Guest login callback called', undefined, LOG_AUTH_CALLBACKS);
        const result = await loginAsGuest();
        if (result.success) {
          logInfo('✅ Guest login callback successful', undefined, LOG_AUTH_CALLBACKS);
        } else {
          logError('❌ Guest login callback failed:', result.error, LOG_AUTH_ERROR);
        }
        return { success: result.success, error: result.error };
      } catch (error) {
        logError('❌ Exception in Guest login callback:', error, LOG_AUTH_ERROR);
        return { success: false, error: 'An unexpected error occurred' };
      }
    },

    walletLogin: async () => {
      try {
        logInfo('Wallet login callback called', undefined, LOG_AUTH_CALLBACKS);
        const result = await loginWithWallet();
        if (result.success) {
          logInfo('✅ Wallet login callback successful', undefined, LOG_AUTH_CALLBACKS);
        } else {
          logError('❌ Wallet login callback failed:', result.error, LOG_AUTH_ERROR);
        }
        return { success: result.success, error: result.error };
      } catch (error) {
        logError('❌ Exception in Wallet login callback:', error, LOG_AUTH_ERROR);
        return { success: false, error: 'An unexpected error occurred' };
      }
    },
  };
}

