import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithRedirect, 
  signInWithPopup,
  signOut, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  updateProfile,
  signInAnonymously,
  getRedirectResult,
  sendPasswordResetEmail,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import type { User as FirebaseUser, UserCredential as FirebaseUserCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@config/firebase';
import { logAuth } from '@lib/logging';

const prefix = '[FirebaseService]';

// Auth flow logging flags
const LOG_AUTH_FLOW = false;        // Main auth flow tracking
const LOG_AUTH_REGISTER = false;    // User registration
const LOG_AUTH_LOGIN = false;       // User login
const LOG_AUTH_LOGOUT = false;      // User logout
const LOG_AUTH_SOCIAL = false;      // Social login (Google/Facebook)
const LOG_AUTH_GUEST = false;       // Guest login
const LOG_AUTH_REDIRECT = false;    // Redirect handling
const LOG_AUTH_FIRESTORE = false;   // Firestore operations
const LOG_AUTH_ERROR = false;       // Error logging

// Check if Firebase is configured
const isFirebaseConfigured = !!auth && !!db;

// User profile interface
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  createdAt: Date;
  lastLoginAt: Date;
  gamesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  eloRating: number;
  achievements: string[];
  // Per spec Section 18, lines 1693-1696: Match history references
  matchHistory?: string[];  // Match PDA addresses or match IDs
  matchIds?: string[];      // Match UUIDs for quick lookup
}

// Authentication result interface
export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

// Error interface for Firebase errors
interface FirebaseError {
  code: string;
  message: string;
}

// Error message mapping - converts Firebase error codes to user-friendly messages
export const getAuthErrorMessage = (error: unknown): string => {
  const firebaseError = error as FirebaseError;
  const errorCode = firebaseError.code || '';
  
  switch (errorCode) {
    // Login errors
    case 'auth/user-not-found':
      return "No account found with this email. Would you like to sign up?";
    case 'auth/wrong-password':
      return "Incorrect password. Forgot password?";
    case 'auth/invalid-email':
      return "Please enter a valid email address.";
    case 'auth/user-disabled':
      return "This account has been disabled. Please contact support.";
    case 'auth/invalid-credential':
      return "Invalid email or password. Please try again.";
    
    // Registration errors
    case 'auth/email-already-in-use':
      return "This email is already registered. Please sign in instead, or use 'Forgot Password?' if you don't remember your password.";
    case 'auth/weak-password':
      return "Password must be at least 6 characters.";
    case 'auth/operation-not-allowed':
      return "This sign-in method is not enabled. Please contact support.";
    
    // Social login errors
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return ""; // Silent fail - user intentionally cancelled
    case 'auth/popup-blocked':
      return "Popup was blocked. Please allow popups and try again.";
    case 'auth/account-exists-with-different-credential':
      return "An account with this email exists with a different sign-in method. We'll link your accounts automatically.";
    case 'auth/credential-already-in-use':
      return "This account is already linked to another user.";
    
    // Network errors
    case 'auth/network-request-failed':
      return "Network error. Please check your connection and try again.";
    case 'auth/too-many-requests':
      return "Too many login attempts. Please try again later.";
    case 'auth/requires-recent-login':
      return "Please sign out and sign in again to complete this action.";
    
    // Default
    default:
      // If it's a Firebase error, return the message, otherwise generic error
      if (firebaseError.message) {
        return firebaseError.message;
      }
      return "An error occurred. Please try again.";
  }
};

// Register a new user
export const registerUser = async (
  email: string, 
  password: string, 
  displayName: string,
  photoURL?: string
): Promise<AuthResult> => {
  logAuth(LOG_AUTH_REGISTER, 'log', prefix, '[registerUser] Starting registration:', { email, displayName, hasPhoto: !!photoURL });

  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[registerUser] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[registerUser] Creating user with email/password...');
    const userCredential: FirebaseUserCredential = await createUserWithEmailAndPassword(auth!, email, password);
    const user: FirebaseUser = userCredential.user;
    
    logAuth(LOG_AUTH_REGISTER, 'log', prefix, '[registerUser] User created:', { uid: user.uid, email: user.email });
    
    // Update user profile with displayName and photoURL
    await updateProfile(user, { 
      displayName,
      photoURL: photoURL || null
    });
    
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[registerUser] Profile updated with displayName and photoURL');
    
    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      displayName,
      email: user.email || '',
      photoURL: photoURL || user.photoURL || '',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      eloRating: 1200, // Default ELO rating
      achievements: []
    };
    
    // Save user profile to Firestore
    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[registerUser] Saving user profile to Firestore:', { uid: user.uid });
    await setDoc(doc(db!, 'users', user.uid), userProfile);
    
    logAuth(LOG_AUTH_REGISTER, 'log', prefix, '[registerUser] ✅ Registration successful:', { uid: user.uid, displayName });
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[registerUser] ❌ Registration error:', firebaseError);
    const userFriendlyMessage = getAuthErrorMessage(error);
    return { success: false, error: userFriendlyMessage };
  }
};

