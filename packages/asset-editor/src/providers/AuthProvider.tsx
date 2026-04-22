import React, { useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
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
  const [user, setUser] = useState<EditorUser | null>(e2eBypassAuth ? E2E_BYPASS_USER : null);
  const [isLoading, setIsLoading] = useState(() => {
    if (e2eBypassAuth) return false;
    if (!auth) return false;
    return true;
  });
  const timedOutRef = React.useRef(false);

  // Sync E2E bypass user during render if enabled
  if (e2eBypassAuth && user?.uid !== E2E_BYPASS_USER.uid) {
    setUser(E2E_BYPASS_USER);
    if (isLoading) setIsLoading(false);
  }

  useEffect(() => {
    if (e2eBypassAuth || !auth) {
      if (!auth && !e2eBypassAuth) {
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
  }, [e2eBypassAuth]);

  useEffect(() => {
    if (!auth) return;
    
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
  }, []);

  const login = async (email: string, password: string) => {
    if (e2eBypassAuth) {
      setUser(E2E_BYPASS_USER);
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
      return { success: true };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      logError('[Auth] loginWithGoogle failed', { error: msg, tauri });
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    if (e2eBypassAuth) {
      setUser(E2E_BYPASS_USER);
      return;
    }
    if (auth) await signOut(auth);
    setUser(null);
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
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
