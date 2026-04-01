# Android Platform (Capacitor)

This folder contains the Android host app for Ocentra using Capacitor.
The app wraps the shared web build and loads it from `app/src/main/assets/public`.

## What this platform does

- Builds Android APK/AAB shell for the web app.
- Hosts Capacitor bridge and native plugin integrations.
- Launches `MainActivity` (`BridgeActivity`) as the app entry activity.
- Supports app deep links for OAuth callback scheme.

## Key files

- `app/build.gradle`:
  - app id: `com.ocentra.claim`
  - Capacitor Android module + plugin module dependencies
  - optional Google services plugin when `google-services.json` exists
- `app/src/main/AndroidManifest.xml`:
  - launcher activity and deep link intent filter (`ocentra://oauth`)
  - internet permission and FileProvider
- `app/src/main/java/com/ocentra/claim/MainActivity.java`:
  - extends `BridgeActivity`
- `app/src/main/assets/capacitor.config.json`:
  - platform paths
  - plugin config (SplashScreen, FirebaseAuthentication)

## Build layout

- Root Gradle config in:
  - `build.gradle`
  - `settings.gradle`
  - `gradle.properties`
- App module in `app/`
- Capacitor plugin module in `capacitor-cordova-android-plugins/`

## Notes

- Static web assets are checked into `app/src/main/assets/public`.
- Native plugin versions are managed through Capacitor and Gradle files.

## Related docs

- `ARCHITECTURE.md` in this folder for diagrams and request flow.
