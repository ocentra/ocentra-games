# iOS Architecture (Capacitor)

## Overview

iOS uses a native shell with Capacitor bridge around the shared web app.
The app target embeds web resources and delegates URL handling to Capacitor.

```mermaid
flowchart TB
  UI[Web app in WKWebView] --> CAP[Capacitor bridge]
  CAP --> APPDEL[AppDelegate.swift]
  CAP --> PLUGINS[Capacitor plugins via SPM]
  PLUGINS --> IOS[iOS frameworks/APIs]
```

## Startup flow

```mermaid
flowchart LR
  IOSLAUNCH[iOS launch] --> APP[App target]
  APP --> DEL[AppDelegate didFinishLaunching]
  APP --> WEB[Load App/public/index.html]
  WEB --> RUNTIME[Ocentra web runtime]
```

## Project structure

```mermaid
flowchart TB
  ROOT[platforms/mobile/ios]
  ROOT --> XCODE[App.xcodeproj]
  ROOT --> APPDIR[App/App]
  ROOT --> SPM[App/CapApp-SPM]

  APPDIR --> RES[public + plist + capacitor config]
  SPM --> DEPS[Capacitor and plugin package dependencies]
```

## Deep links and URL handling

- `Info.plist` registers URL scheme `ocentra`.
- `AppDelegate` forwards `open url` and `continue userActivity` to
  `ApplicationDelegateProxy` so Capacitor App API can track app opens.

## Boundaries

- iOS shell owns native app lifecycle and packaging.
- Shared web app owns feature logic and UI.
