# Leaderboard

**Purpose:** Leaderboard entries from R2 match data (computeLeaderboardLogic) and optional LeaderboardDO cache. Handler can read from R2 (MATCHES_BUCKET) and/or refresh/write LeaderboardDO; cron runs runLeaderboardRefresh when LEADERBOARD_DO and MATCHES_BUCKET are set.

**Handlers:** `handleLeaderboardRequest` (handlers/leaderboard.ts). Route: Leaderboard prefix. Uses endpoint-domain ApiEndpoint.Leaderboard, LeaderboardDOPaths, GameName; logic in logic/leaderboard (list/get from R2, compute entries).

**Durable Object:** [LeaderboardDO](../durable-objects/LeaderboardDO.md). Shard key: region (e.g. default) or game-type; used for cached leaderboard state and refresh.

**API surface (from code):**
- GET leaderboard: path parts for game type, aiOnly; computeLeaderboard(env, gameType, aiOnly, limit) uses R2 list/get; optional DO read/cache. Returns entries (tier from score: Master/Diamond/Platinum/Gold/Silver/Bronze).
- Cron: runLeaderboardRefresh(env) writes to LeaderboardDO shards for game types 1,2,3.
- DO paths from endpoint-domain (LeaderboardDO, segment).

**Flow**

```mermaid
sequenceDiagram
  participant Client
  participant Worker
  participant R2
  participant LeaderboardDO

  Client->>Worker: GET /api/v1/leaderboard/...
  Worker->>Worker: extractPathParts; gameType, aiOnly
  Worker->>R2: list/get (MATCHES_BUCKET) via computeLeaderboardLogic
  opt cache
    Worker->>LeaderboardDO: fetch cached snapshot
  end
  Worker-->>Client: JSON entries + CORS
```
