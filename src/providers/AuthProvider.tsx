import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/adapters/firebase/config';
import { FirestoreCollection } from '@ocentra/boundary-domain/constants/firestore-collections';
import type { AuthResult, UserProfile } from '@/adapters/firebase/service';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { createGuestDisplayName, isGuestIdentity } from '@/lib/auth/guestIdentity';
import LoginDialog from '@/ui/components/Auth/LoginDialog';

const log = MainAppLogger.instance;
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_AUTH_FLOW = false;
const LOG_AUTH_STATE = false;
const LOG_AUTH_LOGIN = false;
const LOG_AUTH_SIGNUP = false;
const LOG_AUTH_LOGOUT = false;
const LOG_AUTH_SOCIAL = false;
const LOG_AUTH_GUEST = false;
const LOG_AUTH_ERROR = false;

export type AuthKind = 'signedOut' | 'guest' | 'account' | 'admin';
export type AuthRequirement = 'session' | 'account' | 'admin';

interface AuthPromptState {
  requirement: AuthRequirement;
}

interface AuthPromptContent {
  eyebrow: string;
  title: string;
  description: string;
  tone?: 'default' | 'warning';
}

function doesUserSatisfyRequirement(
  requirement: AuthRequirement,
  candidateUser: UserProfile | null
): candidateUser is UserProfile {
  if (!candidateUser) {
    return false;
  }

  if (requirement === 'session') {
    return true;
  }

  if (requirement === 'account') {
    return candidateUser.isGuest !== true;
  }

  return candidateUser.isAdmin === true;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  authKind: AuthKind;
  hasSession: boolean;
  hasAccount: boolean;
  isGuest: boolean;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loginWithFacebook: () => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => Promise<{ success: boolean; error?: string }>;
  loginWithWallet: (walletPublicKey: string, signature: Uint8Array, message: Uint8Array) => Promise<{ success: boolean; error?: string }>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
  updateUserProfile: (updates: { displayName?: string; photoURL?: string }) => Promise<{ success: boolean; error?: string }>;
  updateUserStats: (stats: Partial<{
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    eloRating: number;
    achievements: string[];
  }>) => Promise<{ success: boolean; error?: string }>;
  requireSession: () => Promise<UserProfile | null>;
  requireAccount: () => Promise<UserProfile | null>;
  requireAdmin: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authPrompt, setAuthPrompt] = useState<AuthPromptState | null>(null);
  const authPromptResolverRef = useRef<((nextUser: UserProfile | null) => void) | null>(null);
  const authPromptPromiseRef = useRef<Promise<UserProfile | null> | null>(null);

  const hasSession = Boolean(user);
  const isGuest = user?.isGuest === true;
  const hasAccount = Boolean(user) && !isGuest;
  const isAdmin = user?.isAdmin === true;
  const authKind: AuthKind = isAdmin
    ? 'admin'
    : hasAccount
      ? 'account'
      : isGuest
        ? 'guest'
        : 'signedOut';

  const resolveAuthPrompt = useCallback((nextUser: UserProfile | null) => {
    authPromptResolverRef.current?.(nextUser);
    authPromptResolverRef.current = null;
    authPromptPromiseRef.current = null;
    setAuthPrompt(null);
  }, []);

  const requestAuthRequirement = useCallback((requirement: AuthRequirement): Promise<UserProfile | null> => {
    if (doesUserSatisfyRequirement(requirement, user)) {
      return Promise.resolve(user);
    }

    if (authPromptPromiseRef.current) {
      return authPromptPromiseRef.current;
    }

    const pendingPrompt = new Promise<UserProfile | null>((resolve) => {
      authPromptResolverRef.current = resolve;
      setAuthPrompt({ requirement });
    });

    authPromptPromiseRef.current = pendingPrompt;
    return pendingPrompt;
  }, [user]);

  const requireSession = useCallback(() => requestAuthRequirement('session'), [requestAuthRequirement]);
  const requireAccount = useCallback(() => requestAuthRequirement('account'), [requestAuthRequirement]);
  const requireAdmin = useCallback(() => requestAuthRequirement('admin'), [requestAuthRequirement]);

  const closeAuthPrompt = useCallback(() => {
    resolveAuthPrompt(null);
  }, [resolveAuthPrompt]);

  useEffect(() => {
    if (!authPrompt) {
      return;
    }

    if (doesUserSatisfyRequirement(authPrompt.requirement, user)) {
      resolveAuthPrompt(user);
    }
  }, [authPrompt, resolveAuthPrompt, user]);

  const authPromptContent = useMemo<AuthPromptContent | null>(() => {
    if (!authPrompt) {
      return null;
    }

    if (authPrompt.requirement === 'session') {
      return {
        eyebrow: 'Quick multiplayer access',
        title: 'Start a session to continue',
        description: 'Create a guest session or sign in to join multiplayer queues, rooms, and live game features.',
      };
    }

    if (authPrompt.requirement === 'account') {
      return {
        eyebrow: 'Real account required',
        title: user?.isGuest
          ? 'Upgrade your guest session'
          : 'Sign in with a real account',
        description: user?.isGuest
          ? 'This feature stores account-owned progress, purchases, or identity, so guest access stops here.'
          : 'This feature stores account-owned progress, purchases, or identity, so guest access is not available here.',
      };
    }

    return {
      eyebrow: 'Restricted area',
      title: 'Administrator access required',
      description: 'This feature is limited to administrator accounts. Sign in with an approved admin profile to continue.',
      tone: 'warning',
    };
  }, [authPrompt, user?.isGuest]);

  useEffect(() => {
    logInfo('[useEffect] Setting up auth state listener...', LOG_AUTH_STATE);

    if (!auth || !db) {
      logInfo('[useEffect] ⚠️ Firebase not configured, skipping auth state listener', LOG_AUTH_FLOW);
      setLoading(false);
      return;
    }
    
    logInfo('[useEffect] ✅ Firebase auth available, checking for redirect result...', LOG_AUTH_STATE);

    void (async () => {
      const { handleRedirectResult } = await import('@/adapters/firebase/service');
      handleRedirectResult().then((redirectResult) => {
        if (redirectResult.success && redirectResult.user) {
          logInfo('[useEffect] ✅ Redirect result handled, user:', { data: redirectResult.user.displayName }, LOG_AUTH_FLOW);
          setIsAuthenticated(true);
          setUser(redirectResult.user);
          setLoading(false);
        } else {
          logInfo('[useEffect] No redirect result (normal if not returning from OAuth)', LOG_AUTH_FLOW);
        }
      }).catch((error) => {
        logError('[useEffect] ❌ Error checking redirect result:', { data: error }, LOG_AUTH_ERROR);
      });
    })();

    logInfo('[useEffect] Setting up onAuthStateChanged listener', LOG_AUTH_STATE);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      logInfo('[onAuthStateChanged] Auth state changed:', { 
        data: { 
        hasUser: !!firebaseUser, 
        uid: firebaseUser?.uid,
        email: firebaseUser?.email 
        }
      }, LOG_AUTH_STATE);

      if (firebaseUser) {
        setIsAuthenticated(true);
        logInfo('[onAuthStateChanged] User signed in:', { 
          data: { 
          uid: firebaseUser.uid, 
          email: firebaseUser.email,
          displayName: firebaseUser.displayName 
          }
        }, LOG_AUTH_STATE);
        
        logInfo('[onAuthStateChanged] Fetching user profile from Firestore', LOG_AUTH_FLOW);
        
        try {
          if (db && auth) {
            if (auth.currentUser?.uid !== firebaseUser.uid) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            await firebaseUser.getIdToken(true);
            
            if (auth.currentUser?.uid !== firebaseUser.uid) {
              throw new Error(`Auth mismatch: auth.currentUser.uid (${auth.currentUser?.uid}) !== firebaseUser.uid (${firebaseUser.uid})`);
            }
            
            const userDoc = await getDoc(doc(db, FirestoreCollection.Users, firebaseUser.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              const isGuestProfile = firebaseUser.isAnonymous || userData.isGuest === true || isGuestIdentity(userData);
              const userProfile: UserProfile = {
                ...userData,
                uid: firebaseUser.uid,
                isGuest: isGuestProfile,
              };
              setUser(userProfile);
              logInfo('[onAuthStateChanged] ✅ User profile loaded from Firestore:', {
                data: {
                uid: userProfile.uid,
                displayName: userProfile.displayName,
                email: userProfile.email,
                isAdmin: userProfile.isAdmin
                }
              }, LOG_AUTH_STATE);
            } else {
              logInfo('[onAuthStateChanged] ⚠️ User profile not found in Firestore, creating basic profile', LOG_AUTH_FLOW);
              setUser({
                uid: firebaseUser.uid,
                displayName: firebaseUser.isAnonymous
                  ? createGuestDisplayName(firebaseUser.uid)
                  : firebaseUser.displayName || 'Anonymous',
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || '',
                createdAt: new Date(),
                lastLoginAt: new Date(),
                gamesPlayed: 0,
                wins: 0,
                losses: 0,
                winRate: 0,
                eloRating: 1200,
                achievements: [],
                isGuest: firebaseUser.isAnonymous,
              });
            }
          } else {
            setUser({
              uid: firebaseUser.uid,
              displayName: firebaseUser.isAnonymous
                ? createGuestDisplayName(firebaseUser.uid)
                : firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email || '',
              photoURL: firebaseUser.photoURL || '',
              createdAt: new Date(),
              lastLoginAt: new Date(),
              gamesPlayed: 0,
              wins: 0,
              losses: 0,
              winRate: 0,
              eloRating: 1200,
              achievements: [],
              isGuest: firebaseUser.isAnonymous,
            });
          }
        } catch (error) {
          logError('[onAuthStateChanged] ❌ Error fetching user profile:', { data: error }, LOG_AUTH_ERROR);
          const fallbackProfile = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.isAnonymous
              ? createGuestDisplayName(firebaseUser.uid)
              : firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            photoURL: firebaseUser.photoURL || '',
            createdAt: new Date(),
            lastLoginAt: new Date(),
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            eloRating: 1200,
            achievements: [],
            isGuest: firebaseUser.isAnonymous,
          };
          setUser(fallbackProfile);
        }
        
        logInfo('[onAuthStateChanged] ✅ User state set, isAuthenticated = true', LOG_AUTH_STATE);
      } else {
        logInfo('[onAuthStateChanged] User signed out', LOG_AUTH_STATE);
        setIsAuthenticated(false);
        setUser(null);
        logInfo('[onAuthStateChanged] ✅ User state cleared, isAuthenticated = false', LOG_AUTH_STATE);
      }
      setLoading(false);
      logInfo('[onAuthStateChanged] Loading state set to false', LOG_AUTH_STATE);
    });

    return () => {
      logInfo('[useEffect] Cleaning up auth state listener', LOG_AUTH_STATE);
      unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    logInfo('[login] Starting login:', { data: { username } }, LOG_AUTH_LOGIN);

    if (!auth) {
      logInfo('[login] ⚠️ Firebase not configured, using simulated auth', LOG_AUTH_FLOW);
      setIsAuthenticated(true);
      setUser({
        uid: 'simulated-user',
        displayName: username,
        email: `${username}@example.com`,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eloRating: 1200,
        achievements: []
      });
      logInfo('[login] ✅ Simulated login successful', LOG_AUTH_LOGIN);
      return { success: true };
    }
    
    logInfo('[login] Calling loginUser (assuming username is email)', LOG_AUTH_FLOW);
    const { loginUser } = await import('@/adapters/firebase/service');
    const result: AuthResult = await loginUser(username, password);
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      logInfo('[login] ✅ Login successful, user state updated:', { 
        data: { 
        uid: result.user.uid, 
        displayName: result.user.displayName 
        },
      }, LOG_AUTH_LOGIN);
    } else {
      logError('[login] ❌ Login failed:', { data: result.error }, LOG_AUTH_ERROR);
    }
    
    return { success: result.success, error: result.error };
  };

  const signUp = async (userData: { alias: string; avatar: string; username: string; password: string }): Promise<{ success: boolean; error?: string }> => {
    logInfo('[signUp] Starting sign up:', { 
      data: { 
      alias: userData.alias, 
      username: userData.username,
      hasAvatar: !!userData.avatar 
      },
    }, LOG_AUTH_SIGNUP);

    if (!auth) {
      logInfo('[signUp] ⚠️ Firebase not configured, using simulated auth', LOG_AUTH_FLOW);
      setIsAuthenticated(true);
      setUser({
        uid: 'simulated-user',
        displayName: userData.alias,
        email: `${userData.username}@example.com`,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eloRating: 1200,
        achievements: []
      });
      logInfo('[signUp] ✅ Simulated sign up successful', LOG_AUTH_SIGNUP);
      return { success: true };
    }
    
    logInfo('[signUp] Calling registerUser (using username as email, avatar not saved)', LOG_AUTH_FLOW);
    const { registerUser } = await import('@/adapters/firebase/service');
    const result: AuthResult = await registerUser(
      userData.username,
      userData.password,
      userData.alias,
      userData.avatar
    );
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      logInfo('[signUp] ✅ Sign up successful, user state updated:', { 
        data: { 
        uid: result.user.uid, 
        displayName: result.user.displayName 
        },
      }, LOG_AUTH_SIGNUP);
    } else {
      logError('[signUp] ❌ Sign up failed:', { data: result.error }, LOG_AUTH_ERROR);
    }
    
    return { success: result.success, error: result.error };
  };

  const logout = async () => {
    logInfo('[logout] Starting logout...', LOG_AUTH_LOGOUT);

    if (!auth) {
      logInfo('[logout] ⚠️ Firebase not configured, using simulated logout', LOG_AUTH_FLOW);
      setIsAuthenticated(false);
      setUser(null);
      logInfo('[logout] ✅ Simulated logout successful', LOG_AUTH_LOGOUT);
      return { success: true };
    }
    
    const { logoutUser } = await import('@/adapters/firebase/service');
    const result = await logoutUser();
    if (result.success) {
      setIsAuthenticated(false);
      setUser(null);
      logInfo('[logout] ✅ Logout successful, user state cleared', LOG_AUTH_LOGOUT);
    } else {
      logError('[logout] ❌ Logout failed:', { data: result.error }, LOG_AUTH_ERROR);
    }
    return result;
  };

  const loginWithFacebookAuth = async (): Promise<{ success: boolean; error?: string }> => {
    logInfo('[loginWithFacebook] Starting Facebook login...', LOG_AUTH_SOCIAL);

    if (!auth) {
      logInfo('[loginWithFacebook] ⚠️ Firebase not configured, using simulated auth', LOG_AUTH_FLOW);
      // Simulate successful Facebook login
      setIsAuthenticated(true);
      setUser({
        uid: 'simulated-facebook-user',
        displayName: 'Facebook User',
        email: 'facebook@example.com',
        photoURL: '',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eloRating: 1200,
        achievements: []
      });
      logInfo('[loginWithFacebook] ✅ Simulated Facebook login successful', LOG_AUTH_SOCIAL);
      return { success: true };
    }
    
    const { loginWithFacebook } = await import('@/adapters/firebase/service');
    const result: AuthResult = await loginWithFacebook();
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      logInfo('[loginWithFacebook] ✅ Facebook login successful, user state updated', LOG_AUTH_SOCIAL);
    } else {
      logError('[loginWithFacebook] ❌ Facebook login failed:', { data: result.error }, LOG_AUTH_ERROR);
    }
    
    return { success: result.success, error: result.error };
  };

  const loginWithGoogleAuth = async (): Promise<{ success: boolean; error?: string }> => {
    logInfo('[loginWithGoogle] Starting Google login...', LOG_AUTH_SOCIAL);

    if (!auth) {
      logInfo('[loginWithGoogle] ⚠️ Firebase auth not yet ready, waiting for initialization...', LOG_AUTH_FLOW);
      const { waitForAuthResolution } = await import('@/adapters/firebase/config');
      await waitForAuthResolution();
      if (!auth) {
        logError('[loginWithGoogle] ❌ Firebase auth not configured', LOG_AUTH_ERROR);
        return { success: false, error: 'Firebase is not configured. Please check your .env settings.' };
      }
    }
    
    const { loginWithGoogle } = await import('@/adapters/firebase/service');
    const result: AuthResult = await loginWithGoogle();
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      logInfo('[loginWithGoogle] ✅ Google login successful, user state updated', LOG_AUTH_SOCIAL);
    } else {
      logError('[loginWithGoogle] ❌ Google login failed:', { data: result.error }, LOG_AUTH_ERROR);
    }
    
    return { success: result.success, error: result.error };
  };


  const loginAsGuestAuth = async (): Promise<{ success: boolean; error?: string }> => {
    logInfo('[loginAsGuest] Starting guest login...', LOG_AUTH_GUEST);

    if (!auth) {
      logInfo('[loginAsGuest] ⚠️ Firebase not configured, using simulated auth', LOG_AUTH_FLOW);
      // Simulate successful guest login
      setIsAuthenticated(true);
      setUser({
        uid: 'simulated-guest-user',
        displayName: createGuestDisplayName('simulated-guest-user'),
        email: '',
        photoURL: '',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eloRating: 1200,
        achievements: [],
        isGuest: true,
      });
      logInfo('[loginAsGuest] ✅ Simulated guest login successful', LOG_AUTH_GUEST);
      return { success: true };
    }
    
    const { loginAsGuest } = await import('@/adapters/firebase/service');
    const result: AuthResult = await loginAsGuest();
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      logInfo('[loginAsGuest] ✅ Guest login successful, user state updated:', { 
        data: { 
        uid: result.user.uid, 
        displayName: result.user.displayName 
        },
      }, LOG_AUTH_GUEST);
    } else {
      logError('[loginAsGuest] ❌ Guest login failed:', { data: result.error }, LOG_AUTH_ERROR);
    }
    
    return { success: result.success, error: result.error };
  };

  const loginWithWalletAuth = async (
    walletPublicKey: string,
    signature: Uint8Array,
    message: Uint8Array
  ): Promise<{ success: boolean; error?: string }> => {
    logInfo('[loginWithWallet] Starting wallet login...', { data: { walletPublicKey } }, LOG_AUTH_SOCIAL);

    if (!auth) {
      logInfo('[loginWithWallet] ⚠️ Firebase not configured, using simulated auth', LOG_AUTH_FLOW);
      // Simulate successful wallet login
      setIsAuthenticated(true);
      setUser({
        uid: 'simulated-wallet-user',
        displayName: `Wallet-${walletPublicKey.substring(0, 8)}`,
        email: '',
        photoURL: '',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eloRating: 1200,
        achievements: [],
        walletAddress: walletPublicKey
      });
      logInfo('[loginWithWallet] ✅ Simulated wallet login successful', LOG_AUTH_SOCIAL);
      return { success: true };
    }
    
    const { loginWithWallet } = await import('@/adapters/firebase/service');
    const result: AuthResult = await loginWithWallet(walletPublicKey, signature, message);
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      logInfo('[loginWithWallet] ✅ Wallet login successful, user state updated:', { 
        data: { 
        uid: result.user.uid, 
        walletAddress: walletPublicKey 
        },
      }, LOG_AUTH_SOCIAL);
    } else {
      logError('[loginWithWallet] ❌ Wallet login failed:', { data: result.error }, LOG_AUTH_ERROR);
    }
    
    return { success: result.success, error: result.error };
  };

  const updateCurrentUserStats = async (stats: Partial<{
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    eloRating: number;
    achievements: string[];
  }>) => {
    // If Firebase isn't configured, simulate success
    if (!auth) {
      return { success: true };
    }
    
    if (user) {
      const { updateUserStats } = await import('@/adapters/firebase/service');
      return updateUserStats(user.uid, stats);
    } else {
      return { success: false, error: 'User not authenticated' };
    }
  };

  const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
    logInfo('[sendPasswordResetEmail] Starting password reset:', { data: { email } }, LOG_AUTH_FLOW);

    if (!auth) {
      logInfo('[sendPasswordResetEmail] ⚠️ Firebase not configured', LOG_AUTH_FLOW);
      return { success: false, error: 'Firebase not configured' };
    }

    const { sendPasswordReset } = await import('@/adapters/firebase/service');
    const result = await sendPasswordReset(email);
    if (result.success) {
      logInfo('[sendPasswordResetEmail] ✅ Password reset email sent', LOG_AUTH_FLOW);
    } else {
      logError('[sendPasswordResetEmail] ❌ Password reset failed:', { data: result.error }, LOG_AUTH_FLOW);
    }
    return result;
  };

  const updateProfile = async (updates: { displayName?: string; photoURL?: string }): Promise<{ success: boolean; error?: string }> => {
    logInfo('[updateProfile] Starting profile update:', { data: updates }, LOG_AUTH_FLOW);

    if (!auth || !user) {
      logInfo('[updateProfile] ⚠️ Firebase not configured or user not logged in', LOG_AUTH_FLOW);
      return { success: false, error: 'User not authenticated' };
    }

    const { updateUserProfile } = await import('@/adapters/firebase/service');
    const result = await updateUserProfile(user.uid, updates);
    if (result.success) {
      setUser({
        ...user,
        displayName: updates.displayName || user.displayName,
        photoURL: updates.photoURL !== undefined ? updates.photoURL : user.photoURL
      });
      logInfo('[updateProfile] ✅ Profile updated, local state refreshed', LOG_AUTH_FLOW);
    } else {
      logError('[updateProfile] ❌ Profile update failed:', { data: result.error }, LOG_AUTH_ERROR);
    }
    return result;
  };

  const value = {
    isAuthenticated,
    user,
    authKind,
    hasSession,
    hasAccount,
    isGuest,
    isAdmin,
    login,
    signUp,
    logout,
    loginWithFacebook: loginWithFacebookAuth,
    loginWithGoogle: loginWithGoogleAuth,
    loginAsGuest: loginAsGuestAuth,
    loginWithWallet: loginWithWalletAuth,
    sendPasswordReset: sendPasswordResetEmail,
    updateUserProfile: updateProfile,
    updateUserStats: updateCurrentUserStats,
    requireSession,
    requireAccount,
    requireAdmin,
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
      {authPrompt ? (
        <LoginDialog
          onLogin={login}
          onSignUp={authPrompt.requirement === 'admin' ? undefined : signUp}
          onFacebookLogin={loginWithFacebookAuth}
          onGoogleLogin={loginWithGoogleAuth}
          onGuestLogin={loginAsGuestAuth}
          onWalletLogin={undefined}
          onSendPasswordReset={sendPasswordResetEmail}
          adminRequired={authPrompt.requirement === 'admin'}
          adminMessage="You need to be an administrator to continue. Please sign in with an admin account."
          contextEyebrow={authPromptContent?.eyebrow}
          contextTitle={authPromptContent?.title}
          contextDescription={authPromptContent?.description}
          contextTone={authPromptContent?.tone}
          onClose={closeAuthPrompt}
          disableGuestLogin={authPrompt.requirement !== 'session'}
          initialMode="signin"
        />
      ) : null}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
