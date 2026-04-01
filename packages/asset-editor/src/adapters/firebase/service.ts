import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
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
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db, storage } from './config';
import { StorageBucketName } from '@ocentra/boundary-domain/constants/buckets';
import { FirestoreCollection } from '@ocentra/boundary-domain/constants/firestore-collections';
import { AssetEditorLogger } from '@ocentra/logging-domain/core/assetEditorLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { R2Service } from '@/adapters/storage/R2Service';
import { getStorageConfig } from '@/services/storage/StorageConfig';

const log = AssetEditorLogger.instance;
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
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

log.register(import.meta.url);

const LOG_AUTH_FLOW = true;
const LOG_AUTH_REGISTER = false;
const LOG_AUTH_LOGIN = false;
const LOG_AUTH_LOGOUT = false;
const LOG_AUTH_SOCIAL = true;
const LOG_AUTH_GUEST = false;
const LOG_AUTH_REDIRECT = false;
const LOG_AUTH_FIRESTORE = false;
const LOG_AUTH_ERROR = true;

const isFirebaseConfigured = (): boolean => {
  return !!auth && !!db;
};

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
  matchHistory?: string[];
  matchIds?: string[];
  walletAddress?: string;
  isAdmin?: boolean;  
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

interface FirebaseError {
  code: string;
  message: string;
}

export const getAuthErrorMessage = (error: unknown): string => {
  const firebaseError = error as FirebaseError;
  const errorCode = firebaseError.code || '';
  
  switch (errorCode) {
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
    
    case 'auth/email-already-in-use':
      return "This email is already registered. Please sign in instead, or use 'Forgot Password?' if you don't remember your password.";
    case 'auth/weak-password':
      return "Password must be at least 6 characters.";
    case 'auth/operation-not-allowed':
      return "This sign-in method is not enabled. Please contact support.";
    
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return "";
    case 'auth/popup-blocked':
      return "Popup was blocked. Please allow popups and try again.";
    case 'auth/account-exists-with-different-credential':
      return "An account with this email exists with a different sign-in method. We'll link your accounts automatically.";
    case 'auth/credential-already-in-use':
      return "This account is already linked to another user.";
    
    case 'auth/network-request-failed':
      return "Network error. Please check your connection and try again.";
    case 'auth/too-many-requests':
      return "Too many login attempts. Please try again later.";
    case 'auth/requires-recent-login':
      return "Please sign out and sign in again to complete this action.";
    
    default:
      if (firebaseError.message) {
        return firebaseError.message;
      }
      return "An error occurred. Please try again.";
  }
};

