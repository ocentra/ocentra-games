# Presence and Friends

**Purpose:** User presence status, friends list, block list, typing indicators. PresenceDO sharded by userId (256 shards). Friends and block routes are HTTP to PresenceDO; typing is POST to each target’s shard.

**Handlers:** `handlePresenceRequest`, `handleFriendsRequest` (feature-handlers.ts). Routes: Presence and Friends prefixes (and Users base for block).

**Durable Object:** [PresenceDO](../durable-objects/PresenceDO.md). Shard key: `getPresenceShardKey(userId)` = `presence-${fnv1a(userId) % 256}`.

**API surface (from code):**
- Presence: GET/POST status for userId (path segment); GET friends, GET block; POST typing (body conversationId) — handler resolves conversation targets and POSTs to each target’s PresenceDO shard.
- Friends: GET list (DO Friends path + userId query); POST add friend (body userId, friendId); DELETE remove friend.
- Block: POST block (path under Users: userId/block, body userId, targetId).
- DO paths: Status(shardKey, userId), Friends(shardKey), Block(shardKey), TypingIn(shardKey) from endpoint-domain.

**Flow**

```mermaid
sequenceDiagram
  participant Client
  participant Worker
  participant PresenceDO

  Client->>Worker: GET/POST /api/v1/presence/... or /friends/...
  Worker->>Worker: requireAuth; shardKey = presence-N
  Worker->>PresenceDO: stub.fetch(DOBaseUrl + path)
  PresenceDO->>PresenceDO: storage get/put
  PresenceDO-->>Worker: JSON
  Worker-->>Client: JSON + CORS
```
