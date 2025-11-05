import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signOut, 
  GoogleAuthProvider, 
  FacebookAuthProvider,
  updateProfile
} from 'firebase/auth';
import type { User as FirebaseUser, UserCredential as FirebaseUserCredential } from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

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
  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    const userCredential: FirebaseUserCredential = await createUserWithEmailAndPassword(auth!, email, password);
    const user: FirebaseUser = userCredential.user;
    
    // Update user profile
    await updateProfile(user, { displayName });
    
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
    await setDoc(doc(db!, 'users', user.uid), userProfile);
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    console.error('Registration error:', firebaseError);
    return { success: false, error: firebaseError.message };
  }
};

// Login with email and password
export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    const userCredential: FirebaseUserCredential = await signInWithEmailAndPassword(auth!, email, password);
    const user: FirebaseUser = userCredential.user;
    
    // Update last login time
    await updateDoc(doc(db!, 'users', user.uid), {
      lastLoginAt: new Date()
    });
    
    // Get user profile from Firestore
    const userDoc = await getDoc(doc(db!, 'users', user.uid));
    if (userDoc.exists()) {
      const userProfile: UserProfile = {
        ...userDoc.data() as UserProfile,
        uid: user.uid
      };
      
      return { success: true, user: userProfile };
    } else {
      return { success: false, error: 'User profile not found' };
    }
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    console.error('Login error:', firebaseError);
    return { success: false, error: firebaseError.message };
  }
};

// Login with Google
export const loginWithGoogle = async (): Promise<AuthResult> => {
  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    const provider = new GoogleAuthProvider();
    const userCredential: FirebaseUserCredential = await signInWithPopup(auth!, provider);
    const user: FirebaseUser = userCredential.user;
    
    // Check if user profile exists, create if not
    const userDoc = await getDoc(doc(db!, 'users', user.uid));
    let userProfile: UserProfile;
    
    if (!userDoc.exists()) {
      // Create new user profile
      userProfile = {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
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
      
      // Save user profile to Firestore
      await setDoc(doc(db!, 'users', user.uid), userProfile);
    } else {
      // Update existing user profile
      userProfile = {
        ...userDoc.data() as UserProfile,
        uid: user.uid
      };
      
      // Update last login time
      await updateDoc(doc(db!, 'users', user.uid), {
        lastLoginAt: new Date()
      });
    }
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    console.error('Google login error:', firebaseError);
    return { success: false, error: firebaseError.message };
  }
};

// Login with Facebook
export const loginWithFacebook = async (): Promise<AuthResult> => {
  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    const provider = new FacebookAuthProvider();
    const userCredential: FirebaseUserCredential = await signInWithPopup(auth!, provider);
    const user: FirebaseUser = userCredential.user;
    
    // Check if user profile exists, create if not
    const userDoc = await getDoc(doc(db!, 'users', user.uid));
    let userProfile: UserProfile;
    
    if (!userDoc.exists()) {
      // Create new user profile
      userProfile = {
        uid: user.uid,
        displayName: user.displayName || 'Anonymous',
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
      
      // Save user profile to Firestore
      await setDoc(doc(db!, 'users', user.uid), userProfile);
    } else {
      // Update existing user profile
      userProfile = {
        ...userDoc.data() as UserProfile,
        uid: user.uid
      };
      
      // Update last login time
      await updateDoc(doc(db!, 'users', user.uid), {
        lastLoginAt: new Date()
      });
    }
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    console.error('Facebook login error:', firebaseError);
    return { success: false, error: firebaseError.message };
  }
};

// Guest login
export const loginAsGuest = async (): Promise<AuthResult> => {
  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    // For guest login, we'll create a temporary user profile
    // In a real implementation, you might want to handle this differently
    const guestId = `guest_${Date.now()}`;
    const userProfile: UserProfile = {
      uid: guestId,
      displayName: `Guest${Math.floor(Math.random() * 1000)}`,
      email: '',
      createdAt: new Date(),
      lastLoginAt: new Date(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      eloRating: 1200,
      achievements: []
    };
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    console.error('Guest login error:', firebaseError);
    return { success: false, error: firebaseError.message };
  }
};

// Logout
export const logoutUser = async (): Promise<{ success: boolean; error?: string }> => {
  // If Firebase isn't configured, return an error
  if (!isFirebaseConfigured) {
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    await signOut(auth!);
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    console.error('Logout error:', firebaseError);
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