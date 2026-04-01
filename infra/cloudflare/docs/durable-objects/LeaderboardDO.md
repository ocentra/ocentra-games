# LeaderboardDO

**Purpose:** Cached leaderboard entries per shard (e.g. game type): Top (limit, offset), UserRank (userId), Nearby (userId, window); Upsert, Refresh. Max 1000 entries; sorted by score.

**Shard key:** Shard key from handler (e.g. region or game type); leaderboard.ts uses idFromName(shardKey) for refresh and read.

**HTTP surface:** GET `/${LeaderboardDOSegment.Top}`, `/${LeaderboardDOSegment.UserRank}`, `/${LeaderboardDOSegment.Nearby}` (query params); POST `/${LeaderboardDOSegment.Upsert}`, `/${LeaderboardDOSegment.Refresh}`.

**Message types:** N/A (HTTP only).

**Storage:** LeaderboardDOStoragePrefix (boundary-domain): entries (userId, displayName, score).

**Handlers:** [handleLeaderboardRequest](../features/leaderboard.md) (leaderboard.ts); cron runLeaderboardRefresh in index.ts.

**Domain constants:** endpoint-domain: LeaderboardDOSegment; boundary-domain: LeaderboardDOStoragePrefix.

```mermaid
sequenceDiagram
  participant Handler
  participant LeaderboardDO
  Handler->>LeaderboardDO: fetch Top/UserRank/Nearby/Upsert/Refresh
  LeaderboardDO->>LeaderboardDO: loadAndSort; storage put
  LeaderboardDO-->>Handler: JSON entries
```