export const registerUser = async (
  email: string, 
  password: string, 
  displayName: string,
  photoURL?: string
): Promise<AuthResult> => {
  logInfo('registerUser: Starting registration:', { data: { email, displayName, hasPhoto: !!photoURL } }, LOG_AUTH_REGISTER);

  if (!isFirebaseConfigured()) {
    logError('registerUser: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    logInfo('registerUser: Creating user with email/password...', LOG_AUTH_FLOW);
    const userCredential: FirebaseUserCredential = await createUserWithEmailAndPassword(auth!, email, password);
    const user: FirebaseUser = userCredential.user;
    
    logInfo('registerUser: User created:', { data: { uid: user.uid, email: user.email } }, LOG_AUTH_REGISTER);
    
    let finalPhotoURL = photoURL || user.photoURL || '';
    
    if (photoURL && photoURL.startsWith('data:image/')) {
      const r2Url = await uploadAvatarToR2(photoURL, user.uid);
      if (r2Url) {
        finalPhotoURL = r2Url;
        logInfo('registerUser: Avatar uploaded to R2, using R2 URL', LOG_AUTH_FLOW);
      } else {
        logWarn('registerUser: R2 upload failed, keeping base64 in Firestore', LOG_AUTH_FLOW);
      }
    }
    
    if (!finalPhotoURL.startsWith('data:image/')) {
      await updateProfile(user, { 
        displayName,
        photoURL: finalPhotoURL || null
      });
      logInfo('registerUser: Profile updated with displayName and photoURL', LOG_AUTH_FLOW);
    } else {
      await updateProfile(user, { 
        displayName
      });
      logInfo('registerUser: Profile updated with displayName (skipping base64 photoURL in Auth)', LOG_AUTH_FLOW);
    }
    
    const userProfile: UserProfile = {
      uid: user.uid,
      displayName,
      email: user.email || '',
      photoURL: finalPhotoURL,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      gamesPlayed: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      eloRating: 1200,
      achievements: []
    };
    
    logInfo('registerUser: Saving user profile to Firestore:', { data: { uid: user.uid } }, LOG_AUTH_FIRESTORE);
    await setDoc(doc(db!, FirestoreCollection.Users, user.uid), userProfile);
    
    logInfo('registerUser: ✅ Registration successful:', { data: { uid: user.uid, displayName } }, LOG_AUTH_REGISTER);
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logError('registerUser: ❌ Registration error:', { data: firebaseError }, LOG_AUTH_ERROR);
    
    if (firebaseError.code === 'auth/email-already-in-use') {
      logInfo('registerUser: Email already in use, checking sign-in methods:', { data: email }, LOG_AUTH_FLOW);
      try {
        const signInMethods = await fetchSignInMethodsForEmail(auth!, email);
        logInfo('registerUser: Sign-in methods found:', { data: signInMethods }, LOG_AUTH_FLOW);
        const hasSocialProvider = signInMethods.some(method => method === 'google.com' || method === 'facebook.com');
        
        if (hasSocialProvider) {
          const providers = signInMethods.filter(m => m === 'google.com' || m === 'facebook.com');
          const providerNames = providers.map(p => p === 'google.com' ? 'Google' : 'Facebook').join(' or ');
          logInfo('registerUser: Email exists with social provider:', { data: providerNames }, LOG_AUTH_FLOW);
          return {
            success: false,
            error: `This email is already registered with ${providerNames}. Please sign in with ${providerNames} instead, or set a password in your account settings after signing in.`
          };
        } else {
          logInfo('registerUser: No sign-in methods detected, but email exists - likely social provider', LOG_AUTH_FLOW);
          return {
            success: false,
            error: 'This email is already registered. If you signed up with Google or Facebook, please sign in with that method instead.'
          };
        }
      } catch (methodsError) {
        logError('registerUser: Could not check sign-in methods:', { data: methodsError }, LOG_AUTH_ERROR);
        return {
          success: false,
          error: 'This email is already registered. If you signed up with Google or Facebook, please sign in with that method instead.'
        };
      }
    }
    
    const userFriendlyMessage = getAuthErrorMessage(error);
    return { success: false, error: userFriendlyMessage };
  }
};

export const loginUser = async (email: string, password: string): Promise<AuthResult> => {
  logInfo('loginUser: Starting login:', { data: { email } }, LOG_AUTH_LOGIN);

  if (!isFirebaseConfigured()) {
    logError('loginUser: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }

  if (auth?.currentUser) {
    logInfo('loginUser: User already logged in, refreshing session', LOG_AUTH_FLOW);
    const currentUser = auth.currentUser;
    
    const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, currentUser.uid));
    if (userDoc.exists()) {
      await updateDoc(doc(db!, FirestoreCollection.Users, currentUser.uid), {
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
    logInfo('loginUser: Checking available sign-in methods for email:', { data: email }, LOG_AUTH_FLOW);
    let signInMethods: string[] = [];
    try {
      signInMethods = await fetchSignInMethodsForEmail(auth!, email);
      logInfo('loginUser: Available sign-in methods:', { data: signInMethods }, LOG_AUTH_FLOW);
    } catch (methodsError) {
      logInfo('loginUser: Could not fetch sign-in methods (email may not exist):', { data: methodsError }, LOG_AUTH_FLOW);
    }
    
    const hasSocialProvider = signInMethods.some(method => method === 'google.com' || method === 'facebook.com');
    const hasPasswordMethod = signInMethods.includes('password');
    
    if (hasSocialProvider && !hasPasswordMethod) {
      const providers = signInMethods.filter(m => m === 'google.com' || m === 'facebook.com');
      const providerNames = providers.map(p => p === 'google.com' ? 'Google' : 'Facebook').join(' or ');
      logInfo('loginUser: Email registered with social provider, no password method', LOG_AUTH_FLOW);
      return {
        success: false,
        error: `This email is registered with ${providerNames}. Please sign in with ${providerNames} instead, or set a password in your account settings.`
      };
    }
    
    logInfo('loginUser: Signing in with email/password...', LOG_AUTH_FLOW);
    const userCredential: FirebaseUserCredential = await signInWithEmailAndPassword(auth!, email, password);
    const user: FirebaseUser = userCredential.user;
    
    logInfo('loginUser: Sign in successful:', { data: { uid: user.uid, email: user.email } }, LOG_AUTH_LOGIN);
    
    logInfo('loginUser: Checking Firestore for existing profile:', { data: { uid: user.uid } }, LOG_AUTH_FIRESTORE);
    const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, user.uid));
    let userProfile: UserProfile;

    if (!userDoc.exists()) {
      logInfo('loginUser: User profile missing, creating in Firestore', LOG_AUTH_FLOW);
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
      await setDoc(doc(db!, FirestoreCollection.Users, user.uid), userProfile);
      logInfo('loginUser: ✅ User profile created in Firestore:', { 
        data: { 
          uid: userProfile.uid, 
          displayName: userProfile.displayName 
        }
      }, LOG_AUTH_REGISTER);
    } else {
      logInfo('loginUser: User profile exists, updating lastLoginAt', LOG_AUTH_FLOW);
      userProfile = { ...userDoc.data() as UserProfile, uid: user.uid };
      await updateDoc(doc(db!, FirestoreCollection.Users, user.uid), {
        lastLoginAt: new Date()
      });
    }
      
      logInfo('loginUser: ✅ Login successful, profile loaded:', { 
        data: { 
          uid: userProfile.uid, 
          displayName: userProfile.displayName,
          gamesPlayed: userProfile.gamesPlayed,
          eloRating: userProfile.eloRating
        }
      }, LOG_AUTH_LOGIN);
      
      return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logError('loginUser: ❌ Login error:', { data: firebaseError }, LOG_AUTH_ERROR);
    
    if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential' || firebaseError.code === 'auth/wrong-password') {
      logInfo('loginUser: Checking sign-in methods in error handler for:', { data: email }, LOG_AUTH_FLOW);
      try {
        const signInMethods = await fetchSignInMethodsForEmail(auth!, email);
        logInfo('loginUser: Sign-in methods from error handler:', { data: signInMethods }, LOG_AUTH_FLOW);
        const hasSocialProvider = signInMethods.some(method => method === 'google.com' || method === 'facebook.com');
        
        if (hasSocialProvider) {
          const providers = signInMethods.filter(m => m === 'google.com' || m === 'facebook.com');
          const providerNames = providers.map(p => p === 'google.com' ? 'Google' : 'Facebook').join(' or ');
          logInfo('loginUser: Email exists with social provider:', { data: providerNames }, LOG_AUTH_FLOW);
          return {
            success: false,
            error: `This email is registered with ${providerNames}. Please sign in with ${providerNames} instead.`
          };
        } else {
          logInfo('loginUser: No social providers found for email', LOG_AUTH_FLOW);
          return {
            success: false,
            error: 'Invalid email or password. If you signed up with Google or Facebook, please use that method to sign in instead.'
          };
        }
      } catch (methodsError) {
        logError('loginUser: Could not check sign-in methods in error handler:', { data: methodsError }, LOG_AUTH_ERROR);
        return {
          success: false,
          error: 'Invalid email or password. If you signed up with Google or Facebook, please use that method to sign in instead.'
        };
      }
    }
    
    const userFriendlyMessage = getAuthErrorMessage(error);
    if (!userFriendlyMessage) {
      return { success: false, error: undefined };
    }
    return { success: false, error: userFriendlyMessage };
  }
};

export const loginWithGoogle = async (): Promise<AuthResult> => {
  logInfo('loginWithGoogle: Starting Google login...', LOG_AUTH_SOCIAL);

  if (!isFirebaseConfigured()) {
    logError('loginWithGoogle: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    logInfo('loginWithGoogle: Creating GoogleAuthProvider...', LOG_AUTH_FLOW);
    const provider = new GoogleAuthProvider();
    logInfo('loginWithGoogle: Provider created, auth object:', { 
      data: { 
        hasAuth: !!auth, 
        currentUser: auth?.currentUser?.uid || null,
        appName: auth?.app?.name || null
      } 
    }, LOG_AUTH_FLOW);
    logInfo(`loginWithGoogle: About to call signInWithPopup, current URL: ${window.location.href}`, { data: { url: window.location.href } }, LOG_AUTH_FLOW);
    const result = await signInWithPopup(auth!, provider);
    logInfo('loginWithGoogle: ✅ Popup login successful:', { 
      data: { 
        uid: result.user.uid, 
        email: result.user.email 
      } 
    }, LOG_AUTH_SOCIAL);
    
    const email = result.user.email;
    if (email && auth?.currentUser && auth.currentUser.email !== email) {
      try {
        const signInMethods = await fetchSignInMethodsForEmail(auth, email);
        if (signInMethods.length > 0 && !signInMethods.includes('google.com')) {
          logInfo('loginWithGoogle: Account with different provider found, attempting to link', LOG_AUTH_FLOW);
        }
      } catch (linkError) {
        logError('loginWithGoogle: Error checking sign-in methods:', { data: linkError }, LOG_AUTH_ERROR);
      }
    }
    
    logInfo('loginWithGoogle: Checking Firestore for existing profile:', { data: { uid: result.user.uid } }, LOG_AUTH_FIRESTORE);
    const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, result.user.uid));
    let userProfile: UserProfile;

    const photoURL = result.user.photoURL || '';

    if (!userDoc.exists()) {
      logInfo('loginWithGoogle: Creating new user profile in Firestore', LOG_AUTH_FLOW);
      userProfile = {
        uid: result.user.uid,
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'Google User',
        email: result.user.email || '',
        photoURL: photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eloRating: 1200,
        achievements: []
      };
      await setDoc(doc(db!, FirestoreCollection.Users, result.user.uid), userProfile);
      logInfo('loginWithGoogle: ✅ New user profile created:', { 
        data: { 
          uid: userProfile.uid, 
          displayName: userProfile.displayName 
        } 
      }, LOG_AUTH_REGISTER);
    } else {
      logInfo('loginWithGoogle: User profile exists, updating lastLoginAt', LOG_AUTH_FLOW);
      userProfile = { ...userDoc.data() as UserProfile, uid: result.user.uid };
      const updateData: Partial<UserProfile> = {
        lastLoginAt: new Date()
      };
      
      if (result.user.photoURL && (!userProfile.photoURL || userProfile.photoURL !== result.user.photoURL)) {
        updateData.photoURL = photoURL;
        logInfo('loginWithGoogle: Updating photoURL from Google (will be proxied through Cloudflare Worker)', LOG_AUTH_FLOW);
      }
      
      await updateDoc(doc(db!, FirestoreCollection.Users, result.user.uid), updateData);
      userProfile = { ...userProfile, ...updateData };
    }
      
      logInfo('loginWithGoogle: ✅ Login successful, profile loaded:', { 
        data: { 
          uid: userProfile.uid, 
          displayName: userProfile.displayName,
          gamesPlayed: userProfile.gamesPlayed,
          eloRating: userProfile.eloRating
        } 
      }, LOG_AUTH_LOGIN);
      
      return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError & { customData?: { _tokenResponse?: { verifiedProvider?: string[]; email?: string } } };
    
    if (firebaseError.code === 'auth/account-exists-with-different-credential') {
      logInfo('loginWithGoogle: Account exists with different provider, attempting to auto-link...', LOG_AUTH_FLOW);
      
      const email = firebaseError.customData?._tokenResponse?.email;
      const verifiedProviders = firebaseError.customData?._tokenResponse?.verifiedProvider || [];
      
      if (email && verifiedProviders.length > 0) {
        logInfo('loginWithGoogle: Found existing account:', { data: { email, providers: verifiedProviders } }, LOG_AUTH_FLOW);
        
        if (auth?.currentUser && auth.currentUser.email === email) {
          logInfo('loginWithGoogle: User is already logged in with existing provider', LOG_AUTH_FLOW);
          const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, auth.currentUser.uid));
          if (userDoc.exists()) {
            const userProfile = { ...userDoc.data() as UserProfile, uid: auth.currentUser.uid };
            await updateDoc(doc(db!, FirestoreCollection.Users, auth.currentUser.uid), {
              lastLoginAt: new Date()
            });
            return { success: true, user: userProfile };
          }
        }
        
        const hasFacebook = verifiedProviders.includes('facebook.com');
        const providerName = hasFacebook ? 'Facebook' : verifiedProviders[0];
        
        logInfo(`loginWithGoogle: Auto-linking: signing in with ${providerName} first...`, LOG_AUTH_FLOW);
        
        try {
          let existingProviderResult;
          if (hasFacebook) {
            const facebookProvider = new FacebookAuthProvider();
            existingProviderResult = await signInWithPopup(auth!, facebookProvider);
          } else {
            return { 
              success: false, 
              error: `An account with this email already exists with ${providerName}. Please sign in with ${providerName} instead.` 
            };
          }
          
          logInfo(`loginWithGoogle: ✅ Signed in with ${providerName}, now linking Google...`, LOG_AUTH_SOCIAL);
          
          const googleProvider = new GoogleAuthProvider();
          const googleResult = await signInWithPopup(auth!, googleProvider);
          
          logInfo('loginWithGoogle: ✅ Successfully linked Google to existing account', LOG_AUTH_SOCIAL);
          
          const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, googleResult.user.uid));
          const googlePhotoURL = googleResult.user.photoURL;
          const facebookPhotoURL = existingProviderResult.user.photoURL;
          
          if (userDoc.exists()) {
            const userProfile = { ...userDoc.data() as UserProfile, uid: googleResult.user.uid };
            const updateData: Partial<UserProfile> = {
              lastLoginAt: new Date()
            };
            
            if (googlePhotoURL && (!userProfile.photoURL || userProfile.photoURL === facebookPhotoURL)) {
              updateData.photoURL = googlePhotoURL;
            } else if (facebookPhotoURL && !userProfile.photoURL) {
              updateData.photoURL = facebookPhotoURL;
            }
            
            await updateDoc(doc(db!, FirestoreCollection.Users, googleResult.user.uid), updateData);
            return { 
              success: true, 
              user: { ...userProfile, ...updateData } as UserProfile
            };
          }
          
          const userProfile: UserProfile = {
            uid: googleResult.user.uid,
            displayName: googleResult.user.displayName || existingProviderResult.user.displayName || email.split('@')[0],
            email: email,
            photoURL: googlePhotoURL || facebookPhotoURL || '',
            createdAt: new Date(),
            lastLoginAt: new Date(),
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            eloRating: 1200,
            achievements: []
          };
          await setDoc(doc(db!, FirestoreCollection.Users, googleResult.user.uid), userProfile);
          return { success: true, user: userProfile };
          
        } catch (linkError) {
          logError('loginWithGoogle: ❌ Failed to auto-link accounts:', { data: linkError }, LOG_AUTH_ERROR);
          const providerName = verifiedProviders.includes('facebook.com') ? 'Facebook' : verifiedProviders[0];
          return { 
            success: false, 
            error: `An account with this email already exists with ${providerName}. Please sign in with ${providerName} instead.` 
          };
        }
      }
    }
    
    logError('loginWithGoogle: ❌ Google login error:', {
      data: {
        code: firebaseError.code,
        message: firebaseError.message,
        fullError: firebaseError
      },
    }, LOG_AUTH_ERROR);
    const userFriendlyMessage = getAuthErrorMessage(error);
    if (!userFriendlyMessage) {
      return { success: false, error: undefined };
    }
    return { success: false, error: userFriendlyMessage };
  }
};

