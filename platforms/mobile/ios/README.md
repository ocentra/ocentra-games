# iOS Platform (Capacitor)

This folder contains the iOS host app for Ocentra.
It uses Capacitor with Xcode project wiring and Swift Package Manager support.

## What this platform does

- Wraps the shared web app in an iOS `WKWebView` container.
- Uses Capacitor bridge for JavaScript <-> native plugin calls.
- Configures URL scheme callback handling for OAuth/deep links.
- Includes local Swift package wiring for Capacitor plugins.

## Key files

- `App/App/AppDelegate.swift`:
  - app lifecycle hooks
  - URL and universal link forwarding through `ApplicationDelegateProxy`
- `App/App/Info.plist`:
  - app metadata and URL scheme (`ocentra`)
- `App/App/capacitor.config.json`:
  - app id/name, plugin configuration, package class list
- `App/App.xcodeproj/project.pbxproj`:
  - target/resources/build settings
  - includes `public/`, `config.xml`, and Capacitor config as resources
- `App/CapApp-SPM/Package.swift`:
  - Capacitor + plugin SPM dependencies (managed by Capacitor CLI)

## Build layout

- Xcode app target: `App`
- Swift package wrapper: `CapApp-SPM`
- Web assets copied into `App/App/public`

## Notes

- `CapApp-SPM` files are managed by Capacitor tooling.
- iOS bundle id is defined by Xcode build settings.

## Related docs

- `ARCHITECTURE.md` in this folder for diagrams and runtime flow.
