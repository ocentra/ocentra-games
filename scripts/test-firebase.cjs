// Script to test Firebase configuration
// Run with: node scripts/test-firebase.cjs

// Load environment variables
require('dotenv').config({ path: '.env' });

console.log('Firebase Configuration Test');
console.log('==========================');

// Check environment variables
const hasApiKey = !!process.env.VITE_FIREBASE_API_KEY && process.env.VITE_FIREBASE_API_KEY !== 'your_actual_api_key_here';
const hasAuthDomain = !!process.env.VITE_FIREBASE_AUTH_DOMAIN && process.env.VITE_FIREBASE_AUTH_DOMAIN !== 'your_project_id.firebaseapp.com';
const hasProjectId = !!process.env.VITE_FIREBASE_PROJECT_ID && process.env.VITE_FIREBASE_PROJECT_ID !== 'your_actual_project_id_here';

console.log('\nEnvironment Variables Check:');
console.log('VITE_FIREBASE_API_KEY:', hasApiKey ? '✅ Set' : '❌ Missing or placeholder');
console.log('VITE_FIREBASE_AUTH_DOMAIN:', hasAuthDomain ? '✅ Set' : '❌ Missing or placeholder');
console.log('VITE_FIREBASE_PROJECT_ID:', hasProjectId ? '✅ Set' : '❌ Missing or placeholder');

const isFullyConfigured = hasApiKey && hasAuthDomain && hasProjectId;

if (isFullyConfigured) {
  console.log('\n✅ Firebase configuration appears to be complete');
  console.log('You can now run the application with Firebase integration');
} else {
  console.log('\n⚠️ Firebase configuration is incomplete');
  console.log('Please update your .env file with actual Firebase configuration values');
  console.log('Refer to FIREBASE_SETUP.md for detailed instructions');
}

console.log('\nNext steps:');
if (!hasApiKey) console.log('- Add your Firebase API Key');
if (!hasAuthDomain) console.log('- Add your Firebase Auth Domain');
if (!hasProjectId) console.log('- Add your Firebase Project ID');