export const loginWithFacebook = async (): Promise<AuthResult> => {
  logInfo('loginWithFacebook: Starting Facebook login...', LOG_AUTH_SOCIAL);

  if (!isFirebaseConfigured()) {
    logError('loginWithFacebook: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    logInfo('loginWithFacebook: Creating FacebookAuthProvider...', LOG_AUTH_FLOW);
    const provider = new FacebookAuthProvider();
    logInfo('loginWithFacebook: Provider created, auth object:', { 
      data: { 
        hasAuth: !!auth, 
        currentUser: auth?.currentUser?.uid || null,
        appName: auth?.app?.name || null
      },
    }, LOG_AUTH_FLOW);
    logInfo(`loginWithFacebook: About to call signInWithPopup, current URL: ${window.location.href}`, { data: { url: window.location.href } }, LOG_AUTH_FLOW);
    const result = await signInWithPopup(auth!, provider);
    logInfo('loginWithFacebook: ✅ Popup login successful:', { 
      data: { 
        uid: result.user.uid, 
        email: result.user.email 
      },
    }, LOG_AUTH_SOCIAL);
    
    const email = result.user.email;
    if (email) {
      try {
        const signInMethods = await fetchSignInMethodsForEmail(auth!, email);
        logInfo('loginWithFacebook: Sign-in methods for email:', { data: signInMethods }, LOG_AUTH_FLOW);
      } catch (linkError) {
        logInfo('loginWithFacebook: Could not fetch sign-in methods (non-critical):', { data: linkError }, LOG_AUTH_FLOW);
      }
    }
    
    logInfo('loginWithFacebook: Checking Firestore for existing profile:', { data: { uid: result.user.uid } }, LOG_AUTH_FIRESTORE);
    const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, result.user.uid));
    let userProfile: UserProfile;

    const photoURL = result.user.photoURL || '';

    if (!userDoc.exists()) {
      logInfo('loginWithFacebook: Profile not found, creating new profile', LOG_AUTH_FLOW);
      userProfile = {
        uid: result.user.uid,
        displayName: result.user.displayName || result.user.email?.split('@')[0] || 'User',
        email: result.user.email || '',
        photoURL: photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        eloRating: 1200,
        achievements: []
      };
      
      logInfo('loginWithFacebook: Saving new profile to Firestore', LOG_AUTH_FIRESTORE);
      await setDoc(doc(db!, FirestoreCollection.Users, result.user.uid), userProfile);
      
      logInfo('loginWithFacebook: ✅ New profile created and saved', LOG_AUTH_SOCIAL);
    } else {
      logInfo('loginWithFacebook: User profile exists, updating lastLoginAt', LOG_AUTH_FLOW);
      userProfile = { ...userDoc.data() as UserProfile, uid: result.user.uid };
      const updateData: Partial<UserProfile> = {
        lastLoginAt: new Date()
      };
      
      if (result.user.photoURL && (!userProfile.photoURL || userProfile.photoURL !== result.user.photoURL)) {
        updateData.photoURL = photoURL;
        logInfo('loginWithFacebook: Updating photoURL from Facebook (will be proxied through Cloudflare Worker)', LOG_AUTH_FLOW);
      }
      
      await updateDoc(doc(db!, FirestoreCollection.Users, result.user.uid), updateData);
      userProfile = { ...userProfile, ...updateData };
      
      logInfo('loginWithFacebook: ✅ Login successful, profile loaded:', { 
        data: { 
          uid: userProfile.uid, 
          displayName: userProfile.displayName,
          gamesPlayed: userProfile.gamesPlayed,
          eloRating: userProfile.eloRating
        },
      }, LOG_AUTH_SOCIAL);
    }
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError & { customData?: { _tokenResponse?: { verifiedProvider?: string[]; email?: string } } };
    
    if (firebaseError.code === 'auth/account-exists-with-different-credential') {
      logInfo('loginWithFacebook: Account exists with different provider, attempting to auto-link...', LOG_AUTH_FLOW);
      
      const email = firebaseError.customData?._tokenResponse?.email;
      const verifiedProviders = firebaseError.customData?._tokenResponse?.verifiedProvider || [];
      
      if (email && verifiedProviders.length > 0) {
        logInfo('loginWithFacebook: Found existing account:', { data: { email, providers: verifiedProviders } }, LOG_AUTH_FLOW);
        
        if (auth?.currentUser && auth.currentUser.email === email) {
          logInfo('loginWithFacebook: User is already logged in with existing provider', LOG_AUTH_FLOW);
          const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, auth.currentUser.uid));
          if (userDoc.exists()) {
            const userProfile = { ...userDoc.data() as UserProfile, uid: auth.currentUser.uid };
            await updateDoc(doc(db!, FirestoreCollection.Users, auth.currentUser.uid), {
              lastLoginAt: new Date()
            });
            return { success: true, user: userProfile };
          }
        }
        
        const hasGoogle = verifiedProviders.includes('google.com');
        const providerName = hasGoogle ? 'Google' : verifiedProviders[0];
        
        logInfo(`loginWithFacebook: Auto-linking: signing in with ${providerName} first...`, LOG_AUTH_FLOW);
        
        try {
          let existingProviderResult;
          if (hasGoogle) {
            const googleProvider = new GoogleAuthProvider();
            existingProviderResult = await signInWithPopup(auth!, googleProvider);
          } else {
            return { 
              success: false, 
              error: `An account with this email already exists with ${providerName}. Please sign in with ${providerName} instead.` 
            };
          }
          
          logInfo(`loginWithFacebook: ✅ Signed in with ${providerName}, now linking Facebook...`, LOG_AUTH_SOCIAL);
          
          const facebookProvider = new FacebookAuthProvider();
          const facebookResult = await signInWithPopup(auth!, facebookProvider);
          
          logInfo('loginWithFacebook: ✅ Successfully linked Facebook to existing account', LOG_AUTH_SOCIAL);
          
          const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, facebookResult.user.uid));
          const facebookPhotoURL = facebookResult.user.photoURL;
          const googlePhotoURL = existingProviderResult.user.photoURL;
          
          if (userDoc.exists()) {
            const userProfile = { ...userDoc.data() as UserProfile, uid: facebookResult.user.uid };
            const updateData: Partial<UserProfile> = {
              lastLoginAt: new Date()
            };
            
            if (facebookPhotoURL && (!userProfile.photoURL || userProfile.photoURL === googlePhotoURL)) {
              updateData.photoURL = facebookPhotoURL;
            } else if (googlePhotoURL && !userProfile.photoURL) {
              updateData.photoURL = googlePhotoURL;
            }
            
            await updateDoc(doc(db!, FirestoreCollection.Users, facebookResult.user.uid), updateData);
            return { 
              success: true, 
              user: { ...userProfile, ...updateData } as UserProfile
            };
          }
          
          const userProfile: UserProfile = {
            uid: facebookResult.user.uid,
            displayName: facebookResult.user.displayName || existingProviderResult.user.displayName || email.split('@')[0],
            email: email,
            photoURL: facebookPhotoURL || googlePhotoURL || '',
            createdAt: new Date(),
            lastLoginAt: new Date(),
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            eloRating: 1200,
            achievements: []
          };
          await setDoc(doc(db!, FirestoreCollection.Users, facebookResult.user.uid), userProfile);
          return { success: true, user: userProfile };
          
        } catch (linkError) {
          logError('loginWithFacebook: ❌ Failed to auto-link accounts:', { data: linkError }, LOG_AUTH_ERROR);
          const providerName = verifiedProviders.includes('google.com') ? 'Google' : verifiedProviders[0];
          return { 
            success: false, 
            error: `An account with this email already exists with ${providerName}. Please sign in with ${providerName} instead.` 
          };
        }
      }
    }
    
    logError('loginWithFacebook: ❌ Facebook login error:', { data: { firebaseError, fullError: error } }, LOG_AUTH_ERROR);
    const userFriendlyMessage = getAuthErrorMessage(error);
    if (!userFriendlyMessage) {
      return { success: false, error: undefined };
    }
    return { success: false, error: userFriendlyMessage };
  }
};

