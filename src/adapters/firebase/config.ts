/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import type { FirebaseStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import type { Functions } from 'firebase/functions';
import { MainAppLogger } from '@ocentra/logging-domain/core/mainAppLogger';
import { getStackTrace } from '@ocentra/logging-domain/core/stackTrace';
import { ServiceRegistry } from '@ocentra/app-core/ServiceRegistry';

let firebaseConfigRegistered = false;
function getLog() {
  if (!firebaseConfigRegistered) {
    MainAppLogger.instance.register(import.meta.url);
    firebaseConfigRegistered = true;
  }
  return MainAppLogger.instance;
}
const logInfo = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  const log = getLog();
  if (typeof dataOrEnabled === 'boolean') {
    log.logInfo(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logInfo(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logWarn = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  const log = getLog();
  if (typeof dataOrEnabled === 'boolean') {
    log.logWarn(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logWarn(message, getStackTrace(), dataOrEnabled, enabled);
  }
};
const logError = (message: string, dataOrEnabled?: unknown | boolean, enabled?: boolean) => {
  const log = getLog();
  if (typeof dataOrEnabled === 'boolean') {
    log.logError(message, getStackTrace(), undefined, dataOrEnabled);
  } else {
    log.logError(message, getStackTrace(), dataOrEnabled, enabled);
  }
};

const LOG_FIREBASE_INIT = false;

const hasFirebaseConfig = import.meta.env.VITE_FIREBASE_API_KEY && 
                         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
                         import.meta.env.VITE_FIREBASE_PROJECT_ID;

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let functions: Functions | null = null;

class FirebaseInitializer {
  static executionOrder = 10;

  static async getInstance(): Promise<void> {
    if (app) {
      return;
    }

    if (!hasFirebaseConfig) {
      logWarn('⚠️ Firebase configuration not found. Running in offline mode.');
      logInfo('To enable Firebase, add your configuration to the .env file');
      return;
    }

  try {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID
    };

    logInfo('Initializing Firebase app...', undefined, LOG_FIREBASE_INIT);

    app = initializeApp(firebaseConfig);
    
    auth = getAuth(app);
    db = getFirestore(app);
    functions = getFunctions(app);
    
    if (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET) {
      storage = getStorage(app);
    }
    
    logInfo('✅ Firebase initialized successfully', undefined, LOG_FIREBASE_INIT);
    logInfo('Auth, Firestore, and Functions services ready', undefined, LOG_FIREBASE_INIT);
  } catch (error) {
    logError('❌ Failed to initialize Firebase:', error);
    app = null;
    auth = null;
    db = null;
  }
  }
}

if (hasFirebaseConfig) {
  ServiceRegistry.register(
    FirebaseInitializer,
    'Firebase',
    () => FirebaseInitializer.getInstance()
  );
}

export function waitForAuthResolution(): Promise<void> {
  if (!auth) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth!, () => {
      unsubscribe();
      resolve();
    });
  });
}

export { auth, db, storage, functions };
export default app;