// Login with email and password
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  logAuth(LOG_AUTH_LOGIN, 'log', prefix, '[loginUser] Starting login:', { email });

  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginUser] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }

  // Check if user is already logged in
  if (auth?.currentUser) {
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginUser] User already logged in, refreshing session');
    const currentUser = auth.currentUser;
    
    // Check if Firestore document exists
    const userDoc = await getDoc(doc(db!, 'users', currentUser.uid));
    if (userDoc.exists()) {
      // Update last login time
      await updateDoc(doc(db!, 'users', currentUser.uid), {
        lastLoginAt: new Date()
      });
      const userProfile: UserProfile = {
        ...userDoc.data() as UserProfile,
        uid: currentUser.uid
      };
      return { success: true, user: userProfile };
    }
  }
  
  try {
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginUser] Signing in with email/password...');
    const userCredential: FirebaseUserCredential = await signInWithEmailAndPassword(auth!, email, password);
    const user: FirebaseUser = userCredential.user;
    
    logAuth(LOG_AUTH_LOGIN, 'log', prefix, '[loginUser] Sign in successful:', { uid: user.uid, email: user.email });
    
    // Check if user profile exists, create if not
    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[loginUser] Checking Firestore for existing profile:', { uid: user.uid });
    const userDoc = await getDoc(doc(db!, 'users', user.uid));
    let userProfile: UserProfile;

    if (!userDoc.exists()) {
      // Create new user profile if missing (recovery scenario)
      logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginUser] User profile missing, creating in Firestore');
      userProfile = {
        uid: user.uid,
        displayName: user.displayName || user.email?.split('@')[0] || 'User',
        email: user.email || '',
        photoURL: user.photoURL || '',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eloRating: 1200,
        achievements: []
      };
      await setDoc(doc(db!, 'users', user.uid), userProfile);
      logAuth(LOG_AUTH_REGISTER, 'log', prefix, '[loginUser] ✅ User profile created in Firestore:', { 
        uid: userProfile.uid, 
        displayName: userProfile.displayName 
      });
    } else {
      // User profile exists, update last login
      logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginUser] User profile exists, updating lastLoginAt');
      userProfile = { ...userDoc.data() as UserProfile, uid: user.uid };
      await updateDoc(doc(db!, 'users', user.uid), {
        lastLoginAt: new Date()
      });
    }
      
      logAuth(LOG_AUTH_LOGIN, 'log', prefix, '[loginUser] ✅ Login successful, profile loaded:', { 
        uid: userProfile.uid, 
        displayName: userProfile.displayName,
        gamesPlayed: userProfile.gamesPlayed,
        eloRating: userProfile.eloRating
      });
      
      return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginUser] ❌ Login error:', firebaseError);
    const userFriendlyMessage = getAuthErrorMessage(error);
    // Don't show error for silent failures (like popup cancelled)
    if (!userFriendlyMessage) {
      return { success: false, error: undefined };
    }
    return { success: false, error: userFriendlyMessage };
  }
};

