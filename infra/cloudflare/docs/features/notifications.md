# Notifications

**Purpose:** Per-user notifications: list, mark-read, preferences, and push registration. NotificationDO is sharded by userId.

**Handlers:** `handleNotificationRequest` (feature-handlers.ts). Route: Notification prefix. Auth required.

**Durable Object:** [NotificationDO](../durable-objects/NotificationDO.md). Shard key: userId.

**API surface (from code):**
- Path ends: mark-read -> NotificationDOPaths.MarkRead; list -> NotificationDOPaths.List; preferences -> NotificationDOPaths.Preferences; else NotificationDOPaths.Push.
- GET/POST to DO; body forwarded for POST.

**Flow**

```mermaid
sequenceDiagram
  participant Client
  participant Worker
  participant NotificationDO

  Client->>Worker: GET/POST /api/v1/notifications/...
  Worker->>Worker: requireAuth; userId
  Worker->>NotificationDO: stub.idFromName(userId); fetch(doPath)
  NotificationDO->>NotificationDO: storage get/put
  NotificationDO-->>Worker: JSON
  Worker-->>Client: JSON + CORS
```
