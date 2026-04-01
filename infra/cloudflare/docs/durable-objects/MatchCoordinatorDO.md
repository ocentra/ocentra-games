# MatchCoordinatorDO

**Purpose:** Per-match coordination: HTTP validate, upload, get, delete, anonymize, transparency; WebSocket for live game channel (move, sync, chat, voice-text, finalize, AI dump, checkpoint). Calls CreditsDO for batch award; archives to R2 (BucketPath, buildMatchKey). Match state, pending transactions, checkpoints in storage.

**Shard key:** matchId (handlers/matches.ts and match-query: `env.MATCH_COORDINATOR.idFromName(matchId)`).

**HTTP surface:** MatchCoordinatorDOSegment paths (endpoint-domain); validate, upload, get, delete, anonymize, transparency. Request body/query as per logic.

**WebSocket:** Upgrade accepted. Message types from endpoint-domain: MatchWSMessageType, MatchWSChannel; schemas MatchWSIncomingMessageSchema, MatchWSChatMessageSchema, etc. Types: move, sync, chat, voice-text, finalize, ai-dump, checkpoint (from types/cloudflare/matches).

**Storage:** MatchCoordinatorDOStoragePrefix (boundary-domain); BucketPath (boundary-domain) for R2 archive. State: MatchState, pendingTransactions, lastCheckpoint, etc.

**Handlers:** [handleMatchRequest](../features/match-coordination.md) (matches.ts); match-query, StateSyncService.

**Domain constants:** endpoint-domain: MatchCoordinatorDOSegment, MatchWSMessageType, MatchWSChannel, Http*, MetadataField, validateMatchId, GameName, PlayerType; boundary-domain: MatchCoordinatorDOStoragePrefix, BucketPath; endpoint-domain schemas and types (match-ws, cloudflare/matches).

```mermaid
sequenceDiagram
  participant Client
  participant MatchCoordinatorDO
  participant CreditsDO
  participant R2
  Client->>MatchCoordinatorDO: HTTP or WS
  MatchCoordinatorDO->>MatchCoordinatorDO: state; storage
  MatchCoordinatorDO->>CreditsDO: batch award (when finalize)
  MatchCoordinatorDO->>R2: archive match
  MatchCoordinatorDO-->>Client: JSON or WS
```
