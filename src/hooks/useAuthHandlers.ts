import { logAuth } from '../utils/logger';

const prefix = '[MainApp]';

// Auth flow logging flags
const LOG_AUTH_CALLBACKS = true;   // Auth callback handlers
const LOG_AUTH_ERROR = true;       // Error logging

interface AuthHandlers {
  login: (username: string, password: string) => Promise<boolean>;
  signUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<boolean>;
  facebookLogin: () => Promise<boolean>;
  googleLogin: () => Promise<boolean>;
  guestLogin: () => Promise<boolean>;
}

export function useAuthHandlers(
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>,
  signUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>,
  loginWithFacebook: () => Promise<{ success: boolean; error?: string }>,
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>,
  loginAsGuest: () => Promise<{ success: boolean; error?: string }>
): AuthHandlers {
  return {
    login: async (username: string, password: string) => {
      try {
        logAuth(LOG_AUTH_CALLBACKS, 'log', prefix, '[onLogin] Login callback called:', { username });
        const result = await login(username, password);
        if (result.success) {
          logAuth(LOG_AUTH_CALLBACKS, 'log', prefix, '[onLogin] ✅ Login callback successful');
        } else {
          logAuth(LOG_AUTH_ERROR, 'error', prefix, '[onLogin] ❌ Login callback failed:', result.error);
        }
        return result.success;
      } catch (error) {
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[onLogin] ❌ Exception in login callback:', error);
        return false;
      }
    },

    signUp: async (userData: { alias: string; avatar: string; username: string; password: string }) => {
      try {
        logAuth(LOG_AUTH_CALLBACKS, 'log', prefix, '[onSignUp] Sign up callback called:', { 
          alias: userData.alias, 
          username: userData.username 
        });
        const result = await signUp(userData);
        if (result.success) {
          logAuth(LOG_AUTH_CALLBACKS, 'log', prefix, '[onSignUp] ✅ Sign up callback successful');
        } else {
          logAuth(LOG_AUTH_ERROR, 'error', prefix, '[onSignUp] ❌ Sign up callback failed:', result.error);
        }
        return result.success;
      } catch (error) {
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[onSignUp] ❌ Exception in sign up callback:', error);
        return false;
      }
    },

    facebookLogin: async () => {
      try {
        logAuth(LOG_AUTH_CALLBACKS, 'log', prefix, '[onFacebookLogin] Facebook login callback called');
        const result = await loginWithFacebook();
        if (result.success) {
          logAuth(LOG_AUTH_CALLBACKS, 'log', prefix, '[onFacebookLogin] ✅ Facebook login callback successful');
        } else {
          logAuth(LOG_AUTH_ERROR, 'error', prefix, '[onFacebookLogin] ❌ Facebook login callback failed:', result.error);
        }
        return result.success;
      } catch (error) {
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[onFacebookLogin] ❌ Exception in Facebook login callback:', error);
        return false;
      }
    },

    googleLogin: async () => {
      try {
        logAuth(LOG_AUTH_CALLBACKS, 'log', prefix, '[onGoogleLogin] Google login callback called');
        const result = await loginWithGoogle();
        if (result.success) {
          logAuth(LOG_AUTH_CALLBACKS, 'log', prefix, '[onGoogleLogin] ✅ Google login callback successful');
        } else {
          logAuth(LOG_AUTH_ERROR, 'error', prefix, '[onGoogleLogin] ❌ Google login callback failed:', result.error);
        }
        return result.success;
      } catch (error) {
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[onGoogleLogin] ❌ Exception in Google login callback:', error);
        return false;
      }
    },

    guestLogin: async () => {
      try {
        logAuth(LOG_AUTH_CALLBACKS, 'log', prefix, '[onGuestLogin] Guest login callback called');
        const result = await loginAsGuest();
        if (result.success) {
          logAuth(LOG_AUTH_CALLBACKS, 'log', prefix, '[onGuestLogin] ✅ Guest login callback successful');
        } else {
          logAuth(LOG_AUTH_ERROR, 'error', prefix, '[onGuestLogin] ❌ Guest login callback failed:', result.error);
        }
        return result.success;
      } catch (error) {
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[onGuestLogin] ❌ Exception in Guest login callback:', error);
        return false;
      }
    },
  };
}