// Login with Google
export const loginWithGoogle = async (): Promise<AuthResult> => {
  logAuth(LOG_AUTH_SOCIAL, 'log', prefix, '[loginWithGoogle] Starting Google login...');

  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginWithGoogle] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginWithGoogle] Creating GoogleAuthProvider...');
    const provider = new GoogleAuthProvider();
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginWithGoogle] Provider created, auth object:', { 
      hasAuth: !!auth, 
      currentUser: auth?.currentUser?.uid || null,
      appName: auth?.app?.name || null
    });
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginWithGoogle] About to call signInWithPopup...');
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginWithGoogle] Current URL:', window.location.href);
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginWithGoogle] Opening popup for Google login...');
    const result = await signInWithPopup(auth!, provider);
    logAuth(LOG_AUTH_SOCIAL, 'log', prefix, '[loginWithGoogle] ✅ Popup login successful:', { 
      uid: result.user.uid, 
      email: result.user.email 
    });
    
    // Handle account linking - check if email exists with different provider
    const email = result.user.email;
    if (email && auth?.currentUser && auth.currentUser.email !== email) {
      // Check if email exists with different provider
      try {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        if (signInMethods.length > 0 && !signInMethods.includes('google.com')) {
          logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginWithGoogle] Account with different provider found, attempting to link');
          // Account exists with different provider - this will be handled by Firebase automatically
          // But we should inform the user
        }
      } catch (linkError) {
        logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginWithGoogle] Error checking sign-in methods:', linkError);
      }
    }
    
    // Check if user profile exists, create if not
    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[loginWithGoogle] Checking Firestore for existing profile:', { uid: result.user.uid });
    const userDoc = await getDoc(doc(db!, 'users', result.user.uid));
    let userProfile: UserProfile;

    if (!userDoc.exists()) {
      // Create new user profile for Google user
      logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginWithGoogle] Creating new user profile in Firestore');
      userProfile = {
        uid: result.user.uid,
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Google User',
        email: result.user.email || '',
        photoURL: result.user.photoURL || '',
        createdAt: new Date(),
        lastLoginAt: new Date(),
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eloRating: 1200,
        achievements: []
      };
      await setDoc(doc(db!, 'users', result.user.uid), userProfile);
      logAuth(LOG_AUTH_REGISTER, 'log', prefix, '[loginWithGoogle] ✅ New user profile created:', { 
        uid: userProfile.uid, 
        displayName: userProfile.displayName 
      });
    } else {
      // User profile already exists, just update last login
      logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginWithGoogle] User profile exists, updating lastLoginAt');
      userProfile = { ...userDoc.data() as UserProfile, uid: result.user.uid };
      await updateDoc(doc(db!, 'users', result.user.uid), {
        lastLoginAt: new Date()
      });
    }
      
      logAuth(LOG_AUTH_LOGIN, 'log', prefix, '[loginWithGoogle] ✅ Login successful, profile loaded:', { 
        uid: userProfile.uid, 
        displayName: userProfile.displayName,
        gamesPlayed: userProfile.gamesPlayed,
        eloRating: userProfile.eloRating
      });
      
      return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginWithGoogle] ❌ Google login error:', {
      code: firebaseError.code,
      message: firebaseError.message,
      fullError: firebaseError
    });
    const userFriendlyMessage = getAuthErrorMessage(error);
    // Don't show error for silent failures (like popup cancelled)
    if (!userFriendlyMessage) {
      return { success: false, error: undefined };
    }
    return { success: false, error: userFriendlyMessage };
  }
};

// Login with Facebook
export const loginWithFacebook = async (): Promise<AuthResult> => {
  logAuth(LOG_AUTH_SOCIAL, 'log', prefix, '[loginWithFacebook] Starting Facebook login...');

  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginWithFacebook] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    const provider = new FacebookAuthProvider();
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginWithFacebook] Initiating redirect to Facebook...');
    await signInWithRedirect(auth!, provider);
    // The result is handled by the onAuthStateChanged listener
    logAuth(LOG_AUTH_SOCIAL, 'log', prefix, '[loginWithFacebook] ✅ Redirect initiated, waiting for callback');
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginWithFacebook] ❌ Facebook login error:', firebaseError);
    const userFriendlyMessage = getAuthErrorMessage(error);
    if (!userFriendlyMessage) {
      return { success: false, error: undefined };
    }
    return { success: false, error: userFriendlyMessage };
  }
};

// Guest login
export const loginAsGuest = async (): Promise<AuthResult> => {
  logAuth(LOG_AUTH_GUEST, 'log', prefix, '[loginAsGuest] Starting guest login...');

  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginAsGuest] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }
  try {
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginAsGuest] Signing in anonymously...');
    const userCredential = await signInAnonymously(auth!);
    const user = userCredential.user;
    
    logAuth(LOG_AUTH_GUEST, 'log', prefix, '[loginAsGuest] Anonymous sign in successful:', { uid: user.uid });
    
    // Check if user profile exists, create if not
    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[loginAsGuest] Checking Firestore for existing profile:', { uid: user.uid });
    const userDoc = await getDoc(doc(db!, 'users', user.uid));
    let userProfile: UserProfile;

    if (!userDoc.exists()) {
      // Create new user profile for anonymous user
      logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginAsGuest] Creating new guest profile in Firestore');
      userProfile = {
        uid: user.uid,
        displayName: `Guest-${user.uid.substring(0, 5)}`,
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
      };
      await setDoc(doc(db!, 'users', user.uid), userProfile);
    } else {
      // User profile already exists, just update last login
      logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginAsGuest] Guest profile exists, updating lastLoginAt');
      userProfile = { ...userDoc.data() as UserProfile, uid: user.uid };
      await updateDoc(doc(db!, 'users', user.uid), {
        lastLoginAt: new Date()
      });
    }
    
    logAuth(LOG_AUTH_GUEST, 'log', prefix, '[loginAsGuest] ✅ Guest login successful:', { 
      uid: userProfile.uid, 
      displayName: userProfile.displayName 
    });
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginAsGuest] ❌ Anonymous login error:', firebaseError);
    const userFriendlyMessage = getAuthErrorMessage(error);
    return { success: false, error: userFriendlyMessage };
  }
};

