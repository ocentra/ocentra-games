# ProfileDO

**Purpose:** User profile: displayName, avatarKey, bio, badges, stats, social card, visibility. Avatar URL from AVATAR_BUCKET when bound. Get, Update, Avatar, GetSocialCard, AddBadge, UpdateStats.

**Shard key:** userId.

**HTTP surface:** GET `/${ProfileDOSegment.Get}`; POST `/${ProfileDOSegment.Update}` (body displayName, bio); POST `/${ProfileDOSegment.Avatar}` (body key); GET `/${ProfileDOSegment.GetSocialCard}` (query viewerId); POST `/${ProfileDOSegment.AddBadge}`, `/${ProfileDOSegment.UpdateStats}`.

**Message types:** N/A (HTTP only).

**Storage:** ProfileDOStoragePrefix (boundary-domain); R2 BucketPath for avatar when AVATAR_BUCKET set (boundary-domain bucket-paths).

**Handlers:** [handleProfileRequest](../features/profile.md) (feature-handlers.ts).

**Domain constants:** endpoint-domain: ProfileDOSegment, Http*; boundary-domain: ProfileDOStoragePrefix, BucketPath.

```mermaid
sequenceDiagram
  participant Handler
  participant ProfileDO
  Handler->>ProfileDO: fetch Get/Update/Avatar/...
  ProfileDO->>ProfileDO: storage get/put; optional R2 avatar
  ProfileDO-->>Handler: JSON
```