export const loginAsGuest = async (): Promise<AuthResult> => {
  logInfo('loginAsGuest: Starting guest login...', LOG_AUTH_GUEST);

  if (!isFirebaseConfigured()) {
    logError('loginAsGuest: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }
  try {
    logInfo('loginAsGuest: Signing in anonymously...', LOG_AUTH_FLOW);
    const userCredential = await signInAnonymously(auth!);
    const user = userCredential.user;
    
    logInfo('loginAsGuest: Anonymous sign in successful:', { data: { uid: user.uid } }, LOG_AUTH_GUEST);
    
    logInfo('loginAsGuest: Checking Firestore for existing profile:', { data: { uid: user.uid } }, LOG_AUTH_FIRESTORE);
    const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, user.uid));
    let userProfile: UserProfile;

    if (!userDoc.exists()) {
      logInfo('loginAsGuest: Creating new guest profile in Firestore', LOG_AUTH_FLOW);
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
      await setDoc(doc(db!, FirestoreCollection.Users, user.uid), userProfile);
    } else {
      logInfo('loginAsGuest: Guest profile exists, updating lastLoginAt', LOG_AUTH_FLOW);
      userProfile = { ...userDoc.data() as UserProfile, uid: user.uid };
      await updateDoc(doc(db!, FirestoreCollection.Users, user.uid), {
        lastLoginAt: new Date()
      });
    }
    
    logInfo('loginAsGuest: ✅ Guest login successful:', { 
      data: { 
        uid: userProfile.uid, 
        displayName: userProfile.displayName 
      },
    }, LOG_AUTH_GUEST);
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logError('loginAsGuest: ❌ Anonymous login error:', { data: firebaseError }, LOG_AUTH_ERROR);
    const userFriendlyMessage = getAuthErrorMessage(error);
    return { success: false, error: userFriendlyMessage };
  }
};

