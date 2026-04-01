# Android Setup

## How to Run

This is a **Capacitor** app (not Expo). The app is called **Ocentra** and appears as its own icon in the launcher.

```bash
npm run run:android
```

Or step by step: `npm run build` then `npx cap run android`.

If you see Expo Go instead of Ocentra: close Expo Go (swipe it away from recent apps), then run `adb shell am start -n com.ocentra.claim/com.ocentra.claim.MainActivity` to launch Ocentra. Or open the app drawer (swipe up) and tap **Ocentra**.

## Two Ocentra Icons (Duplicate App)

If you previously had the old package `gg.ocentra.app` installed, you may see two Ocentra icons. Uninstall the old app:

```bash
adb uninstall gg.ocentra.app
```

Or on Windows PowerShell: `& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" uninstall gg.ocentra.app`

## App Icon (Ocentra Logo)

The launcher icon uses the Ocentra logo from `resources/icon-foreground.png` (copied from `src/Images/commons/Mlogo.png`). To regenerate icons after changing the logo:

```bash
npm run generate:icons
```

---

## Google Sign-In & Firebase

1. **google-services.json**  
   Download from [Firebase Console](https://console.firebase.google.com/) → Project Settings → Your apps → Android app (package: `com.ocentra.claim`).  
   Put it at: `platforms/mobile/android/app/google-services.json`

2. **Android OAuth client**  
   In Google Cloud Console, create an Android OAuth client (package `com.ocentra.claim`, SHA-1 from your debug keystore). No client secret file is required.

3. **Test users**  
   While OAuth consent is in Testing, add your Google account under APIs & Services → OAuth consent screen → Test users.
