# Android Architecture (Capacitor)

## Overview

Android uses a thin native shell around the shared web app.
Capacitor bridges JavaScript calls to native plugin code.

```mermaid
flowchart TB
  UI[Web app in WebView] --> CAP[Capacitor bridge]
  CAP --> ACT[MainActivity BridgeActivity]
  ACT --> PLUGINS[Capacitor plugins]
  PLUGINS --> ANDROID[Android APIs]
```

## App startup flow

```mermaid
flowchart LR
  LAUNCH[Android launcher] --> MAIN[MainActivity]
  MAIN --> BRIDGE[Capacitor BridgeActivity init]
  BRIDGE --> WEB[Load public/index.html from assets]
  WEB --> APP[Ocentra web app runtime]
```

## Build and module graph

```mermaid
flowchart TB
  ROOT[platforms/mobile/android]
  ROOT --> APPMOD[app module]
  ROOT --> CAPMOD[capacitor-cordova-android-plugins module]
  APPMOD --> CAPANDROID[project :capacitor-android]
  APPMOD --> CAPMOD
```

## Deep link and auth callback

`AndroidManifest.xml` declares:

- launcher intent filter
- browsable deep link intent:
  - scheme: `ocentra`
  - host: `oauth`

This enables OAuth callback routing into the app.

## Boundaries

- Android layer manages packaging, activity lifecycle, and plugin bridge.
- Feature logic and rendering remain in shared web packages.