// Per spec Section 18, lines 1693-1696: Add match to user's match history
export const addMatchToHistory = async (
  userId: string,
  matchId: string
): Promise<{ success: boolean; error?: string }> => {
  logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[addMatchToHistory] Adding match to history:', { userId, matchId });

  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[addMatchToHistory] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const userDoc = doc(db!, 'users', userId);
    const userDocSnapshot = await getDoc(userDoc);

    if (!userDocSnapshot.exists()) {
      logAuth(LOG_AUTH_ERROR, 'error', prefix, '[addMatchToHistory] ❌ User not found:', { userId });
      return { success: false, error: 'User not found' };
    }

    const userData = userDocSnapshot.data() as UserProfile;
    const matchIds = userData.matchIds || [];

    // Check if match already exists
    if (matchIds.includes(matchId)) {
      logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[addMatchToHistory] Match already in history:', { userId, matchId });
      return { success: true };
    }

    // Add match to history (keep last 100 matches)
    const updatedMatchIds = [matchId, ...matchIds].slice(0, 100);
    const updatedMatchHistory = userData.matchHistory ? [matchId, ...userData.matchHistory].slice(0, 100) : updatedMatchIds;

    await updateDoc(userDoc, {
      matchHistory: updatedMatchHistory,
      matchIds: updatedMatchIds,
    });

    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[addMatchToHistory] ✅ Match added to history:', { userId, matchId });
    return { success: true };
  } catch (error) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[addMatchToHistory] ❌ Error:', error);
    const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to add match to history';
    return { success: false, error: userFriendlyMessage };
  }
};

// Get user's match history
export const getMatchHistory = async (
  userId: string
): Promise<{ success: boolean; matchIds?: string[]; error?: string }> => {
  logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[getMatchHistory] Getting match history:', { userId });

  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[getMatchHistory] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const userDoc = doc(db!, 'users', userId);
    const userDocSnapshot = await getDoc(userDoc);

    if (!userDocSnapshot.exists()) {
      logAuth(LOG_AUTH_ERROR, 'error', prefix, '[getMatchHistory] ❌ User not found:', { userId });
      return { success: false, error: 'User not found' };
    }

    const userData = userDocSnapshot.data() as UserProfile;
    const matchIds = userData.matchIds || [];

    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[getMatchHistory] ✅ Match history retrieved:', { userId, count: matchIds.length });
    return { success: true, matchIds };
  } catch (error) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[getMatchHistory] ❌ Error:', error);
    const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to get match history';
    return { success: false, error: userFriendlyMessage };
  }
};

// Logout
export const logoutUser = async (): Promise<{ success: boolean; error?: string }> => {
  logAuth(LOG_AUTH_LOGOUT, 'log', prefix, '[logoutUser] Starting logout...');

  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[logoutUser] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    await signOut(auth!);
    logAuth(LOG_AUTH_LOGOUT, 'log', prefix, '[logoutUser] ✅ Logout successful');
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[logoutUser] ❌ Logout error:', firebaseError);
    return { success: false, error: firebaseError.message };
  }
};

// Update user profile (displayName, photoURL, etc.)
export const updateUserProfile = async (
  uid: string,
  updates: {
    displayName?: string;
    photoURL?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  logAuth(LOG_AUTH_FLOW, 'log', prefix, '[updateUserProfile] Starting profile update:', { uid, updates });

  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[updateUserProfile] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    // Update Firebase Auth profile if user is currently logged in
    // BUT skip Auth update for base64 images (Firebase Auth has size limits)
    const isBase64 = updates.photoURL?.startsWith('data:image/');
    
    if (auth?.currentUser && auth.currentUser.uid === uid && !isBase64) {
      await updateProfile(auth.currentUser, updates);
      logAuth(LOG_AUTH_FLOW, 'log', prefix, '[updateUserProfile] Firebase Auth profile updated');
    } else if (isBase64) {
      logAuth(LOG_AUTH_FLOW, 'log', prefix, '[updateUserProfile] Skipping Auth update for base64 image (size limit)');
    }

    // Update Firestore document (supports larger data)
    const updateData: Partial<UserProfile> = {};
    if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
    if (updates.photoURL !== undefined) updateData.photoURL = updates.photoURL;

    await updateDoc(doc(db!, 'users', uid), updateData);
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[updateUserProfile] ✅ Firestore profile updated');
    
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[updateUserProfile] ❌ Profile update error:', firebaseError);
    const userFriendlyMessage = getAuthErrorMessage(error);
    return { success: false, error: userFriendlyMessage };
  }
};

