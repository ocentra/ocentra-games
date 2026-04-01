import * as admin from 'firebase-admin';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { readFileSync } from 'fs';

const projectRoot = join(__dirname, '../../..');
dotenv.config({ path: join(projectRoot, '.env') });

const ADMIN_EMAILS = process.env.FIREBASE_ADMIN_EMAILS
  ? process.env.FIREBASE_ADMIN_EMAILS.split(',').map(email => email.trim()).filter(email => email.length > 0)
  : [];

async function initializeAdmin() {
  if (admin.apps.length === 0) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
    
    if (serviceAccountPath) {
      const serviceAccountPathResolved = serviceAccountPath.startsWith('/') || serviceAccountPath.match(/^[A-Z]:/) 
        ? serviceAccountPath 
        : join(projectRoot, serviceAccountPath);
      const serviceAccountJson = readFileSync(serviceAccountPathResolved, 'utf8');
      const serviceAccount = JSON.parse(serviceAccountJson);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
        projectId: projectId || (serviceAccount as { project_id?: string }).project_id,
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

async function setAdminUsers() {
  if (ADMIN_EMAILS.length === 0) {
    console.error('\n❌ FIREBASE_ADMIN_EMAILS not set in .env!');
    console.error('\nAdd to your .env file:');
    console.error('FIREBASE_ADMIN_EMAILS=sujanmishra@gmail.com,ocentraai@gmail.com');
    console.error('\nSeparate multiple emails with commas.\n');
    process.exit(1);
  }

  console.log('🔧 Initializing Firebase Admin SDK...');
  
  try {
    let db;
    try {
      db = await initializeAdmin();
    } catch (initError: unknown) {
      const error = initError as { message?: string };
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
      throw initError;
    }
    
    console.log('\n📋 Admin emails to grant access:');
    ADMIN_EMAILS.forEach(email => console.log(`  - ${email}`));
    
    console.log('\n🔍 Searching for users in Firestore...\n');
    
    let successCount = 0;
    let notFoundCount = 0;
    
    for (const email of ADMIN_EMAILS) {
      try {
        const usersRef = db.collection('users');
        const querySnapshot = await usersRef.where('email', '==', email).get();
        
        if (querySnapshot.empty) {
          console.log(`❌ User not found: ${email}`);
          console.log(`   → User must sign in at least once before being granted admin access\n`);
          notFoundCount++;
          continue;
        }
        
        for (const userDoc of querySnapshot.docs) {
          const userData = userDoc.data();
          const currentAdminStatus = userData.isAdmin || false;
          
          if (currentAdminStatus) {
            console.log(`✓  Already admin: ${email} (uid: ${userDoc.id})`);
          } else {
            await userDoc.ref.update({
              isAdmin: true,
            });
            console.log(`✅ Granted admin: ${email} (uid: ${userDoc.id})`);
          }
          successCount++;
        }
      } catch (error) {
        console.error(`❌ Error processing ${email}:`, error);
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`  ✅ Admin users set: ${successCount}`);
    console.log(`  ❌ Users not found: ${notFoundCount}`);
    
    if (notFoundCount > 0) {
      console.log('\n⚠️  Note: Users not found must sign in to the app first.');
      console.log('   After they sign in, run this script again to grant admin access.');
    }
    
    console.log('\n✨ Done!');
    process.exit(0);
  } catch (error: unknown) {
    const err = error as { message?: string; code?: number };
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
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

setAdminUsers();

