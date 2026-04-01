# Mobile Architecture Overview

## Cross-platform model

```mermaid
flowchart TB
  WEB[Shared Ocentra Web App]
  CAP[Capacitor runtime model]
  AND[Android shell]
  IOS[iOS shell]

  WEB --> CAP
  CAP --> AND
  CAP --> IOS
```

The same web runtime is packaged into platform-specific native containers.

## Runtime request path

```mermaid
sequenceDiagram
  participant UI as Web UI (JS)
  participant Bridge as Capacitor Bridge
  participant Native as Native Plugin/API

  UI->>Bridge: plugin call
  Bridge->>Native: execute native code
  Native-->>Bridge: result/error
  Bridge-->>UI: Promise resolve/reject
```

## Platform architecture split

```mermaid
flowchart LR
  subgraph Android
    A1[MainActivity BridgeActivity]
    A2[Gradle app module]
    A3[assets/public web bundle]
  end

  subgraph iOS
    I1[AppDelegate + App target]
    I2[Xcode project + CapApp-SPM]
    I3[App/public web bundle]
  end

  A3 --> A1
  I3 --> I1
```

## Deep-link and auth callback

Both mobile targets are wired for OAuth callback handling via URL scheme:

- Scheme: `ocentra`
- Host/path mapping handled in platform manifests/plists and app delegates.

## Boundaries

- Mobile shell owns native lifecycle, packaging, and plugin bridge.
- App feature logic remains in shared TypeScript/web packages.
