# Mobile Platforms Overview

This folder contains Ocentra mobile shells built with Capacitor:

- `android/` — Android app project (Gradle + Capacitor bridge)
- `ios/` — iOS app project (Xcode + Capacitor bridge + SPM package wrapper)

Both platforms host the same web application bundle and provide native runtime
integration through Capacitor plugins.

## How it works

- Shared web assets are built and copied into each platform project.
- Native app starts a Capacitor bridge.
- JavaScript in the WebView calls native plugin APIs when needed.
- OAuth deep-link callbacks are routed back into the app (`ocentra://oauth`).

## Platform split

- **Android:** `platforms/mobile/android`
  - app id currently set in Android project (`com.ocentra.claim`)
  - `MainActivity` extends `BridgeActivity`
- **iOS:** `platforms/mobile/ios`
  - app target `App`
  - URL handling proxied through `ApplicationDelegateProxy`

## Related docs

- [Asset handling (WebView fetch, same resolve model as web)](../../docs/ocentra/asset-handling.md)
- [android/README.md](./android/README.md)
- [android/ARCHITECTURE.md](./android/ARCHITECTURE.md)
- [ios/README.md](./ios/README.md)
- [ios/ARCHITECTURE.md](./ios/ARCHITECTURE.md)
- [ARCHITECTURE.md](./ARCHITECTURE.md)
