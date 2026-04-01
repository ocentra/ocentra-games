# Matchmaking

**Purpose:** Queue join/leave and status (ticket, position). Single region shard `default`; DO stores queue in SQLite and matches by ELO tolerance over time.

**Handlers:** `handleMatchmakingRequest` (feature-handlers.ts). Route: Matchmaking prefix.

**Durable Object:** [MatchmakingDO](../durable-objects/MatchmakingDO.md). Shard key: `default`.

**API surface (from code):**
- POST queue: join queue; body forwarded to DO; returns ticketId, position.
- POST/DELETE leave: leave queue; query params forwarded.
- GET status: ticket status; query params (e.g. ticketId) forwarded.
- DO paths: Queue(region), Leave(region), Status(region) from endpoint-domain.

**Flow**

```mermaid
sequenceDiagram
  participant Client
  participant Worker
  participant MatchmakingDO

  Client->>Worker: POST/GET/DELETE /api/v1/matchmaking/...
  Worker->>Worker: Path: queue vs leave vs status
  Worker->>MatchmakingDO: stub.fetch(DOBaseUrl + path + search)
  MatchmakingDO->>MatchmakingDO: storage queue get/put
  MatchmakingDO-->>Worker: JSON (ticketId, position, etc.)
  Worker-->>Client: JSON + CORS
```
