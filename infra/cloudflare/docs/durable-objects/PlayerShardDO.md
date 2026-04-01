# PlayerShardDO

**Purpose:** Per-shard player cache: GET state for a playerId (query), POST sync batch (body playerIds and/or players array). Stores PlayerCache: playerId, displayName, walletAddress, elo, gamesPlayed, gamesWon, lastSyncedAt. Used for player data sync and lookup by shard.

**Shard key:** Determined by caller (DO is bound as PLAYER_SHARD_DO; no handler in codebase currently calls it; typical use would be idFromName(shardKey) e.g. by player id or shard index).

**HTTP surface:** GET path ending `/${PlayerShardDOSegment.State}` (query playerId); POST path ending `/${PlayerShardDOSegment.Sync}` (body playerIds?: string[], players?: PlayerCache[]). Returns player object or { ok: true }.

**Message types:** N/A (HTTP only).

**Storage:** Key `'players'` (array of [string, PlayerCache] entries). No boundary-domain prefix in DO source.

**Handlers:** None in current codebase; DO exported and bound for use by state-sync or player services.

**Domain constants:** endpoint-domain: PlayerShardDOSegment, Http*.

```mermaid
sequenceDiagram
  participant Caller
  participant PlayerShardDO
  Caller->>PlayerShardDO: GET State?playerId= or POST Sync (players)
  PlayerShardDO->>PlayerShardDO: ensureInitialized; players Map; storage put
  PlayerShardDO-->>Caller: JSON player or ok
```
