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
    // If Firebase isn't configured, skip auth state listening
    if (!auth) {
      setLoading(false);
      return;
    }
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        setIsAuthenticated(true);
        // User is signed in, get their profile data
        // For now, we'll set a basic user object
        // In a real implementation, you'd fetch the full profile from Firestore
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
      } else {
        // User is signed out
        setIsAuthenticated(false);
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // If Firebase isn't configured, use simulated auth
    if (!auth) {
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
      return { success: true };
    }
    
    // For email/password login, we need the actual email
    // In a real implementation, you'd have a separate email field
    // For now, we'll assume the username is the email
    const result: AuthResult = await loginUser(username, password);
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
    }
    
    return { success: result.success, error: result.error };
  };

  const signUp = async (userData: { alias: string; avatar: string; username: string; password: string }): Promise<{ success: boolean; error?: string }> => {
    // If Firebase isn't configured, use simulated auth
    if (!auth) {
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
      return { success: true };
    }
    
    // For sign up, we need an email address
    // In a real implementation, you'd collect the email separately
    // For now, we'll use the username as the email
    const result: AuthResult = await registerUser(
      userData.username, // Using username as email for now
      userData.password,
      userData.alias
    );
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
    }
    
    return { success: result.success, error: result.error };
  };

  const logout = async () => {
    // If Firebase isn't configured, use simulated logout
    if (!auth) {
      setIsAuthenticated(false);
      setUser(null);
      return { success: true };
    }
    
    const result = await logoutUser();
    if (result.success) {
      setIsAuthenticated(false);
      setUser(null);
    }
    return result;
  };

  const loginWithFacebookAuth = async (): Promise<{ success: boolean; error?: string }> => {
    // If Firebase isn't configured, use simulated auth
    if (!auth) {
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
      return { success: true };
    }
    
    const result: AuthResult = await loginWithFacebook();
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
    }
    
    return { success: result.success, error: result.error };
  };

  const loginWithGoogleAuth = async (): Promise<{ success: boolean; error?: string }> => {
    // If Firebase isn't configured, use simulated auth
    if (!auth) {
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
      return { success: true };
    }
    
    const result: AuthResult = await loginWithGoogle();
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
    }
    
    return { success: result.success, error: result.error };
  };

  const loginAsGuestAuth = async (): Promise<{ success: boolean; error?: string }> => {
    // If Firebase isn't configured, use simulated auth
    if (!auth) {
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
      return { success: true };
    }
    
    const result: AuthResult = await loginAsGuest();
    
    if (result.success && result.user) {
      setIsAuthenticated(true);
      setUser(result.user);
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