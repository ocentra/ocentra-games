# LobbyDO

**Purpose:** Rooms per shard: create room, list rooms, join/leave room; WebSocket for same-shard connections (join-room, leave-room, chat, start-countdown, reconnect, ping). Chat rate limit and history; countdown 5s.

**Shard key:** `lobby-${fnv1a(roomId) % 64}` for room ops; handler also uses `default` for non-join/leave. Default instance name from LobbyDODefaultInstanceName for WS path.

**HTTP surface:** GET/POST path segment Rooms (list/create); POST Join/Leave with roomId in path. Paths from LobbyDOPaths.Rooms(shardKey), Join(shardKey, roomId), Leave(shardKey, roomId).

**WebSocket:** Upgrade accepted; attachment: connectionId, userId, roomId, connectedAt. Message types (from DO source): `join-room`, `reconnect`, `start-countdown`, `leave-room`, `chat`, `ping`.

**Storage:** LobbyDOStoragePrefix.RoomIds (array); `${LobbyDOStoragePrefix.RoomPrefix}${roomId}` (RoomStored). Optional chatHistory, lastChatAt on room. From boundary-domain do-storage-prefixes.

**Handlers:** [handleLobbyRequest](../features/lobby.md) (feature-handlers.ts); ws.ts for WS upgrade to LobbyDODefaultInstanceName.

**Domain constants:** endpoint-domain: LobbyDOSegment, LobbyDODefaultInstanceName, Http*; boundary-domain: LobbyDOStoragePrefix.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Rooms: GET/POST rooms
  Rooms --> Join: POST join
  Join --> Leave: POST leave
  WS --> join-room
  WS --> chat
  WS --> start-countdown
  WS --> leave-room
```
