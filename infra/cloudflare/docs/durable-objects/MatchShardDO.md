# MatchShardDO

**Purpose:** Per-match shard cache: match cache (matchId, solanaMatchPda, sync status, gameState, moveHistory). MatchShardDOSegment paths for get/sync. Used by StateSyncService for sync coordination.

**Shard key:** matchId (StateSyncService: `env.MATCH_SHARD_DO.idFromName(matchId)`).

**HTTP surface:** MatchShardDOSegment paths (endpoint-domain): get state, sync updates.

**Message types:** N/A (HTTP only).

**Storage:** MatchShardDOStoragePrefix (boundary-domain): MatchCache (matchId, solanaMatchPda, lastSyncedSlot, syncStatus, gameState, moveHistory, etc.).

**Handlers:** StateSyncService (utils); match coordination flow.

**Domain constants:** endpoint-domain: MatchShardDOSegment, Http*; boundary-domain: MatchShardDOStoragePrefix.

```mermaid
sequenceDiagram
  participant StateSyncService
  participant MatchShardDO
  StateSyncService->>MatchShardDO: fetch get/sync
  MatchShardDO->>MatchShardDO: matchCache; storage
  MatchShardDO-->>StateSyncService: JSON
```
