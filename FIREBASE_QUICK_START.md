# Firebase Quick Start Guide

## What We've Done

1. Created a comprehensive [FIREBASE_SETUP.md](file:///e:/Claim/FIREBASE_SETUP.md) guide with step-by-step instructions
2. Updated your [.env](file:///e:/Claim/.env) file with detailed comments and placeholder values
3. Enhanced your Firebase configuration file with better logging
4. Added Firebase setup instructions to your [README.md](file:///e:/Claim/README.md)
5. Created a test script to verify your Firebase configuration

## Next Steps

### 1. Create a Firebase Project
- Go to [Firebase Console](https://console.firebase.google.com/)
- Click "Create a project"
- Follow the setup wizard

### 2. Register Your Web App
- In your Firebase project, click the web icon (</>) 
- Register your app with a nickname like "Claim Game"
- Note the configuration values Firebase provides

### 3. Update Your Environment Variables
Edit your [.env](file:///e:/Claim/.env) file and replace the placeholder values with your actual Firebase configuration:
```
VITE_FIREBASE_API_KEY=your_actual_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_actual_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_actual_messaging_sender_id
VITE_FIREBASE_APP_ID=your_actual_app_id
```

### 4. Enable Authentication Methods
In Firebase Console:
- Go to "Authentication" > "Sign-in method"
- Enable:
  - Email/Password
  - Google
  - Facebook

### 5. Set Up Firestore Database
- Go to "Firestore Database" in Firebase Console
- Click "Create database"
- Choose "Start in test mode" for development
- Select a location

### 6. Test Your Configuration
Run the test script to verify your setup:
```bash
npm run test:firebase
```

### 7. Run Your Application
Start your development server:
```bash
npm run dev
```

## Troubleshooting

If you encounter issues:

1. **Firebase not initializing**: Check that all environment variables are correctly set in [.env](file:///e:/Claim/.env)
2. **Authentication not working**: Verify that you've enabled the required sign-in providers in Firebase Console
3. **Database errors**: Ensure Firestore is set up and rules allow access

## Current Status

Your application is designed to work gracefully with or without Firebase:
- With Firebase: Full authentication and data persistence
- Without Firebase: Simulated authentication for development

Run `npm run test:firebase` anytime to check your configuration status.