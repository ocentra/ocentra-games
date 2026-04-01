// Script to debug authentication issues
// Run with: npm run debug:auth

// Load environment variables
require('dotenv').config({ path: '.env' });

console.log('Firebase Authentication Debug');
console.log('============================');

// Check environment variables
console.log('\nEnvironment Variables:');
console.log('VITE_FIREBASE_API_KEY:', process.env.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
console.log('VITE_FIREBASE_AUTH_DOMAIN:', process.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log('VITE_FIREBASE_PROJECT_ID:', process.env.VITE_FIREBASE_PROJECT_ID);
console.log('VITE_FIREBASE_STORAGE_BUCKET:', process.env.VITE_FIREBASE_STORAGE_BUCKET);
console.log('VITE_FIREBASE_MESSAGING_SENDER_ID:', process.env.VITE_FIREBASE_MESSAGING_SENDER_ID);
console.log('VITE_FIREBASE_APP_ID:', process.env.VITE_FIREBASE_APP_ID);

// Check if values are placeholder values
const isPlaceholder = (value, placeholder) => value === placeholder || value.includes('your_') || value.includes('placeholder');

if (process.env.VITE_FIREBASE_API_KEY) {
  console.log('\nAPI Key Validation:');
  console.log('- Contains "your_" placeholder:', isPlaceholder(process.env.VITE_FIREBASE_API_KEY, 'your_actual_api_key_here'));
  console.log('- Length seems correct:', process.env.VITE_FIREBASE_API_KEY.length > 20 ? '✅ Yes' : '❌ No (too short)');
}

console.log('\nCommon Issues to Check:');
console.log('1. Ensure you have enabled Google/Facebook authentication in Firebase Console');
console.log('2. For Google Auth, verify your domain is authorized in Firebase Console');
console.log('3. For Facebook Auth, ensure you have set up the Facebook App ID correctly');
console.log('4. Check browser console for popup blocking errors');
console.log('5. Make sure you are using HTTPS in production (required for popups)');

console.log('\nTo debug further:');
console.log('- Open browser developer tools (F12)');
console.log('- Go to the Console tab');
console.log('- Try to log in with Google/Facebook');
console.log('- Look for any error messages');

