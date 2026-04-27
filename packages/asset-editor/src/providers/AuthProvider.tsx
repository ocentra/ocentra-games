import React, { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signOut,
  onIdTokenChanged,
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from '@/firebase/config';
import { isTauri } from '@/adapters/assets/TauriAssetAdapter';
import { NetworkRouter } from '@/adapters/network/NetworkRouter';
import { signInWithGoogleNative } from '@/adapters/auth/GoogleOAuthTauri';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { isE2EBypassAuthEnabled } from '@/utils/e2eAuth';
import {
  DEV_MOCK_ADMIN_USER,
  isDevMockAdminEnabled,
  setDevAuthQueryEnabled,
} from '@/utils/devAuth';
import type { EditorUser } from '@/types/auth';

const log = AssetEditorLogger.instance;
log.register(import.meta.url);
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = true) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled: boolean = true) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const LOG_AUTH_LOADING = true;

import { AuthContext } from './AuthContext';



async function fetchIsAdmin(firebaseUser: FirebaseUser): Promise<boolean> {
  if (!db) return false;
  try {
    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
    if (!userDoc.exists()) return false;
    return userDoc.data()?.isAdmin === true;
  } catch {
    return false;
  }
}

function toEditorUser(firebaseUser: FirebaseUser, isAdmin: boolean): EditorUser {
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    isAdmin,
  };
}

const AUTH_LOADING_TIMEOUT_MS = 1500;
const E2E_BYPASS_USER: EditorUser = {
  uid: 'asset-editor-e2e-user',
  email: 'asset-editor-e2e@ocentra.local',
  displayName: 'Asset Editor E2E',
  photoURL: null,
  isAdmin: true,
};

