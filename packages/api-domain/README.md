# @ocentra/api-domain

HTTP client and API service clients for worker endpoints. Auth is injected at bootstrap; no Firebase dependency.

## Usage

At app bootstrap (e.g. `main.tsx`):

```ts
import { createApiClient } from '@ocentra/api-domain/createApiClient';

createApiClient({
  getAuthToken: async () => {
    return null;
  },
});
```

In app runtime, `getAuthToken` should use the active platform auth bridge (web/firebase, desktop/Tauri, or host bridge) and return a Firebase ID token when available.

## Auth behavior in requestJson

`requestJson(endpoint, options)` supports auth modes:

- `authMode: 'none'` - do not resolve token
- `authMode: 'optional'` - attach bearer token when available
- `authMode: 'required'` - throws auth-required error when token is unavailable

For protected routes like admin endpoints, always use `authMode: 'required'`.

Then import services:

- `@ocentra/api-domain/playerHub` - Profile, inventory, marketplace
- `@ocentra/api-domain/social` - Friends, party, messages, notifications, feed
- `@ocentra/api-domain/multiplayer` - Lobby rooms, matchmaking
- `@ocentra/api-domain/competition` - Leaderboard, tournaments
- `@ocentra/api-domain/cloud/CloudService` - Asset API (get/upload/scan via worker)
- `@ocentra/api-domain/cloud/CloudServiceImpl` - CloudService implementation

## Dependencies

- endpoint-domain (paths, constants)
- boundary-domain (AssetMetadata)
- network-domain (ScanResponse)
- logging-domain

## Domain dependency flow

```mermaid
flowchart LR
  API[@ocentra/api-domain] --> Endpoint[@ocentra/endpoint-domain]
  API --> Boundary[@ocentra/boundary-domain]
  API --> Network[@ocentra/network-domain]
  API --> Logging[@ocentra/logging-domain]
```