// Update user statistics
export const updateUserStats = async (
  uid: string,
  stats: Partial<{
    gamesPlayed: number;
    wins: number;
    losses: number;
    winRate: number;
    eloRating: number;
    achievements: string[];
  }>
): Promise<{ success: boolean; error?: string }> => {
  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    // Calculate win rate if gamesPlayed is provided
    if (stats.gamesPlayed !== undefined) {
      const userDoc = await getDoc(doc(db!, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        const wins = stats.wins !== undefined ? stats.wins : userData.wins;
        const winRate = stats.gamesPlayed > 0 ? (wins / stats.gamesPlayed) * 100 : 0;
        stats = { ...stats, winRate };
      }
    }
    
    await updateDoc(doc(db!, 'users', uid), stats);
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    if (LOG_AUTH_ERROR) console.error('Update user stats error:', firebaseError);
    return { success: false, error: firebaseError.message };
  }
};

export const handleRedirectResult = async (): Promise<AuthResult> => {
  logAuth(LOG_AUTH_REDIRECT, 'log', prefix, '[handleRedirectResult] Checking for redirect result...');

  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleRedirectResult] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const result = await getRedirectResult(auth!);
    if (result) {
      logAuth(LOG_AUTH_REDIRECT, 'log', prefix, '[handleRedirectResult] ✅ Redirect result found:', { 
        uid: result.user.uid, 
        email: result.user.email,
        provider: result.providerId 
      });
      const user = result.user;
      
      // Check if user profile exists, create if not
      logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[handleRedirectResult] Checking Firestore for existing profile:', { uid: user.uid });
      const userDoc = await getDoc(doc(db!, 'users', user.uid));
      let userProfile: UserProfile;

      if (!userDoc.exists()) {
        // Create user profile if it doesn't exist
        logAuth(LOG_AUTH_FLOW, 'log', prefix, '[handleRedirectResult] Profile not found, creating new profile');
        userProfile = {
          uid: user.uid,
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          email: user.email || '',
          photoURL: user.photoURL || '',
          createdAt: new Date(),
          lastLoginAt: new Date(),
          gamesPlayed: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          eloRating: 1200, // Default ELO rating
          achievements: []
        };
        
        // Save user profile to Firestore
        logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[handleRedirectResult] Saving new profile to Firestore');
        await setDoc(doc(db!, 'users', user.uid), userProfile);
        
        logAuth(LOG_AUTH_REDIRECT, 'log', prefix, '[handleRedirectResult] ✅ New profile created and saved');
      } else {
        // User profile exists, update last login
        logAuth(LOG_AUTH_FLOW, 'log', prefix, '[handleRedirectResult] Profile exists, updating lastLoginAt');
        userProfile = { ...userDoc.data() as UserProfile, uid: user.uid };
        await updateDoc(doc(db!, 'users', user.uid), {
          lastLoginAt: new Date()
        });
        
        logAuth(LOG_AUTH_REDIRECT, 'log', prefix, '[handleRedirectResult] ✅ Profile loaded from Firestore:', { 
          uid: userProfile.uid, 
          displayName: userProfile.displayName 
        });
      }
      
      return { success: true, user: userProfile };
    } else {
      logAuth(LOG_AUTH_REDIRECT, 'log', prefix, '[handleRedirectResult] No redirect result found (normal if not returning from OAuth)');
      return { success: false, error: 'No redirect result' };
    }
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleRedirectResult] ❌ Redirect result error:', firebaseError);
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleRedirectResult] Full error object:', error);
    const userFriendlyMessage = getAuthErrorMessage(error);
    return { success: false, error: userFriendlyMessage };
  }
};

// Send password reset email
export const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
  logAuth(LOG_AUTH_FLOW, 'log', prefix, '[sendPasswordReset] Sending password reset email:', { email });

  if (!isFirebaseConfigured) {
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[sendPasswordReset] ❌ Firebase not configured');
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    await sendPasswordResetEmail(auth!, email);
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[sendPasswordReset] ✅ Password reset email sent');
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[sendPasswordReset] ❌ Password reset error:', firebaseError);
    const userFriendlyMessage = getAuthErrorMessage(error);
    return { success: false, error: userFriendlyMessage };
  }
};