function safeLog(fn: () => void): void {
  try {
    fn();
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const e2eBypassAuth = isE2EBypassAuthEnabled();
  const devMockAdmin = isDevMockAdminEnabled();
  const [user, setUser] = useState<EditorUser | null>(
    e2eBypassAuth ? E2E_BYPASS_USER : devMockAdmin ? DEV_MOCK_ADMIN_USER : null,
  );
  const [isLoading, setIsLoading] = useState(() => {
    if (e2eBypassAuth || devMockAdmin) return false;
    if (!auth) return false;
    return true;
  });
  const timedOutRef = React.useRef(false);

  // Check if we've explicitly logged out in this session to prevent auto-login loops
  const [hasExplicitlyLoggedOut, setHasExplicitlyLoggedOut] = useState(() => {
    return sessionStorage.getItem('ocentra-editor-explicit-logout') === 'true';
  });

  const shouldAutoLoginMock = (e2eBypassAuth || devMockAdmin) && !hasExplicitlyLoggedOut;

  // Sync E2E bypass user during render if enabled and not logged out
  if (shouldAutoLoginMock && user?.uid !== (e2eBypassAuth ? E2E_BYPASS_USER.uid : DEV_MOCK_ADMIN_USER.uid)) {
    setUser(e2eBypassAuth ? E2E_BYPASS_USER : DEV_MOCK_ADMIN_USER);
    if (isLoading) setIsLoading(false);
  }

  useEffect(() => {
    if (e2eBypassAuth || devMockAdmin || !auth) {
      if (!auth && !e2eBypassAuth && !devMockAdmin) {
        safeLog(() => logInfo('[Auth] AuthProvider mount, Firebase not configured', undefined, LOG_AUTH_LOADING));
      }
      return;
    }

    safeLog(() => logInfo('[Auth] AuthProvider mount, subscribing to onAuthStateChanged', { timeoutMs: AUTH_LOADING_TIMEOUT_MS }, LOG_AUTH_LOADING));
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      safeLog(() => logInfo('[Auth] onAuthStateChanged fired', { hasUser: !!firebaseUser, uid: firebaseUser?.uid ?? null }, LOG_AUTH_LOADING));
      if (firebaseUser) {
        const isAdmin = await fetchIsAdmin(firebaseUser);
        safeLog(() => logInfo('[Auth] fetchIsAdmin done', { isAdmin }, LOG_AUTH_LOADING));
        setUser(toEditorUser(firebaseUser, isAdmin));
      } else {
        setUser(null);
      }
      safeLog(() => logInfo('[Auth] setting isLoading=false from onAuthStateChanged', undefined, LOG_AUTH_LOADING));
      setIsLoading(false);
    });
    const timeoutId = setTimeout(() => {
      timedOutRef.current = true;
      setIsLoading(false);
      safeLog(() => logInfo('[Auth] timeout fired, forcing isLoading=false', { afterMs: AUTH_LOADING_TIMEOUT_MS }, LOG_AUTH_LOADING));
    }, AUTH_LOADING_TIMEOUT_MS);
    return () => {
      safeLog(() => logInfo('[Auth] AuthProvider cleanup', undefined, LOG_AUTH_LOADING));
      unsubscribe();
      clearTimeout(timeoutId);
    };
  }, [devMockAdmin, e2eBypassAuth]);

  useEffect(() => {
    if (devMockAdmin || !auth) return;
    
    const unsubscribeToken = onIdTokenChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          NetworkRouter.setAuthToken(token);
        } catch (error) {
          logError('[Auth] Failed to get ID token', error);
          NetworkRouter.setAuthToken(null);
        }
      } else {
        NetworkRouter.setAuthToken(null);
      }
    });
    
    return () => unsubscribeToken();
  }, [devMockAdmin]);

  const login = async (email: string, password: string) => {
    if (e2eBypassAuth || devMockAdmin) {
      sessionStorage.removeItem('ocentra-editor-explicit-logout');
      setHasExplicitlyLoggedOut(false);
      setUser(e2eBypassAuth ? E2E_BYPASS_USER : DEV_MOCK_ADMIN_USER);
      return { success: true };
    }
    if (!auth) {
      return { success: false, error: 'Firebase not configured. Add VITE_FIREBASE_* to .env.' };
    }
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Login failed' };
    }
  };

  const loginWithGoogle = async () => {
    if (e2eBypassAuth) {
      setUser(E2E_BYPASS_USER);
      return { success: true };
    }
    if (devMockAdmin) {
      setUser(DEV_MOCK_ADMIN_USER);
      return { success: true };
    }
    if (!auth) {
      return { success: false, error: 'Firebase not configured. Add VITE_FIREBASE_* to .env.' };
    }
    const tauri = isTauri();
    logInfo('[Auth] loginWithGoogle started', { tauri });
    try {
      if (tauri) {
        logInfo('[Auth] Tauri: desktop OAuth (local server + system browser)');
        const idToken = await signInWithGoogleNative();
        logInfo('[Auth] Tauri: got id_token, signing in with credential');
        await signInWithCredential(auth, GoogleAuthProvider.credential(idToken));
        logInfo('[Auth] Tauri: signInWithCredential success');
      } else {
        logInfo('[Auth] Web: standard OAuth popup (same as main app)');
        await signInWithPopup(auth, new GoogleAuthProvider());
        logInfo('[Auth] Web: signInWithPopup success');
      }
      sessionStorage.removeItem('ocentra-editor-explicit-logout');
      setHasExplicitlyLoggedOut(false);
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('[Auth] loginWithGoogle failed', { error: msg, tauri });
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    logInfo('[Auth] Logout initiated');
    sessionStorage.setItem('ocentra-editor-explicit-logout', 'true');
    setHasExplicitlyLoggedOut(true);
    
    if (devMockAdmin) {
      logInfo('[Auth] Mock mode: disabling dev auth query');
      setDevAuthQueryEnabled(false);
    }
    
    if (auth) {
      logInfo('[Auth] Firebase: signing out');
      await signOut(auth);
    }
    
    logInfo('[Auth] Logout complete, clearing user state');
    setUser(null);
  };

  const sendPasswordReset = async (email: string) => {
    if (e2eBypassAuth || devMockAdmin) {
      return { success: false, error: 'Password reset is not available in mock sessions.' };
    }
    if (!auth) {
      return { success: false, error: 'Firebase not configured. Add VITE_FIREBASE_* to .env.' };
    }
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Password reset failed' };
    }
  };

  logInfo('[Auth] AuthProvider render', { isLoading, hasUser: !!user, isAuthenticated: !!user, isAdmin: user?.isAdmin ?? false }, LOG_AUTH_LOADING);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin: user?.isAdmin ?? false,
        isLoading,
        isFirebaseConfigured: isFirebaseConfigured(),
        login,
        loginWithGoogle,
        sendPasswordReset,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
