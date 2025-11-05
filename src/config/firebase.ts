// Firebase configuration
import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

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
    console.log('Firebase config status:', {
      hasApiKey: !!import.meta.env.VITE_FIREBASE_API_KEY,
      hasAuthDomain: !!import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      hasProjectId: !!import.meta.env.VITE_FIREBASE_PROJECT_ID,
      hasStorageBucket: !!import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      hasMessagingSenderId: !!import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      hasAppId: !!import.meta.env.VITE_FIREBASE_APP_ID
    });

    // Initialize Firebase
    app = initializeApp(firebaseConfig);
    
    // Initialize Firebase services
    auth = getAuth(app);
    db = getFirestore(app);
    
    console.log('Firebase initialized successfully');
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    app = null;
    auth = null;
    db = null;
  }
} else {
  console.warn('Firebase configuration not found. Running in offline mode.');
  console.info('To enable Firebase, add your configuration to the .env file');
}

export { auth, db };
export default app;