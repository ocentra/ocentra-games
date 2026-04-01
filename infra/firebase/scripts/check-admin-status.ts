import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { readFileSync } from 'fs';

const projectRoot = join(__dirname, '../../..');
dotenv.config({ path: join(projectRoot, '.env') });

async function initializeAdmin() {
  if (admin.apps.length === 0) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    
    if (serviceAccountPath) {
      const serviceAccountPathResolved = serviceAccountPath.startsWith('/') || serviceAccountPath.match(/^[A-Z]:/) 
        ? serviceAccountPath 
        : join(projectRoot, serviceAccountPath);
      const serviceAccountJson = readFileSync(serviceAccountPathResolved, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountJson) as admin.ServiceAccount;
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: projectId || serviceAccount.project_id,
      });
    } else if (projectId) {
      admin.initializeApp({
        projectId,
      });
    } else {
      console.error('\n❌ Missing credentials!');
      console.error('\nChoose one option:');
      console.error('\nOption 1: Use Application Default Credentials (recommended)');
      console.error('  1. Install gcloud: https://cloud.google.com/sdk/docs/install');
      console.error('  2. Run: gcloud auth application-default login');
      console.error('  3. Then run this script again\n');
      console.error('Option 2: Use Service Account JSON');
      console.error('  1. Go to Firebase Console → Project Settings → Service Accounts');
      console.error('  2. Click "Generate New Private Key"');
      console.error('  3. Add to .env: FIREBASE_SERVICE_ACCOUNT_PATH=path/to/file.json');
      console.error('  4. Then run this script again\n');
      throw new Error('Firebase credentials not configured');
    }
  }
  
  return admin.firestore();
}

async function checkAdminStatus(email?: string) {
  console.log('🔧 Initializing Firebase Admin SDK...');
  
  try {
    let db;
    try {
      db = await initializeAdmin();
    } catch (initError: unknown) {
      const error = initError as Error;
      if (error.message?.includes('Could not load the default credentials') || 
          error.message?.includes('credentials')) {
        console.error('\n❌ Missing credentials!');
        console.error('\nChoose one option:');
        console.error('\nOption 1: Use Application Default Credentials (recommended)');
        console.error('  1. Install gcloud: https://cloud.google.com/sdk/docs/install');
        console.error('  2. Run: gcloud auth application-default login');
        console.error('  3. Then run this script again\n');
        console.error('Option 2: Use Service Account JSON');
        console.error('  1. Go to Firebase Console → Project Settings → Service Accounts');
        console.error('  2. Click "Generate New Private Key"');
        console.error('  3. Add to .env: FIREBASE_SERVICE_ACCOUNT_PATH=path/to/file.json');
        console.error('  4. Then run this script again\n');
        process.exit(1);
      }
      throw error;
    }
    
    if (email) {
      console.log(`\n🔍 Checking admin status for: ${email}\n`);
      
      const usersRef = db.collection('users');
      const querySnapshot = await usersRef.where('email', '==', email).get();
      
      if (querySnapshot.empty) {
        console.log(`❌ User not found: ${email}`);
        process.exit(1);
      }
      
      for (const userDoc of querySnapshot.docs) {
        const userData = userDoc.data();
        const isAdmin = userData.isAdmin || false;
        
        console.log(`User: ${email}`);
        console.log(`  UID: ${userDoc.id}`);
        console.log(`  isAdmin: ${isAdmin}`);
        console.log(`  Display Name: ${userData.displayName || 'N/A'}`);
      }
    } else {
      console.log('\n🔍 Listing all admin users...\n');
      
      const usersRef = db.collection('users');
      const adminUsers = await usersRef.where('isAdmin', '==', true).get();
      
      if (adminUsers.empty) {
        console.log('❌ No admin users found');
        process.exit(0);
      }
      
      console.log(`Found ${adminUsers.size} admin user(s):\n`);
      
      for (const userDoc of adminUsers.docs) {
        const userData = userDoc.data();
        
        console.log(`  - ${userData.email || 'N/A'} (${userDoc.id})`);
        console.log(`    Display Name: ${userData.displayName || 'N/A'}`);
        console.log('');
      }
    }
    
    process.exit(0);
  } catch (error: unknown) {
    const err = error as Error & { code?: number };
    if (err.message?.includes('Could not load the default credentials') || 
        err.message?.includes('credentials') ||
        err.code === 7) {
      console.error('\n❌ Missing credentials!');
      console.error('\nChoose one option:');
      console.error('\nOption 1: Use Application Default Credentials (recommended)');
      console.error('  1. Install gcloud: https://cloud.google.com/sdk/docs/install');
      console.error('  2. Run: gcloud auth application-default login');
      console.error('  3. Then run this script again\n');
      console.error('Option 2: Use Service Account JSON');
      console.error('  1. Go to Firebase Console → Project Settings → Service Accounts');
      console.error('  2. Click "Generate New Private Key"');
      console.error('  3. Add to .env: FIREBASE_SERVICE_ACCOUNT_PATH=path/to/file.json');
      console.error('  4. Then run this script again\n');
      process.exit(1);
    }
    console.error('❌ Fatal error:', err);
    process.exit(1);
  }
}

const email = process.argv[2];
checkAdminStatus(email);

