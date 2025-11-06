// Firebase configuration
import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

const prefix = '[FirebaseConfig]';

// Auth flow logging flags
const LOG_AUTH_FLOW = false;        // Main auth flow tracking
const LOG_AUTH_INIT = false;        // Firebase initialization
const LOG_AUTH_CONFIG = false;      // Configuration status
const LOG_AUTH_ERROR = false;        // Error logging

// Check if Firebase config is available
const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY && 
                         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
                         import.meta.env.VITE_FIREBASE_PROJECT_ID;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (hasFirebaseConfig) {
  try {
    // Firebase configuration
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    // Log configuration status for debugging (without exposing sensitive data)
    if (LOG_AUTH_CONFIG) {
      console.log(prefix, 'Firebase config status:', {
        hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
        hasAuthDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
        hasStorageBucket: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        hasMessagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        hasAppId: !!import.meta.env.VITE_FIREBASE_APP_ID
      });
    }

    if (LOG_AUTH_INIT) {
      console.log(prefix, 'Initializing Firebase app...');
    }

    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    
    // Initialize Firebase services
    auth = getAuth(app);
    db = getFirestore(app);
    
    if (LOG_AUTH_INIT) {
      console.log(prefix, '✅ Firebase initialized successfully');
    }
    if (LOG_AUTH_FLOW) {
      console.log(prefix, 'Auth and Firestore services ready');
    }
  } catch (error) {
    if (LOG_AUTH_ERROR) {
      console.error(prefix, '❌ Failed to initialize Firebase:', error);
    }
    app = null;
    auth = null;
    db = null;
  }
} else {
  if (LOG_AUTH_FLOW) {
    console.warn(prefix, '⚠️ Firebase configuration not found. Running in offline mode.');
    console.info(prefix, 'To enable Firebase, add your configuration to the .env file');
  }
}

export { auth, db };
export default app;