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
  getRedirectResult
} from 'firebase/auth';
import type { User as FirebaseUser, UserCredential as FirebaseUserCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { logAuth } from '../utils/logger';

const prefix = '[FirebaseService]';

// Auth flow logging flags
const LOG_AUTH_FLOW = true;        // Main auth flow tracking
const LOG_AUTH_REGISTER = true;    // User registration
const LOG_AUTH_LOGIN = true;       // User login
const LOG_AUTH_LOGOUT = true;      // User logout
const LOG_AUTH_SOCIAL = true;      // Social login (Google/Facebook)
const LOG_AUTH_GUEST = true;       // Guest login
const LOG_AUTH_REDIRECT = true;    // Redirect handling
const LOG_AUTH_FIRESTORE = true;   // Firestore operations
const LOG_AUTH_ERROR = true;       // Error logging

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

// Register a new user
export const registerUser = async (
  email: string, 
  password: string, 
  displayName: string
): Promise<AuthResult> => {
  logAuth(LOG_AUTH_REGISTER, 'log', prefix, '[registerUser] Starting registration:', { email, displayName });

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
    
    // Update user profile
    await updateProfile(user, { displayName });
    
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[registerUser] Profile updated with displayName');
    
    // Create user profile in Firestore
    const userProfile: UserProfile = {
      uid: user.uid,
      displayName,
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
    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[registerUser] Saving user profile to Firestore:', { uid: user.uid });
    await setDoc(doc(db!, 'users', user.uid), userProfile);
    
    logAuth(LOG_AUTH_REGISTER, 'log', prefix, '[registerUser] ✅ Registration successful:', { uid: user.uid, displayName });
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[registerUser] ❌ Registration error:', firebaseError);
    return { success: false, error: firebaseError.message };
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
  
  try {
    logAuth(LOG_AUTH_FLOW, 'log', prefix, '[loginUser] Signing in with email/password...');
    const userCredential: FirebaseUserCredential = await signInWithEmailAndPassword(auth!, email, password);
    const user: FirebaseUser = userCredential.user;
    
    logAuth(LOG_AUTH_LOGIN, 'log', prefix, '[loginUser] Sign in successful:', { uid: user.uid, email: user.email });
    
    // Update last login time
    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[loginUser] Updating lastLoginAt in Firestore');
    await updateDoc(doc(db!, 'users', user.uid), {
      lastLoginAt: new Date()
    });
    
    // Get user profile from Firestore
    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[loginUser] Fetching user profile from Firestore:', { uid: user.uid });
    const userDoc = await getDoc(doc(db!, 'users', user.uid));
    if (userDoc.exists()) {
      const userProfile: UserProfile = {
        ...userDoc.data() as UserProfile,
        uid: user.uid
      };
      
      logAuth(LOG_AUTH_LOGIN, 'log', prefix, '[loginUser] ✅ Login successful, profile loaded:', { 
        uid: userProfile.uid, 
        displayName: userProfile.displayName,
        gamesPlayed: userProfile.gamesPlayed,
        eloRating: userProfile.eloRating
      });
      
      return { success: true, user: userProfile };
    } else {
      logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginUser] ❌ User profile not found in Firestore:', { uid: user.uid });
      return { success: false, error: 'User profile not found' };
    }
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginUser] ❌ Login error:', firebaseError);
    return { success: false, error: firebaseError.message };
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
    
    // Update last login time
    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[loginWithGoogle] Updating lastLoginAt in Firestore');
    await updateDoc(doc(db!, 'users', result.user.uid), {
      lastLoginAt: new Date()
    });
    
    // Get user profile from Firestore
    logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[loginWithGoogle] Fetching user profile from Firestore:', { uid: result.user.uid });
    const userDoc = await getDoc(doc(db!, 'users', result.user.uid));
    if (userDoc.exists()) {
      const userProfile: UserProfile = {
        ...userDoc.data() as UserProfile,
        uid: result.user.uid
      };
      
      logAuth(LOG_AUTH_LOGIN, 'log', prefix, '[loginWithGoogle] ✅ Login successful, profile loaded:', { 
        uid: userProfile.uid, 
        displayName: userProfile.displayName,
        gamesPlayed: userProfile.gamesPlayed,
        eloRating: userProfile.eloRating
      });
      
      return { success: true, user: userProfile };
    } else {
      logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginWithGoogle] ❌ User profile not found in Firestore:', { uid: result.user.uid });
      return { success: false, error: 'User profile not found' };
    }
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginWithGoogle] ❌ Google login error:', {
      code: firebaseError.code,
      message: firebaseError.message,
      fullError: firebaseError
    });
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[loginWithGoogle] ❌ Error occurred during popup login');
    return { success: false, error: firebaseError.message };
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
    return { success: false, error: firebaseError.message };
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
    return { success: false, error: firebaseError.message };
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
    console.error('Update user stats error:', firebaseError);
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
      
      // Update last login time
      logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[handleRedirectResult] Updating lastLoginAt in Firestore');
      await updateDoc(doc(db!, 'users', user.uid), {
        lastLoginAt: new Date()
      });

      // Get user profile from Firestore
      logAuth(LOG_AUTH_FIRESTORE, 'log', prefix, '[handleRedirectResult] Fetching user profile from Firestore:', { uid: user.uid });
      const userDoc = await getDoc(doc(db!, 'users', user.uid));
      if (userDoc.exists()) {
        const userProfile: UserProfile = {
          ...userDoc.data() as UserProfile,
          uid: user.uid
        };
        
        logAuth(LOG_AUTH_REDIRECT, 'log', prefix, '[handleRedirectResult] ✅ Profile loaded from Firestore:', { 
          uid: userProfile.uid, 
          displayName: userProfile.displayName 
        });
        
        return { success: true, user: userProfile };
      } else {
        // Create user profile if it doesn't exist
        logAuth(LOG_AUTH_FLOW, 'log', prefix, '[handleRedirectResult] Profile not found, creating new profile');
        const userProfile: UserProfile = {
          uid: user.uid,
          displayName: user.displayName || '',
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
        
        return { success: true, user: userProfile };
      }
    } else {
      logAuth(LOG_AUTH_REDIRECT, 'log', prefix, '[handleRedirectResult] No redirect result found (normal if not returning from OAuth)');
      return { success: false, error: 'No redirect result' };
    }
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleRedirectResult] ❌ Redirect result error:', firebaseError);
    logAuth(LOG_AUTH_ERROR, 'error', prefix, '[handleRedirectResult] Full error object:', error);
    return { success: false, error: `Code: ${firebaseError.code}, Message: ${firebaseError.message}` };
  }
};
