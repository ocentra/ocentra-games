# Firebase Setup Guide

This guide will help you complete the Firebase setup for your project.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter a project name (e.g., "claim-game")
4. Accept the terms and conditions
5. Choose whether to enable Google Analytics (optional)
6. Click "Create project"

## Step 2: Register Your Web App

1. In the Firebase Console, click the web icon (</>) to register a new web app
2. Enter your app's nickname (e.g., "Claim Game")
3. Check "Also set up Firebase Hosting" if you plan to host your app with Firebase
4. Click "Register app"
5. Firebase will provide your configuration object - keep this open for the next step

## Step 3: Update Environment Variables

Replace the placeholder values in your [.env](file:///e:/Claim/.env) file with your actual Firebase configuration:

```
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_actual_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Step 4: Enable Authentication Methods

1. In the Firebase Console, go to "Authentication" > "Sign-in method"
2. Enable the following sign-in providers:
   - Email/Password
   - Google
   - Facebook
3. For Google and Facebook, follow the setup instructions provided by Firebase

## Step 5: Set Up Firestore Database

1. In the Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for development only)
4. Select a location for your database
5. Click "Enable"

## Step 6: Install Dependencies (if not already installed)

Your project already has Firebase installed, but if you need to reinstall:

```bash
npm install firebase
```

## Step 7: Test Your Setup

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your app in the browser and try to register or log in

## Troubleshooting

If you encounter issues:

1. Check that all environment variables are correctly set
2. Verify that you've enabled the required authentication providers in Firebase Console
3. Ensure your Firestore rules allow read/write access for development
4. Check the browser console for any error messages

## Security Considerations

For production:
1. Update Firestore security rules to restrict access appropriately
2. Use environment variables for sensitive data
3. Consider implementing proper user roles and permissions