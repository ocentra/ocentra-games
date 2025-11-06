import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import { 
  loginUser, 
  registerUser, 
  loginWithGoogle, 
  loginWithFacebook, 
  loginAsGuest, 
  logoutUser
} from '../services/firebaseService';
import type { AuthResult, UserProfile } from '../services/firebaseService';

const prefix = '[AuthProvider]';

// Auth flow logging flags
const LOG_AUTH_FLOW = false;        // Main auth flow tracking
const LOG_AUTH_STATE = false;       // Auth state changes
const LOG_AUTH_LOGIN = false;       // Login operations
const LOG_AUTH_SIGNUP = false;      // Sign up operations
const LOG_AUTH_LOGOUT = false;      // Logout operations
const LOG_AUTH_SOCIAL = false;      // Social login
const LOG_AUTH_GUEST = false;       // Guest login
const LOG_AUTH_ERROR = false;      // Error logging

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (userData: { alias: string; avatar: string; username: string; password: string }) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  loginWithFacebook: () => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  loginAsGuest: () => Promise<{ success: boolean; error?: string }>;
  updateUserStats: (stats: Partial<{
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    eloRating: number;
    achievements: string[];
  }>) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Listen for auth state changes
  useEffect(() => {
    if (LOG_AUTH_STATE) {
      console.log(prefix, '[useEffect] Setting up auth state listener...');
    }

    // If Firebase isn't configured, skip auth state listening
    if (!auth) {
      if (LOG_AUTH_FLOW) {
        console.log(prefix, '[useEffect] ⚠️ Firebase not configured, skipping auth state listener');
      }
      setLoading(false);
      return;
    }
    
    if (LOG_AUTH_STATE) {
      console.log(prefix, '[useEffect] ✅ Firebase auth available, setting up onAuthStateChanged listener');
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (LOG_AUTH_STATE) {
        console.log(prefix, '[onAuthStateChanged] Auth state changed:', { 
          hasUser: !!firebaseUser, 
          uid: firebaseUser?.uid,
          email: firebaseUser?.email 
        });
      }

      if (firebaseUser) {
        setIsAuthenticated(true);
        if (LOG_AUTH_STATE) {
          console.log(prefix, '[onAuthStateChanged] User signed in:', { 
            uid: firebaseUser.uid, 
            email: firebaseUser.email,
            displayName: firebaseUser.displayName 
          });
        }
        
        // User is signed in, get their profile data
        // For now, we'll set a basic user object
        // In a real implementation, you'd fetch the full profile from Firestore
        if (LOG_AUTH_FLOW) {
          console.log(prefix, '[onAuthStateChanged] ⚠️ Creating basic user object (should fetch from Firestore)');
        }
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName || 'Anonymous',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          eloRating: 1200,
          achievements: []
        });
        if (LOG_AUTH_STATE) {
          console.log(prefix, '[onAuthStateChanged] ✅ User state set, isAuthenticated = true');
        }
      } else {
        // User is signed out
        if (LOG_AUTH_STATE) {
          console.log(prefix, '[onAuthStateChanged] User signed out');
        }
        setIsAuthenticated(false);
        setUser(null);
        if (LOG_AUTH_STATE) {
          console.log(prefix, '[onAuthStateChanged] ✅ User state cleared, isAuthenticated = false');
        }
      }
      setLoading(false);
      if (LOG_AUTH_STATE) {
        console.log(prefix, '[onAuthStateChanged] Loading state set to false');
      }
    });

    // Cleanup subscription on unmount
    return () => {
      if (LOG_AUTH_STATE) {
        console.log(prefix, '[useEffect] Cleaning up auth state listener');
      }
      unsubscribe();
    };
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    if (LOG_AUTH_LOGIN) {
      console.log(prefix, '[login] Starting login:', { username });
    }

    // If Firebase isn't configured, use simulated auth
    if (!auth) {
      if (LOG_AUTH_FLOW) {
        console.log(prefix, '[login] ⚠️ Firebase not configured, using simulated auth');
      }
      // Simulate successful login
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
      if (LOG_AUTH_LOGIN) {
        console.log(prefix, '[login] ✅ Simulated login successful');
      }
      return { success: true };
    }
    
    // For email/password login, we need the actual email
    // In a real implementation, you'd have a separate email field
    // For now, we'll assume the username is the email
    if (LOG_AUTH_FLOW) {
      console.log(prefix, '[login] Calling loginUser (assuming username is email)');
    }
    const result: AuthResult = await loginUser(username, password);
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      if (LOG_AUTH_LOGIN) {
        console.log(prefix, '[login] ✅ Login successful, user state updated:', { 
          uid: result.user.uid, 
          displayName: result.user.displayName 
        });
      }
    } else {
      if (LOG_AUTH_ERROR) {
        console.error(prefix, '[login] ❌ Login failed:', result.error);
      }
    }
    
    return { success: result.success, error: result.error };
  };

  const signUp = async (userData: { alias: string; avatar: string; username: string; password: string }): Promise<{ success: boolean; error?: string }> => {
    if (LOG_AUTH_SIGNUP) {
      console.log(prefix, '[signUp] Starting sign up:', { 
        alias: userData.alias, 
        username: userData.username,
        hasAvatar: !!userData.avatar 
      });
    }

    // If Firebase isn't configured, use simulated auth
    if (!auth) {
      if (LOG_AUTH_FLOW) {
        console.log(prefix, '[signUp] ⚠️ Firebase not configured, using simulated auth');
      }
      // Simulate successful sign up
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
      if (LOG_AUTH_SIGNUP) {
        console.log(prefix, '[signUp] ✅ Simulated sign up successful');
      }
      return { success: true };
    }
    
    // For sign up, we need an email address
    // In a real implementation, you'd collect the email separately
    // For now, we'll use the username as the email
    if (LOG_AUTH_FLOW) {
      console.log(prefix, '[signUp] Calling registerUser (using username as email, avatar not saved)');
    }
    const result: AuthResult = await registerUser(
      userData.username, // Using username as email for now
      userData.password,
      userData.alias
    );
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      if (LOG_AUTH_SIGNUP) {
        console.log(prefix, '[signUp] ✅ Sign up successful, user state updated:', { 
          uid: result.user.uid, 
          displayName: result.user.displayName 
        });
      }
    } else {
      if (LOG_AUTH_ERROR) {
        console.error(prefix, '[signUp] ❌ Sign up failed:', result.error);
      }
    }
    
    return { success: result.success, error: result.error };
  };

  const logout = async () => {
    if (LOG_AUTH_LOGOUT) {
      console.log(prefix, '[logout] Starting logout...');
    }

    // If Firebase isn't configured, use simulated logout
    if (!auth) {
      if (LOG_AUTH_FLOW) {
        console.log(prefix, '[logout] ⚠️ Firebase not configured, using simulated logout');
      }
      setIsAuthenticated(false);
      setUser(null);
      if (LOG_AUTH_LOGOUT) {
        console.log(prefix, '[logout] ✅ Simulated logout successful');
      }
      return { success: true };
    }
    
    const result = await logoutUser();
    if (result.success) {
      setIsAuthenticated(false);
      setUser(null);
      if (LOG_AUTH_LOGOUT) {
        console.log(prefix, '[logout] ✅ Logout successful, user state cleared');
      }
    } else {
      if (LOG_AUTH_ERROR) {
        console.error(prefix, '[logout] ❌ Logout failed:', result.error);
      }
    }
    return result;
  };

  const loginWithFacebookAuth = async (): Promise<{ success: boolean; error?: string }> => {
    if (LOG_AUTH_SOCIAL) {
      console.log(prefix, '[loginWithFacebook] Starting Facebook login...');
    }

    // If Firebase isn't configured, use simulated auth
    if (!auth) {
      if (LOG_AUTH_FLOW) {
        console.log(prefix, '[loginWithFacebook] ⚠️ Firebase not configured, using simulated auth');
      }
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
      if (LOG_AUTH_SOCIAL) {
        console.log(prefix, '[loginWithFacebook] ✅ Simulated Facebook login successful');
      }
      return { success: true };
    }
    
    const result: AuthResult = await loginWithFacebook();
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      if (LOG_AUTH_SOCIAL) {
        console.log(prefix, '[loginWithFacebook] ✅ Facebook login successful, user state updated');
      }
    } else {
      if (LOG_AUTH_ERROR) {
        console.error(prefix, '[loginWithFacebook] ❌ Facebook login failed:', result.error);
      }
    }
    
    return { success: result.success, error: result.error };
  };

  const loginWithGoogleAuth = async (): Promise<{ success: boolean; error?: string }> => {
    if (LOG_AUTH_SOCIAL) {
      console.log(prefix, '[loginWithGoogle] Starting Google login...');
    }

    // If Firebase isn't configured, use simulated auth
    if (!auth) {
      if (LOG_AUTH_FLOW) {
        console.log(prefix, '[loginWithGoogle] ⚠️ Firebase not configured, using simulated auth');
      }
      // Simulate successful Google login
      setIsAuthenticated(true);
      setUser({
        uid: 'simulated-google-user',
        displayName: 'Google User',
        email: 'google@example.com',
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
      if (LOG_AUTH_SOCIAL) {
        console.log(prefix, '[loginWithGoogle] ✅ Simulated Google login successful');
      }
      return { success: true };
    }
    
    const result: AuthResult = await loginWithGoogle();
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      if (LOG_AUTH_SOCIAL) {
        console.log(prefix, '[loginWithGoogle] ✅ Google login successful, user state updated');
      }
    } else {
      if (LOG_AUTH_ERROR) {
        console.error(prefix, '[loginWithGoogle] ❌ Google login failed:', result.error);
      }
    }
    
    return { success: result.success, error: result.error };
  };

  const loginAsGuestAuth = async (): Promise<{ success: boolean; error?: string }> => {
    if (LOG_AUTH_GUEST) {
      console.log(prefix, '[loginAsGuest] Starting guest login...');
    }

    // If Firebase isn't configured, use simulated auth
    if (!auth) {
      if (LOG_AUTH_FLOW) {
        console.log(prefix, '[loginAsGuest] ⚠️ Firebase not configured, using simulated auth');
      }
      // Simulate successful guest login
      setIsAuthenticated(true);
      setUser({
        uid: 'simulated-guest-user',
        displayName: 'Guest',
        email: '',
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
      if (LOG_AUTH_GUEST) {
        console.log(prefix, '[loginAsGuest] ✅ Simulated guest login successful');
      }
      return { success: true };
    }
    
    const result: AuthResult = await loginAsGuest();
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
      if (LOG_AUTH_GUEST) {
        console.log(prefix, '[loginAsGuest] ✅ Guest login successful, user state updated:', { 
          uid: result.user.uid, 
          displayName: result.user.displayName 
        });
      }
    } else {
      if (LOG_AUTH_ERROR) {
        console.error(prefix, '[loginAsGuest] ❌ Guest login failed:', result.error);
      }
    }
    
    return { success: result.success, error: result.error };
  };

  // Wrapper for updateUserStats that uses the current user's UID
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
      // Import updateUserStats here to avoid circular dependency issues
      const { updateUserStats } = await import('../services/firebaseService');
      return updateUserStats(user.uid, stats);
    } else {
      return { success: false, error: 'User not authenticated' };
    }
  };

  const value = {
    isAuthenticated,
    user,
    login,
    signUp,
    logout,
    loginWithFacebook: loginWithFacebookAuth,
    loginWithGoogle: loginWithGoogleAuth,
    loginAsGuest: loginAsGuestAuth,
    updateUserStats: updateCurrentUserStats
  };

  // Show loading state while checking auth status
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
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