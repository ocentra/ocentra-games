# Profile

**Purpose:** User profile (display name, avatar, social card, badges, stats). One ProfileDO per userId.

**Handlers:** `handleProfileRequest` (feature-handlers.ts). Route: Profile prefix. Auth required.

**Durable Object:** [ProfileDO](../durable-objects/ProfileDO.md). Shard key: userId (from auth).

**API surface (from code):**
- GET profile (default path): ProfileDOPaths.Get.
- POST update: path includes ProfileDOSegment.Update.
- Avatar: path ends with ProfileDOSegment.Avatar.
- Get social card: path ends with ProfileDOSegment.GetSocialCard; optional query viewerId.
- Add badge: path ends with ProfileDOSegment.AddBadge.
- Update stats: path ends with ProfileDOSegment.UpdateStats.
- DO paths from endpoint-domain (ProfileDOPaths, ProfileDOSegment).

**Flow**

```mermaid
sequenceDiagram
  participant Client
  participant Worker
  participant ProfileDO

  Client->>Worker: GET/POST /api/v1/profile/...
  Worker->>Worker: requireAuth; userId
  Worker->>ProfileDO: stub = ns.idFromName(userId); fetch(path)
  ProfileDO->>ProfileDO: storage get/put
  ProfileDO-->>Worker: JSON
  Worker-->>Client: JSON + CORS
```
