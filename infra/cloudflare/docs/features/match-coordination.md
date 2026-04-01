# Match Coordination

**Purpose:** In-match state and real-time updates: MatchCoordinatorDO (per matchId), MatchShardDO, PlayerShardDO, StateSyncCoordinatorDO. HTTP: match record validate/upload/get/delete, anonymize, transparency; WebSocket: upgrade to MatchCoordinatorDO for live game channel. Match records stored in R2 (MATCHES_BUCKET); DO uses storage and R2 for archive.

**Handlers:** `handleMatchRequest` (handlers/matches.ts), `handleWsRequest` (handlers/ws.ts). Routes: Matches prefix (path with matchId), WS prefix (match WS to coordinator). Auth and signature verification where required.

**Durable Objects:** [MatchCoordinatorDO](../durable-objects/MatchCoordinatorDO.md), [MatchShardDO](../durable-objects/MatchShardDO.md), [PlayerShardDO](../durable-objects/PlayerShardDO.md), [StateSyncCoordinatorDO](../durable-objects/StateSyncCoordinatorDO.md). Shard keys: matchId for coordinator; shard keys for MatchShard/PlayerShard from endpoint-domain; StateSyncCoordinator by sync group.

**API surface (from code):**
- Matches: extractAndValidateMatchIdFromPath; WebSocket Upgrade to MATCH_COORDINATOR.idFromName(matchId); HTTP to MatchCoordinatorDOSegment paths (validate, upload, get, delete, anonymize, transparency); validateMatchRecord; MatchStorage backed by R2 (buildMatchKey, buildAnonymizedMatchKey); logic in logic/matches.
- WS: DOBaseUrl, LobbyDODefaultInstanceName, PresenceDO paths; WS upgrade can target lobby or presence or match coordinator per path.
- MatchCoordinatorDO: MatchWSMessageType, MatchWSChannel; storage prefixes and BucketPath from boundary-domain; GameName, PlayerType.

**Flow**

```mermaid
sequenceDiagram
  participant Client
  participant Worker
  participant MatchCoordinatorDO
  participant R2

  Client->>Worker: GET/POST /api/v1/matches/:matchId/... or WS Upgrade
  Worker->>Worker: validate matchId
  alt WebSocket
    Worker->>MatchCoordinatorDO: upgrade to DO (idFromName(matchId))
    MatchCoordinatorDO->>MatchCoordinatorDO: WS messages; storage; archive R2
  else HTTP
    Worker->>MatchCoordinatorDO: fetch(segment path)
    MatchCoordinatorDO->>R2: archive when needed
    MatchCoordinatorDO-->>Worker: JSON
  end
  Worker-->>Client: response or WS
```