export const loginWithWallet = async (
  walletPublicKey: string,
  _signature: Uint8Array,
  message: Uint8Array
): Promise<AuthResult> => {
  logInfo('loginWithWallet: Starting wallet login...', { data: { walletPublicKey } }, LOG_AUTH_SOCIAL);

  if (!isFirebaseConfigured()) {
    logError('loginWithWallet: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const messageText = new TextDecoder().decode(message);
    const nonceMatch = messageText.match(/Nonce:\s*([^\n]+)/);
    const nonce = nonceMatch ? nonceMatch[1].trim() : null;
    
    if (nonce) {
      logInfo('loginWithWallet: Checking nonce for replay protection...', { data: { nonce } }, LOG_AUTH_FIRESTORE);
      const noncesRef = collection(db!, FirestoreCollection.Nonces);
      const nonceQuery = query(noncesRef, where('nonce', '==', nonce));
      const nonceDocs = await getDocs(nonceQuery);
      
      if (!nonceDocs.empty) {
        const nonceDoc = nonceDocs.docs[0];
        const nonceData = nonceDoc.data();
        const expiresAt = nonceData.expiresAt?.toDate();
        
        if (expiresAt && expiresAt < new Date()) {
          logInfo('loginWithWallet: Nonce expired, deleting...', LOG_AUTH_FIRESTORE);
          await deleteDoc(nonceDoc.ref);
        } else if (expiresAt && expiresAt >= new Date()) {
          logError('loginWithWallet: ❌ Replay attack detected - nonce already used', LOG_AUTH_ERROR);
          return { success: false, error: 'This signature has already been used. Please sign in again.' };
        }
      }
      
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const nonceDocRef = doc(db!, FirestoreCollection.Nonces, nonce);
      await setDoc(nonceDocRef, {
        nonce: nonce,
        walletAddress: walletPublicKey,
        createdAt: Timestamp.now(),
        expiresAt: Timestamp.fromDate(expiresAt)
      });
      logInfo('loginWithWallet: Nonce stored with expiration:', { data: { nonce, expiresAt } }, LOG_AUTH_FIRESTORE);
    }
    
    logInfo('loginWithWallet: Checking for existing wallet-linked account...', LOG_AUTH_FIRESTORE);
    const usersRef = collection(db!, FirestoreCollection.Users);
    const walletQuery = query(usersRef, where('walletAddress', '==', walletPublicKey));
    const walletQuerySnapshot = await getDocs(walletQuery);
    
    let userProfile: UserProfile;
    let firebaseUser: FirebaseUser;

    if (!walletQuerySnapshot.empty) {
      logInfo('loginWithWallet: Found existing account linked to wallet', LOG_AUTH_FLOW);
      const existingUserDoc = walletQuerySnapshot.docs[0];
      const existingProfile = existingUserDoc.data() as UserProfile;
      
      const userCredential = await signInAnonymously(auth!);
      firebaseUser = userCredential.user;
      
      await updateDoc(doc(db!, FirestoreCollection.Users, existingUserDoc.id), {
        uid: firebaseUser.uid,
        lastLoginAt: new Date()
      });
      
      userProfile = {
        ...existingProfile,
        uid: firebaseUser.uid,
        lastLoginAt: new Date()
      };
    } else {
      logInfo('loginWithWallet: Creating new wallet-linked account', LOG_AUTH_FLOW);
      const userCredential = await signInAnonymously(auth!);
      firebaseUser = userCredential.user;
      
      userProfile = {
        uid: firebaseUser.uid,
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
      };
      
      await setDoc(doc(db!, FirestoreCollection.Users, firebaseUser.uid), userProfile);
      logInfo('loginWithWallet: ✅ New wallet-linked account created:', { 
        data: { 
          uid: userProfile.uid, 
          walletAddress: walletPublicKey 
        },
      }, LOG_AUTH_REGISTER);
    }
    
    if (nonce) {
      try {
        const nonceDocRef = doc(db!, FirestoreCollection.Nonces, nonce);
        await deleteDoc(nonceDocRef);
        logInfo('loginWithWallet: Nonce deleted after successful auth', LOG_AUTH_FIRESTORE);
      } catch (nonceError) {
        logError('loginWithWallet: Failed to delete nonce (non-critical):', { data: nonceError }, LOG_AUTH_ERROR);
      }
    }
    
    logInfo('loginWithWallet: ✅ Wallet login successful:', { 
      data: { 
        uid: userProfile.uid, 
        walletAddress: walletPublicKey 
      },
    }, LOG_AUTH_LOGIN);
    
    return { success: true, user: userProfile };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logError('loginWithWallet: ❌ Wallet login error:', { data: firebaseError }, LOG_AUTH_ERROR);
    const userFriendlyMessage = getAuthErrorMessage(error) || 'Failed to sign in with wallet. Please try again.';
    return { success: false, error: userFriendlyMessage };
  }
};

export const addMatchToHistory = async (
  userId: string,
  matchId: string
): Promise<{ success: boolean; error?: string }> => {
  logInfo('addMatchToHistory: Adding match to history:', { data: { userId, matchId } }, LOG_AUTH_FIRESTORE);

  if (!isFirebaseConfigured()) {
    logError('addMatchToHistory: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const userDoc = doc(db!, FirestoreCollection.Users, userId);
    const userDocSnapshot = await getDoc(userDoc);

    if (!userDocSnapshot.exists()) {
      logError('addMatchToHistory: ❌ User not found:', { data: { userId } }, LOG_AUTH_ERROR);
      return { success: false, error: 'User not found' };
    }

    const userData = userDocSnapshot.data() as UserProfile;
    const matchIds = userData.matchIds || [];

    if (matchIds.includes(matchId)) {
      logInfo('addMatchToHistory: Match already in history:', { data: { userId, matchId } }, LOG_AUTH_FIRESTORE);
      return { success: true };
    }

    const updatedMatchIds = [matchId, ...matchIds].slice(0, 100);
    const updatedMatchHistory = userData.matchHistory ? [matchId, ...userData.matchHistory].slice(0, 100) : updatedMatchIds;

    await updateDoc(userDoc, {
      matchHistory: updatedMatchHistory,
      matchIds: updatedMatchIds,
    });

    logInfo('addMatchToHistory: ✅ Match added to history:', { data: { userId, matchId } }, LOG_AUTH_FIRESTORE);
    return { success: true };
  } catch (error) {
    logError('addMatchToHistory: ❌ Error:', { data: error }, LOG_AUTH_ERROR);
    const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to add match to history';
    return { success: false, error: userFriendlyMessage };
  }
};

export const getMatchHistory = async (
  userId: string
): Promise<{ success: boolean; matchIds?: string[]; error?: string }> => {
  logInfo('getMatchHistory: Getting match history:', { data: { userId } }, LOG_AUTH_FIRESTORE);

  if (!isFirebaseConfigured()) {
    logError('getMatchHistory: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const userDoc = doc(db!, FirestoreCollection.Users, userId);
    const userDocSnapshot = await getDoc(userDoc);

    if (!userDocSnapshot.exists()) {
      logError('getMatchHistory: ❌ User not found:', { data: { userId } }, LOG_AUTH_ERROR);
      return { success: false, error: 'User not found' };
    }

    const userData = userDocSnapshot.data() as UserProfile;
    const matchIds = userData.matchIds || [];

    logInfo('getMatchHistory: ✅ Match history retrieved:', { data: { userId, count: matchIds.length } }, LOG_AUTH_FIRESTORE);
    return { success: true, matchIds };
  } catch (error) {
    logError('getMatchHistory: ❌ Error:', { data: error }, LOG_AUTH_ERROR);
    const userFriendlyMessage = error instanceof Error ? error.message : 'Failed to get match history';
    return { success: false, error: userFriendlyMessage };
  }
};

export const logoutUser = async (): Promise<{ success: boolean; error?: string }> => {
  logInfo('logoutUser: Starting logout...', LOG_AUTH_LOGOUT);

  if (!isFirebaseConfigured()) {
    logError('logoutUser: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    await signOut(auth!);
    logInfo('logoutUser: ✅ Logout successful', LOG_AUTH_LOGOUT);
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logError('logoutUser: ❌ Logout error:', { data: firebaseError }, LOG_AUTH_ERROR);
    return { success: false, error: firebaseError.message };
  }
};

function base64ToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

async function uploadAvatarToR2(dataUrl: string, userId: string): Promise<string | null> {
  try {
    const config = getStorageConfig();
    if (config.r2Assets?.workerUrl) {
      logInfo('uploadAvatarToR2: R2 not configured, skipping upload', LOG_AUTH_FLOW);
      return null;
    }

    const blob = base64ToBlob(dataUrl);
    const r2Service = new R2Service({
      workerUrl: config.r2Assets!.workerUrl,
      bucketName: config.r2Assets!.bucketName || StorageBucketName.DefaultAssets,
    });

    const r2Path = `users/${userId}/avatar.png`;
    const r2Url = await r2Service.uploadAsset(r2Path, blob, 'image/png');
    logInfo('uploadAvatarToR2: ✅ Avatar uploaded to R2:', { data: r2Url }, LOG_AUTH_FLOW);
    return r2Url;
  } catch (error) {
    logError('uploadAvatarToR2: ❌ Failed to upload avatar to R2:', { data: error }, LOG_AUTH_ERROR);
    return null;
  }
}

export async function uploadProfilePictureToStorage(
  imageUrl: string,
  userId: string
): Promise<string> {
  if (!storage || !imageUrl) {
    return imageUrl;
  }

  if (imageUrl.includes('firebasestorage.googleapis.com') || imageUrl.includes('firebase')) {
    logInfo('uploadProfilePictureToStorage: Already a Firebase Storage URL, skipping upload', LOG_AUTH_FLOW);
    return imageUrl;
  }

  try {
    logInfo('uploadProfilePictureToStorage: Downloading image from:', { data: imageUrl}, LOG_AUTH_FLOW);
    
    const response = await fetch(imageUrl, {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!response.ok) {
      logError('uploadProfilePictureToStorage: Failed to download image:', { data: { status: response.status, statusText: response.statusText }}, LOG_AUTH_ERROR);
      return imageUrl;
    }
    
    const blob = await response.blob();
    
    if (blob.size === 0) {
      logError('uploadProfilePictureToStorage: Empty blob received', LOG_AUTH_ERROR);
      return imageUrl;
    }
    
    logInfo('uploadProfilePictureToStorage: Image downloaded, size:', { data: blob.size}, LOG_AUTH_FLOW);
    
    const contentType = blob.type || 'image/jpeg';
    const extension = contentType.includes('png') ? 'png' : contentType.includes('gif') ? 'gif' : 'jpg';
    const fileName = `profile-pictures/${userId}/avatar.${extension}`;
    
    const storageRef = ref(storage, fileName);
    logInfo('uploadProfilePictureToStorage: Uploading to Firebase Storage:', { data: fileName}, LOG_AUTH_FLOW);
    
    await uploadBytes(storageRef, blob, {
      contentType: blob.type || 'image/jpeg',
      cacheControl: 'public, max-age=31536000',
    });
    
    const downloadURL = await getDownloadURL(storageRef);
    logInfo('uploadProfilePictureToStorage: ✅ Image uploaded to Firebase Storage:', { data: downloadURL}, LOG_AUTH_FLOW);
    
    return downloadURL;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logError('uploadProfilePictureToStorage: ❌ Error uploading to Firebase Storage:', { data: errorMessage}, LOG_AUTH_ERROR);
    
    if (errorMessage.includes('permission') || errorMessage.includes('403') || errorMessage.includes('404') || errorMessage.includes('CORS')) {
      logError('uploadProfilePictureToStorage: ⚠️ Firebase Storage may not be configured. Check:', LOG_AUTH_ERROR);
      logError('uploadProfilePictureToStorage: 1. Firebase Storage security rules (storage.rules)', LOG_AUTH_ERROR);
      logError('uploadProfilePictureToStorage: 2. VITE_FIREBASE_STORAGE_BUCKET environment variable', LOG_AUTH_ERROR);
      logError('uploadProfilePictureToStorage: 3. CORS configuration in Firebase Console', LOG_AUTH_ERROR);
    }
    
    return imageUrl;
  }
}

export const updateUserProfile = async (
  uid: string,
  updates: {
    displayName?: string;
    photoURL?: string;
  }
): Promise<{ success: boolean; error?: string }> => {
  logInfo('updateUserProfile: Starting profile update:', { data: { uid, updates }}, LOG_AUTH_FLOW);

  if (!isFirebaseConfigured()) {
    logError('updateUserProfile: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    let finalPhotoURL = updates.photoURL;
    
    if (updates.photoURL && updates.photoURL.startsWith('data:image/')) {
      const r2Url = await uploadAvatarToR2(updates.photoURL, uid);
      if (r2Url) {
        finalPhotoURL = r2Url;
        logInfo('updateUserProfile: Avatar uploaded to R2, using R2 URL', LOG_AUTH_FLOW);
      } else {
        logWarn('updateUserProfile: R2 upload failed, keeping base64 in Firestore', LOG_AUTH_FLOW);
      }
    }
    
    const isBase64 = finalPhotoURL?.startsWith('data:image/');
    
    if (auth?.currentUser && auth.currentUser.uid === uid && !isBase64 && finalPhotoURL) {
      await updateProfile(auth.currentUser, { 
        displayName: updates.displayName,
        photoURL: finalPhotoURL 
      });
      logInfo('updateUserProfile: Firebase Auth profile updated', LOG_AUTH_FLOW);
    } else if (isBase64) {
      if (updates.displayName && auth?.currentUser && auth.currentUser.uid === uid) {
        await updateProfile(auth.currentUser, { displayName: updates.displayName });
      }
      logInfo('updateUserProfile: Skipping Auth update for base64 image (size limit)', LOG_AUTH_FLOW);
    }

    const updateData: Partial<UserProfile> = {};
    if (updates.displayName !== undefined) updateData.displayName = updates.displayName;
    if (finalPhotoURL !== undefined) updateData.photoURL = finalPhotoURL;

    await updateDoc(doc(db!, FirestoreCollection.Users, uid), updateData);
    logInfo('updateUserProfile: ✅ Firestore profile updated', LOG_AUTH_FLOW);
    
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logError('updateUserProfile: ❌ Profile update error:', { data: firebaseError}, LOG_AUTH_ERROR);
    const userFriendlyMessage = getAuthErrorMessage(error);
    return { success: false, error: userFriendlyMessage };
  }
};

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
  if (!isFirebaseConfigured()) {
    return { success: false, error: 'Firebase not configured' };
  }
  
  try {
    if (stats.gamesPlayed !== undefined) {
      const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as UserProfile;
        const wins = stats.wins !== undefined ? stats.wins : userData.wins;
        const winRate = stats.gamesPlayed > 0 ? (wins / stats.gamesPlayed) * 100 : 0;
        stats = { ...stats, winRate };
      }
    }
    
    await updateDoc(doc(db!, FirestoreCollection.Users, uid), stats);
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    if (LOG_AUTH_ERROR) logError('Update user stats error:', { data: firebaseError }, LOG_AUTH_ERROR);
    return { success: false, error: firebaseError.message };
  }
};

export const handleRedirectResult = async (): Promise<AuthResult> => {
  logInfo('handleRedirectResult: Checking for redirect result...', LOG_AUTH_REDIRECT);

  if (!isFirebaseConfigured()) {
    logError('handleRedirectResult: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    const result = await getRedirectResult(auth!);
    if (result) {
      logInfo('handleRedirectResult: ✅ Redirect result found:', { 
        data: { 
          uid: result.user.uid, 
          email: result.user.email,
          provider: result.providerId 
        },
      }, LOG_AUTH_REDIRECT);
      const user = result.user;
      
      logInfo('handleRedirectResult: Checking Firestore for existing profile:', { data: { uid: user.uid }}, LOG_AUTH_FIRESTORE);
      const userDoc = await getDoc(doc(db!, FirestoreCollection.Users, user.uid));
    let userProfile: UserProfile;

    if (!userDoc.exists()) {
      logInfo('handleRedirectResult: Profile not found, creating new profile', LOG_AUTH_FLOW);
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
        
      logInfo('handleRedirectResult: Saving new profile to Firestore', LOG_AUTH_FIRESTORE);
        await setDoc(doc(db!, FirestoreCollection.Users, user.uid), userProfile);
        
        logInfo('handleRedirectResult: ✅ New profile created and saved', LOG_AUTH_REDIRECT);
      } else {
        logInfo('handleRedirectResult: Profile exists, updating lastLoginAt', LOG_AUTH_FLOW);
        userProfile = { ...userDoc.data() as UserProfile, uid: user.uid };
        await updateDoc(doc(db!, FirestoreCollection.Users, user.uid), {
          lastLoginAt: new Date()
        });
        
        logInfo('handleRedirectResult: ✅ Profile loaded from Firestore:', { 
          data: { 
            uid: userProfile.uid, 
            displayName: userProfile.displayName 
          },
        }, LOG_AUTH_REDIRECT);
      }
      
      return { success: true, user: userProfile };
    } else {
      logInfo('handleRedirectResult: No redirect result found (normal if not returning from OAuth)', LOG_AUTH_REDIRECT);
      return { success: false, error: 'No redirect result' };
    }
    } catch (error: unknown) {
      const firebaseError = error as FirebaseError;
      logError('handleRedirectResult: ❌ Redirect result error:', { data: { firebaseError, fullError: error }}, LOG_AUTH_ERROR);
      const userFriendlyMessage = getAuthErrorMessage(error);
    return { success: false, error: userFriendlyMessage };
  }
};

export const sendPasswordReset = async (email: string): Promise<{ success: boolean; error?: string }> => {
  logInfo('sendPasswordReset: Sending password reset email:', { data: { email }}, LOG_AUTH_FLOW);

  if (!isFirebaseConfigured()) {
    logError('sendPasswordReset: ❌ Firebase not configured', LOG_AUTH_ERROR);
    return { success: false, error: 'Firebase not configured' };
  }

  try {
    await sendPasswordResetEmail(auth!, email);
    logInfo('sendPasswordReset: ✅ Password reset email sent', LOG_AUTH_FLOW);
    return { success: true };
  } catch (error: unknown) {
    const firebaseError = error as FirebaseError;
    logError('sendPasswordReset: ❌ Password reset error:', { data: firebaseError}, LOG_AUTH_ERROR);
    const userFriendlyMessage = getAuthErrorMessage(error);
    return { success: false, error: userFriendlyMessage };
  }
};

